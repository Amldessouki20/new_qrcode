import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Find the card
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
        }
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

    // Create scan log entry
    const scanLog = await prisma.scanLog.create({
      data: {
        cardId: card?.id || null,
        guestId: card?.guestId || null,
        stationId: stationId,
        isSuccess: scanResult.success,
        errorCode: scanResult.errorCode || null,
        errorMessage: scanResult.success ? null : scanResult.message,
        scanTime: new Date()
      }
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