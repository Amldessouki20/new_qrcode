import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PrintMultipleCards } from '@/components/cards/PrintMultipleCards';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    // title: t('print.title'),
    // description: t('print.description'),
  };
}

export default async function PrintMultipleCardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const { locale } = await params;
  const { ids } = await searchParams;
  
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  
  if (!token) {
    redirect('/login');
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    redirect('/login');
  }

  // Check if user has permission to view cards
  const canViewCards = await hasPermission(user.id, PERMISSIONS.CARD_READ);
  if (!canViewCards) {
    redirect('/dashboard');
  }

  if (!ids) {
    redirect(`/${locale}/cards`);
  }

  const cardIds = ids.split(',').filter(Boolean);
  
  if (cardIds.length === 0) {
    redirect(`/${locale}/cards`);
  }

  // Fetch cards with guest information
  const cardsData = await prisma.card.findMany({
    where: {
      id: {
        in: cardIds,
      },
      isActive: true, // Only fetch active cards for printing
    },
    select: {
      id: true,
      cardData: true,
      cardType: true,
      validFrom: true,
      validTo: true,
      isActive: true,
      usageCount: true,
      // maxUsage: true,
      guest: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nationalId: true,
          passportNo: true,
          nationality: true,
          company: true,
          jobTitle: true,
          roomNumber: true,
          checkInDate: true,
          checkOutDate: true,
          restaurant: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              restaurantType: true,
              location: true,
              mealTimes: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  startTime: true,
                  endTime: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Transform data to match Card interface
  const cards = cardsData
    .filter(card => card.guest) // Only include cards with guests
    .map(card => ({
      id: card.id,
      cardData: card.cardData,
      cardType: card.cardType as 'QR' | 'RFID',
      validFrom: card.validFrom.toISOString(),
      validTo: card.validTo.toISOString(),
      isActive: card.isActive,
      usageCount: card.usageCount ?? 0,
      // maxUsage: card.maxUsage ?? 1,
      guest: {
        firstName: card.guest!.firstName,
        lastName: card.guest!.lastName,
        nationalId: card.guest!.nationalId || '',
        passportNo: card.guest!.passportNo || '',
        nationality: card.guest!.nationality || '',
        company: card.guest!.company || undefined,
        jobTitle: card.guest!.jobTitle || undefined,
        roomNumber: card.guest!.roomNumber || undefined,
        restaurant: {
          name: card.guest!.restaurant.name,
          nameAr: card.guest!.restaurant.nameAr || undefined,
          location: card.guest!.restaurant.location || undefined,
          restaurantType: card.guest!.restaurant.restaurantType || undefined,
        },
      },
    }));

  return <PrintMultipleCards cards={cards} />;
}