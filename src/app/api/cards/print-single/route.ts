import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

// export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // التحقق من الصلاحيات
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true },
    });
    
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }
    
    if (!(await hasPermission(user.id, PERMISSIONS.CARD_READ))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // الحصول على معرف البطاقة من query parameters
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('id');
    
    if (!cardId) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }
    
    // جلب بيانات البطاقة
    const cardData = await prisma.card.findUnique({
      where: {
        id: cardId,
      },
      select: {
        id: true,
        cardData: true,
        cardType: true,
        validFrom: true,
        validTo: true,
        isActive: true,
        usageCount: true,
        maxUsage: true,
        guest: {
          select: {
            firstName: true,
            lastName: true,
            profileImagePath: true,
            thumbnailImagePath: true,
            nationalId: true,
            passportNo: true,
            nationality: true,
            company: true,
            jobTitle: true,
            roomNumber: true,
            checkInDate: true,
            expiredDate: true,
            restaurant: {
              select: {
                name: true,
                nameAr: true,
                location: true,
              },
            },
          },
        },
        mealTime: {
          select: {
            name: true,
            nameAr: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });
    
    if (!cardData) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    
    // تحويل البيانات للتنسيق المطلوب
    const card = {
      id: cardData.id,
      cardData: cardData.cardData,
      cardType: cardData.cardType,
      validFrom: cardData.validFrom.toISOString(),
      validTo: cardData.validTo.toISOString(),
      isActive: cardData.isActive,
      usageCount: cardData.usageCount || 0,
      maxUsage: cardData.maxUsage || 1,
      guest: cardData.guest ? {
        firstName: cardData.guest.firstName,
        lastName: cardData.guest.lastName,
        profileImagePath: cardData.guest.profileImagePath,
        thumbnailImagePath: cardData.guest.thumbnailImagePath,
        nationalId: cardData.guest.nationalId,
        passportNo: cardData.guest.passportNo || '',
        nationality: cardData.guest.nationality || '',
        company: cardData.guest.company,
        jobTitle: cardData.guest.jobTitle,
        roomNumber: cardData.guest.roomNumber,
        restaurant: {
          name: cardData.guest.restaurant.name,
          nameAr: cardData.guest.restaurant.nameAr,
          location: cardData.guest.restaurant.location,
        },
      } : undefined,
      mealTime: cardData.mealTime ? {
        name: cardData.mealTime.name,
        startTime: cardData.mealTime.startTime,
        endTime: cardData.mealTime.endTime,
      } : undefined,
    };
    
    return NextResponse.json({ card });
    
  } catch (error) {
    console.error('Error fetching card for printing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}