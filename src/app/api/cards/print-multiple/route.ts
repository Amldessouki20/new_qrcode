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
    
    // الحصول على معرفات البطاقات من query parameters
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json({ error: 'Card IDs are required' }, { status: 400 });
    }
    
    const cardIds = idsParam.split(',').filter(Boolean);
    
    if (cardIds.length === 0) {
      return NextResponse.json({ error: 'No valid card IDs provided' }, { status: 400 });
    }
    
    // جلب بيانات البطاقات
    const cardsData = await prisma.card.findMany({
      where: {
        id: {
          in: cardIds,
        },
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
    
    // تحويل البيانات للتنسيق المطلوب
    const cards = cardsData.map(card => ({
      id: card.id,
      cardData: card.cardData,
      cardType: card.cardType,
      validFrom: card.validFrom.toISOString(),
      validTo: card.validTo.toISOString(),
      isActive: card.isActive,
      usageCount: card.usageCount || 0,
      maxUsage: card.maxUsage || 1,
      guest: card.guest ? {
        firstName: card.guest.firstName,
        lastName: card.guest.lastName,
        profileImagePath: card.guest.profileImagePath,
        thumbnailImagePath: card.guest.thumbnailImagePath,
        nationalId: card.guest.nationalId,
        passportNo: card.guest.passportNo || '',
        nationality: card.guest.nationality || '',
        company: card.guest.company,
        jobTitle: card.guest.jobTitle,
        roomNumber: card.guest.roomNumber,
        restaurant: {
          name: card.guest.restaurant.name,
          nameAr: card.guest.restaurant.nameAr,
          location: card.guest.restaurant.location,
        },
      } : undefined,
      mealTime: card.mealTime ? {
        name: card.mealTime.name,
        startTime: card.mealTime.startTime,
        endTime: card.mealTime.endTime,
      } : undefined,
    }));
    
    return NextResponse.json({ cards });
    
  } catch (error) {
    console.error('Error fetching cards for printing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}