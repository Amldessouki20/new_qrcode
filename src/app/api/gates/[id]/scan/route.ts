import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';

import { z } from 'zod';
import { parseCardDataString } from '@/lib/qr-generator';




const scanValidationSchema = z.object({
  cardData: z.string().min(1, 'بيانات البطاقة مطلوبة'),
  scanType: z.enum(['QR']).default('QR'),
  guestId: z.string().optional(),
  restaurantId: z.string().optional()
});

// POST /api/gates/[id]/scan - Validate card scan at specific gate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gateId } = await params;
    const token = request.cookies.get('accessToken')?.value;
    
    if (!token) {
      return NextResponse.json({ 
        success: false,
        result: 'ERROR',
        message: 'غير مصرح للوصول',
        messageAr: 'غير مصرح للوصول'
      }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ 
        success: false,
        result: 'ERROR',
        message: 'رمز الوصول غير صحيح',
        messageAr: 'رمز الوصول غير صحيح'
      }, { status: 401 });
    }

    const body = await request.json();
    const { cardData, scanType, restaurantId } = scanValidationSchema.parse(body);

    // Get gate information
    const gate = await prisma.gate.findUnique({
      where: { id: gateId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        type: {
          select: {
            name: true
          }
        },
        isActive: true,
        status: true,
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            isActive: true
          }
        }
      }
    });

    if (!gate) {
      return NextResponse.json({
        success: false,
        result: 'ERROR',
        message: 'البوابة غير موجودة',
        messageAr: 'البوابة غير موجودة'
      }, { status: 404 });
    }

    if (!gate.isActive) {
      return NextResponse.json({
        success: false,
        result: 'ERROR',
        message: 'البوابة غير نشطة حالياً',
        messageAr: 'البوابة غير نشطة حالياً'
      }, { status: 400 });
    }

    // Parse card data
    let cardInfo;
    try {
      cardInfo = parseCardDataString(cardData);
    } catch {
      return NextResponse.json({
        success: false,
        result: 'ERROR',
        message: 'بيانات البطاقة غير صحيحة',
        messageAr: 'بيانات البطاقة غير صحيحة'
      }, { status: 400 });
    }

    if (!cardInfo) {
      return NextResponse.json({
        success: false,
        result: 'ERROR',
        message: 'بيانات البطاقة غير صحيحة',
        messageAr: 'بيانات البطاقة غير صحيحة'
      }, { status: 400 });
    }

    // Find the card in database
    const card = await prisma.card.findFirst({
      where: {
        OR: [
          { cardData: cardData },
          { id: cardInfo.id }
        ]
      },
      include: {
        guest: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                location: true,
                gateId: true
              }
            }
          }
        },
        mealTime: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            startTime: true,
            endTime: true
          }
        }
      }
    });

    if (!card) {
      await logAccessAttempt(gateId, null, null, 'DENIED');
      
      return NextResponse.json({
        success: false,
        result: 'DENIED',
        message: 'البطاقة غير موجودة في النظام',
        messageAr: 'البطاقة غير موجودة في النظام'
      }, { status: 400 });
    }

    // Validate card status
    if (!card.isActive) {
      await logAccessAttempt(gateId, card.id, card.guestId || null, 'DENIED');
      
      return NextResponse.json({
        success: false,
        result: 'DENIED',
        message: 'البطاقة غير نشطة',
        messageAr: 'البطاقة غير نشطة'
      }, { status: 400 });
    }

    // Check card validity dates
    const now = new Date();
    if (now < card.validFrom || now > card.validTo) {
      await logAccessAttempt(gateId, card.id, card.guestId, 'DENIED');
      
      return NextResponse.json({
        success: false,
        result: 'DENIED',
        message: 'البطاقة منتهية الصلاحية',
        messageAr: 'البطاقة منتهية الصلاحية'
      }, { status: 400 });
    }

    // Check usage limits
    if (card.maxUsage && card.usageCount >= card.maxUsage) {
      await logAccessAttempt(gateId, card.id, card.guestId || null, 'DENIED');
      
      return NextResponse.json({
        success: false,
        result: 'DENIED',
        message: 'تم استنفاد عدد مرات الاستخدام المسموحة',
        messageAr: 'تم استنفاد عدد مرات الاستخدام المسموحة'
      }, { status: 400 });
    }

    // Gate-specific validation logic
    const validationResult = await validateGateAccess({
      type: gate.type?.name || '',
      restaurants: gate.restaurants
    }, card, restaurantId);
    
    if (!validationResult.allowed) {
      await logAccessAttempt(gateId, card.id, card.guestId || null, 'DENIED');
      
      return NextResponse.json({
        success: false,
        result: 'DENIED',
        message: validationResult.reason,
        messageAr: validationResult.reason
      }, { status: 400 });
    }

    // Success - Allow access
    await logAccessAttempt(gateId, card.id, card.guestId || null, 'ALLOWED');
    
    // Update card usage count
    await prisma.card.update({
      where: { id: card.id },
      data: { 
        usageCount: { increment: 1 }
      }
    });

    // Control gate to open (if configured)
    if (gate.isActive) {
      try {
        // Trigger gate opening
        await fetch(`${request.url.replace('/scan', '/control')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            action: 'OPEN',
            duration: 5,
            reason: `Card scan access for guest ${card.guest?.firstName} ${card.guest?.lastName}`
          })
        });
      } catch (error) {
        console.error('Failed to open gate:', error);
        // Don't fail the validation if gate control fails
      }
    }

    return NextResponse.json({
      success: true,
      result: 'ALLOWED',
      message: 'تم السماح بالدخول بنجاح',
      messageAr: 'تم السماح بالدخول بنجاح',
      data: {
        guestId: card.guestId,
        guestName: `${card.guest?.firstName} ${card.guest?.lastName}`,
        guestNameAr: `${card.guest?.firstName} ${card.guest?.lastName}`,
        roomNumber: card.guest?.roomNumber,
        nationality: card.guest?.nationality,
        company: card.guest?.company,
        cardId: card.id,
        cardType: scanType,
        restaurantId: card.guest?.restaurant?.id,
        restaurantName: card.guest?.restaurant?.name,
        restaurantNameAr: card.guest?.restaurant?.nameAr,
        gateId: gate.id,
        gateName: gate.name,
        gateNameAr: gate.nameAr,
        mealCount: {
          used: card.usageCount + 1,
          total: card.maxUsage || 999,
          remaining: card.maxUsage ? card.maxUsage - (card.usageCount + 1) : 999
        },
        validFrom: card.validFrom,
        validTo: card.validTo,
        allowedMealTimes: card.mealTime ? [card.mealTime.name] : [],
        currentMealTime: getCurrentMealTime()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        result: 'ERROR',
        message: 'بيانات غير صحيحة',
        messageAr: 'بيانات غير صحيحة',
        details: error.issues
      }, { status: 400 });
    }

    console.error('Error validating card scan:', error);
    return NextResponse.json({
      success: false,
      result: 'ERROR',
      message: 'خطأ في الخادم',
      messageAr: 'خطأ في الخادم'
    }, { status: 500 });
  }
}

// Validate gate-specific access rules
async function validateGateAccess(gate: { type: string; restaurants: { id: string; name: string; nameAr: string | null }[] }, card: { guest?: { restaurant?: { id: string; name: string; nameAr: string | null } } }, requestedRestaurantId?: string) {
  // Main gate logic - allows all valid guests to enter
  if (gate.type === 'MAIN') {
    return {
      allowed: true,
      reason: 'الدخول مسموح من البوابة الرئيسية'
    };
  }

  // Restaurant gate logic - only allows guests assigned to this restaurant
  if (gate.type === 'RESTAURANT') {
    const guestRestaurant = card.guest?.restaurant;
    
    if (!guestRestaurant) {
      return {
        allowed: false,
        reason: 'الضيف غير مسجل في أي مطعم'
      };
    }

    // Check if guest's restaurant is linked to this gate
    const isRestaurantLinked = gate.restaurants.some((r: { id: string }) => r.id === guestRestaurant.id);
    
    if (!isRestaurantLinked) {
      return {
        allowed: false,
        reason: `هذه البطاقة مخصصة لمطعم ${guestRestaurant.nameAr || guestRestaurant.name} وليس لهذه البوابة`
      };
    }

    // Additional check if specific restaurant requested
    if (requestedRestaurantId && guestRestaurant.id !== requestedRestaurantId) {
      return {
        allowed: false,
        reason: 'المطعم المطلوب لا يتطابق مع المطعم المسجل للضيف'
      };
    }

    return {
      allowed: true,
      reason: `الدخول مسموح لمطعم ${guestRestaurant.nameAr || guestRestaurant.name}`
    };
  }

  return {
    allowed: false,
    reason: 'نوع البوابة غير مدعوم'
  };
}

// Log access attempt
async function logAccessAttempt(
  gateId: string, 
  cardId: string | null, 
  guestId: string | null, 
  result: 'ALLOWED' | 'DENIED'
) {
  try {
    await prisma.accessLog.create({
      data: {
        gateId,
        cardId,
        guestId,
        isSuccess: result === 'ALLOWED',
        accessType: "ENTRY"
      }
    });
  } catch (error) {
    console.error('Failed to log access attempt:', error);
  }
}

// Get current meal time
function getCurrentMealTime(): string {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 6 && hour < 11) {
    return 'الإفطار / Breakfast';
  } else if (hour >= 11 && hour < 16) {
    return 'الغداء / Lunch';
  } else if (hour >= 16 && hour < 22) {
    return 'العشاء / Dinner';
  } else {
    return 'خارج أوقات الوجبات / Outside meal times';
  }
}
