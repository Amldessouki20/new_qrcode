import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { Card, Guest, Restaurant } from '@/lib/types/api';

export const dynamic = 'force-dynamic';

const manualScanSchema = z.object({
  cardData: z.string().min(1, 'Card data is required'),
  stationId: z.string().optional().default('MANUAL_STATION'),
  scanType: z.enum(['QR', 'RFID']).optional().default('QR')
});

// POST /api/accommodation/manual-scan - Manual scan for testing
export async function POST(request: NextRequest) {
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

    // Check permissions
    const canScan = await hasPermission(payload.userId, PERMISSIONS.CARD_READ);
    if (!canScan) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
  const body = await request.json();
  const { cardData, stationId, scanType } = manualScanSchema.parse(body);

    // Parse QR code data to extract card information
    let cardNumber = cardData;
    
    // If it's a QR code, try to parse the enhanced data format
    if (scanType === 'QR') {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(cardData);
        if (parsed.cardNumber) {
          cardNumber = parsed.cardNumber;
        }
      } catch {
        // If not JSON, treat as plain card number
        cardNumber = cardData;
      }
    }

    // Find the card (include meal time for time-window validation)
    const card = await prisma.card.findFirst({
      where: { 
        OR: [
          { cardData: cardNumber },
          { cardData: cardData }, // Fallback to original data
        ],
      },
      include: {
        guest: {
          include: {
            restaurant: true
          }
        },
        mealTime: true
      }
    });

    let scanResult = {
      success: false,
      message: '',
      messageAr: '',
      errorCode: '',
      card: null as Card | null,
      guest: null as Guest | null,
      restaurant: null as Restaurant | null
    };
    // Track matched meal time ID for logging later
    let matchedMealTimeId: string | null = null;

    if (!card) {
      scanResult = {
        success: false,
        message: 'Card not found',
        messageAr: 'البطاقة غير موجودة',
        errorCode: 'CARD_NOT_FOUND',
        card: null,
        guest: null,
        restaurant: null
      };
    } else if (!card.isActive) {
      scanResult = {
        success: false,
        message: 'Card is inactive',
        messageAr: 'البطاقة غير نشطة',
        errorCode: 'CARD_DISABLED',
        card: card,
        guest: card.guest,
        restaurant: card.guest?.restaurant
      };
    } else if (card.validTo && new Date() > card.validTo) {
      scanResult = {
        success: false,
        message: 'Card has expired',
        messageAr: 'البطاقة منتهية الصلاحية',
        errorCode: 'CARD_EXPIRED',
        card: card,
        guest: card.guest,
        restaurant: card.guest?.restaurant
      };
    } else if (!card.guest?.isActive) {
      scanResult = {
        success: false,
        message: 'Guest is inactive',
        messageAr: 'الضيف غير نشط',
        errorCode: 'GUEST_INACTIVE',
        card: card,
        guest: card.guest,
        restaurant: card.guest?.restaurant
      };
    } else if (card.guest?.expiredDate && new Date() > card.guest.expiredDate) {
      scanResult = {
        success: false,
        message: 'Guest has checked out',
        messageAr: 'الضيف قد غادر',
        errorCode: 'GUEST_CHECKOUT',
        card: card,
        guest: card.guest,
        restaurant: card.guest?.restaurant
      };
    } else if (card.mealTime || card.guest?.restaurantId) {
      // Determine the actual meal matching current scan time from all restaurant meal windows
      const now = new Date();

      const restaurantMealTimes = await prisma.mealTime.findMany({
        where: {
          restaurantId: card.guest!.restaurantId,
          isActive: true
        }
      });

      const parseToMinutes = (t: string) => {
        const [h, m] = t.split(":").map((v) => parseInt(v, 10));
        return h * 60 + (isNaN(m) ? 0 : m);
      };

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const matched = restaurantMealTimes.find(mt => {
        const start = parseToMinutes(mt.startTime);
        const end = parseToMinutes(mt.endTime);
        if (end >= start) {
          return nowMinutes >= start && nowMinutes <= end;
        }
        // Overnight window
        return nowMinutes >= start || nowMinutes <= end;
      });

      // Track matched meal id for logging
      if (matched) {
        matchedMealTimeId = matched.id;
      }

      if (!matched) {
        scanResult = {
          success: false,
          message: 'Access not allowed at this time',
          messageAr: 'الدخول غير مسموح في هذا الوقت',
          errorCode: 'OUTSIDE_MEAL_TIME',
          card: card,
          guest: card.guest,
          restaurant: card.guest?.restaurant
        };
      } else {
        // Enforce allowed meals per card via join table `_CardAllowedMeals`
        // If no allowed meals are configured, treat as allowed; otherwise, require membership
        const allowedExists = await prisma.$queryRaw<{ exists: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM "public"."_CardAllowedMeals"
            WHERE "A" = ${card.id} AND "B" = ${matched.id}
          ) as exists
        `;

        const isAllowed = (allowedExists[0]?.exists ?? false);
        // If there are entries for this card in `_CardAllowedMeals`, isAllowed indicates membership.
        // If there are no entries at all, allow by default.
        const allowedCountRows = await prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(*)::int AS count FROM "public"."_CardAllowedMeals" WHERE "A" = ${card.id}
        `;
        const totalAllowedForCard = allowedCountRows[0]?.count ?? 0;

        if (totalAllowedForCard > 0 && !isAllowed) {
          scanResult = {
            success: false,
            message: 'Meal not allowed',
            messageAr: 'الوجبة غير مسموحة',
            errorCode: 'MEAL_NOT_ALLOWED',
            card: card,
            guest: card.guest,
            restaurant: card.guest?.restaurant
          };
        } else {
          // Compute window boundaries for today based on matched meal
          const buildDateAt = (base: Date, timeStr: string) => {
            const [hStr, mStr] = timeStr.split(":");
            const h = parseInt(hStr || "0", 10);
            const m = parseInt(mStr || "0", 10);
            const d = new Date(base);
            d.setHours(h, isNaN(m) ? 0 : m, 0, 0);
            return d;
          };
          const today = new Date();
          const startMinutes = parseToMinutes(matched.startTime);
          const endMinutes = parseToMinutes(matched.endTime);
          const windowStart = buildDateAt(today, matched.startTime);
          const windowEnd = buildDateAt(today, matched.endTime);
          if (endMinutes < startMinutes) {
            // Overnight window: end is on the next day
            windowEnd.setDate(windowEnd.getDate() + 1);
          }

          // Reject if already consumed in this meal window (one success per window)
          const priorWindowSuccess = await prisma.scanLog.findFirst({
            where: {
              cardId: card.id,
              isSuccess: true,
              scanTime: {
                gte: windowStart,
                lte: windowEnd
              }
            },
            orderBy: { scanTime: 'desc' }
          });

          if (priorWindowSuccess) {
            scanResult = {
              success: false,
              message: 'Meal already consumed in this window',
              messageAr: 'تم تناول الوجبة بالفعل في هذه الفترة',
              errorCode: 'MEAL_ALREADY_CONSUMED',
              card: card,
              guest: card.guest,
              restaurant: card.guest?.restaurant
            };
          } else if (card.maxUsage && card.usageCount >= card.maxUsage) {
            scanResult = {
              success: false,
              message: 'Maximum usage limit exceeded',
              messageAr: 'تم تجاوز الحد الأقصى للاستخدام',
              errorCode: 'MEAL_LIMIT_EXCEEDED',
              card: card,
              guest: card.guest,
              restaurant: card.guest?.restaurant
            };
          } else {
            // Success case
            scanResult = {
              success: true,
              message: 'Scan successful - Access granted',
              messageAr: 'تم المسح بنجاح - تم السماح بالدخول',
              errorCode: '',
              card: card,
              guest: card.guest,
              restaurant: card.guest?.restaurant
            };

            // Update usage count for successful scan
            await prisma.card.update({
              where: { id: card.id },
              data: { usageCount: card.usageCount + 1 }
            });
          }
        }
      }
    }
    else if (card.maxUsage && card.usageCount >= card.maxUsage) {
      scanResult = {
        success: false,
        message: 'Maximum usage limit exceeded',
        messageAr: 'تم تجاوز الحد الأقصى للاستخدام',
        errorCode: 'MEAL_LIMIT_EXCEEDED',
        card: card,
        guest: card.guest,
        restaurant: card.guest?.restaurant
      };
    } else {
      // Success case
      scanResult = {
        success: true,
        message: 'Scan successful - Access granted',
        messageAr: 'تم المسح بنجاح - تم السماح بالدخول',
        errorCode: '',
        card: card,
        guest: card.guest,
        restaurant: card.guest?.restaurant
      };

      // Update usage count for successful scan
      await prisma.card.update({
        where: { id: card.id },
        data: { usageCount: card.usageCount + 1 }
      });
    }

    // Create scan log entry (store matched meal time if determined)
    const logData: Prisma.ScanLogUncheckedCreateInput = {
      cardId: card?.id || null,
      guestId: card?.guestId || null,
      stationId: stationId,
      isSuccess: scanResult.success,
      errorCode: scanResult.errorCode || null,
      errorMessage: scanResult.success ? null : scanResult.message,
      scanTime: new Date()
    };
    // Persist the matched meal time id when available (computed earlier)
    if (matchedMealTimeId) {
      logData.matchedMealTimeId = matchedMealTimeId;
    }

    const scanLog = await prisma.scanLog.create({
      data: logData
    });

    // Return response with scan result
    return NextResponse.json({
      success: scanResult.success,
      scanId: scanLog.id,
      message: scanResult.message,
      messageAr: scanResult.messageAr,
      errorCode: scanResult.errorCode,
      card: scanResult.card ? {
        id: scanResult.card.id,
        cardData: scanResult.card.cardData,
        usageCount: scanResult.card.usageCount + (scanResult.success ? 1 : 0),
        maxUsage: scanResult.card.maxUsage,
        validFrom: scanResult.card.validFrom,
        validTo: scanResult.card.validTo,
        isActive: scanResult.card.isActive
      } : null,
      guest: scanResult.guest ? {
        id: scanResult.guest.id,
        firstName: scanResult.guest.firstName,
        lastName: scanResult.guest.lastName,
        roomNumber: scanResult.guest.roomNumber,
        company: scanResult.guest.company,
        checkInDate: scanResult.guest.checkInDate,
        checkOutDate: scanResult.guest.expiredDate,
        isActive: scanResult.guest.isActive
      } : null,
      restaurant: scanResult.restaurant ? {
        id: scanResult.restaurant.id,
        name: scanResult.restaurant.name,
        nameAr: scanResult.restaurant.nameAr
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in manual scan:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}