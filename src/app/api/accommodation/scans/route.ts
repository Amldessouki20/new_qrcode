import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { Prisma } from '@prisma/client';



const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)),
  search: z.string().optional(),
  status: z.enum(['SUCCESS', 'FAILED', 'WARNING']).optional().or(z.literal('')).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  restaurantId: z.string().optional()
});

// GET /api/accommodation/scans - Get scan records for accommodation page
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check permissions: allow by role baseline (ADMIN/SUPER_ADMIN/USER) or ACCOMMODATION_READ
    // Fetch user role to align API with page access rules
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true }
    });

    const roleAllows = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'USER');
    const hasAccommodationPermission = await hasPermission(payload.userId, PERMISSIONS.ACCOMMODATION_READ);
    if (!roleAllows && !hasAccommodationPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const {
      page,
      limit,
      search,
      status,
      startDate,
      endDate,
      restaurantId
    } = querySchema.parse(Object.fromEntries(searchParams));

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.ScanLogWhereInput = {};

    // Search filter - Enhanced to search across all visible fields
    if (search) {
      whereClause.OR = [
        {
          card: {
            guest: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { roomNumber: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        },
        {
          card: {
            guest: {
              restaurant: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { nameAr: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          }
        },
        {
          card: {
            cardData: { contains: search, mode: 'insensitive' }
          }
        },
        {
          errorMessage: { contains: search, mode: 'insensitive' }
        }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.scanTime = {};
      if (startDate) {
        whereClause.scanTime.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.scanTime.lte = new Date(endDate);
      }
    }

    // Restaurant filter
    if (restaurantId) {
      whereClause.card = {
        guest: {
          restaurantId: restaurantId
        }
      };
    }

    // Get scan logs with related data
    const [scanLogs, totalCount] = await Promise.all([
      prisma.scanLog.findMany({
        where: whereClause,
        include: {
          card: {
            include: {
              guest: {
                include: {
                  restaurant: {
                    include: {
                      mealTimes: true
                    }
                  }
                }
              },
              mealTime: true
            }
          }
        },
        orderBy: {
          scanTime: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.scanLog.count({ where: whereClause })
    ]);

    // Transform data for the frontend
    const records = scanLogs.map(log => {
      const guest = log.card?.guest;
      const restaurant = guest?.restaurant;

      // Find matched meal time based on the scan timestamp and restaurant meal windows
      const parseToMinutes = (t: string) => {
        const [h, m] = t.split(":").map(v => parseInt(v, 10));
        return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
      };
      const scanDate = log.scanTime;
      const scanMinutes = scanDate.getHours() * 60 + scanDate.getMinutes();
      const matched = (restaurant?.mealTimes || []).find(mt => {
        const start = parseToMinutes(mt.startTime);
        const end = parseToMinutes(mt.endTime);
        if (end >= start) {
          return scanMinutes >= start && scanMinutes <= end;
        }
        // Overnight window
        return scanMinutes >= start || scanMinutes <= end;
      });

      // Prefer historically stored matched meal time if available
      const matchedId = log.matchedMealTimeId ?? undefined;
      const matchedFromStored = matchedId
        ? (restaurant?.mealTimes || []).find(mt => mt.id === matchedId)
        : undefined;
      
      // Determine status based on success and error code
      let status: 'SUCCESS' | 'FAILED' | 'WARNING' = 'FAILED';
      if (log.isSuccess) {
        status = 'SUCCESS';
      } else if (log.errorCode === 'OUTSIDE_MEAL_TIME' || log.errorCode === 'MEAL_LIMIT_EXCEEDED' || log.errorCode === 'MEAL_ALREADY_CONSUMED') {
        status = 'WARNING';
      } else {
        status = 'FAILED';
      }

      return {
        id: log.id,
        cardId: log.cardId || '',
        guestName: guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown Guest',
        guestNameAr: guest ? `${guest.firstName} ${guest.lastName}` : 'ضيف غير معروف',
        roomNumber: guest?.roomNumber,
        company: guest?.company,
        mealType: matchedFromStored?.name || matched?.name || log.card?.mealTime?.name,
        mealTypeAr: matchedFromStored?.nameAr || matched?.nameAr || log.card?.mealTime?.nameAr,
        mealStartTime: matchedFromStored?.startTime || matched?.startTime || log.card?.mealTime?.startTime,
        mealEndTime: matchedFromStored?.endTime || matched?.endTime || log.card?.mealTime?.endTime,
        restaurantName: restaurant?.name || 'Unknown Restaurant',
        restaurantNameAr: restaurant?.nameAr || 'مطعم غير معروف',
        scanTime: log.scanTime,
        status,
        message: log.isSuccess 
          ? 'Scan successful - Access granted'
          : log.errorMessage || 'Scan failed',
        messageAr: log.isSuccess 
          ? 'تم المسح بنجاح - تم السماح بالدخول'
          : getArabicErrorMessage(log.errorMessage),
        errorCode: log.isSuccess ? undefined : (log.errorCode || extractErrorCode(log.errorMessage)),
        usageCount: log.card?.usageCount,
        maxUsage: log.card?.maxUsage,
        validFrom: log.card?.validFrom,
        validTo: log.card?.validTo
      };
    });

    // Filter by status if specified
    const filteredRecords = status
      ? records.filter(record => record.status === status)
      : records;

    return NextResponse.json({
      records: filteredRecords,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Error fetching accommodation scans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get Arabic error messages
function getArabicErrorMessage(errorMessage?: string | null): string {
  if (!errorMessage) return 'فشل في المسح';
  
  const errorMap: Record<string, string> = {
    'Card not found': 'البطاقة غير موجودة',
    'Card has expired': 'البطاقة منتهية الصلاحية',
    'Card is inactive': 'البطاقة غير نشطة',
    'Guest is inactive': 'الضيف غير نشط',
    'Guest has checked out': 'الضيف قد غادر',
    'Maximum usage limit exceeded': 'تم تجاوز الحد الأقصى للاستخدام',
    'Access not allowed at this time': 'الدخول غير مسموح في هذا الوقت',
    'Meal already consumed in this window': 'تم تناول الوجبة بالفعل في هذه الفترة',
    'Meal not allowed': 'الوجبة غير مسموحة',
    'Wrong restaurant': 'مطعم خاطئ',
    'Gate not found': 'البوابة غير موجودة',
    'System error': 'خطأ في النظام'
  };

  // Try to find a matching error message
  for (const [english, arabic] of Object.entries(errorMap)) {
    if (errorMessage.includes(english)) {
      return arabic;
    }
  }

  return 'فشل في المسح';
}

// Helper function to extract error code from error message
function extractErrorCode(errorMessage?: string | null): string | undefined {
  if (!errorMessage) return undefined;
  
  const codeMap: Record<string, string> = {
    'Card not found': 'CARD_NOT_FOUND',
    'Card has expired': 'CARD_EXPIRED',
    'Card is inactive': 'CARD_DISABLED',
    'Guest is inactive': 'GUEST_INACTIVE',
    'Guest has checked out': 'GUEST_CHECKOUT',
    'Maximum usage limit exceeded': 'MEAL_LIMIT_EXCEEDED',
    'Access not allowed at this time': 'OUTSIDE_MEAL_TIME',
    'Meal not allowed': 'MEAL_NOT_ALLOWED',
    'Wrong restaurant': 'RESTAURANT_NOT_FOUND',
    'Gate not found': 'GATE_NOT_FOUND',
    'System error': 'SYSTEM_ERROR'
  };

  for (const [message, code] of Object.entries(codeMap)) {
    if (errorMessage.includes(message)) {
      return code;
    }
  }

  return 'UNKNOWN_ERROR';
}