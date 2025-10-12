import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
// import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/cards/PrintButton';
import { CardVisualCompact } from '@/components/cards/CardVisualCompact';

export const dynamic = 'force-dynamic';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  
  if (!token) {
    redirect('/login');
  }

  try {
    const payload = await verifyAccessToken(token);
    if (!payload) {
      redirect('/login');
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      redirect('/login');
    }

    return user;
  } catch {
    redirect('/login');
  }
}

export default async function PrintCardPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const user = await getUser();
  const { locale, id } = await params;

  // Check permissions
  if (!await hasPermission(user.id, PERMISSIONS.CARD_READ)) {
    redirect('/dashboard');
  }

  // Get card data
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      guest: {
        include: {
          restaurant: true
        }
      },
      mealTime: true,
      creator: true
    }
  });

  if (!card) {
    notFound();
  }



  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-md mx-auto">
        {/* Card Design - Using the same component as in the table */}
        <div className="flex justify-center">
          <CardVisualCompact 
            card={{
              id: card.id,
              cardData: card.cardData,
              cardType: card.cardType,
              validFrom: card.validFrom.toISOString(),
              validTo: card.validTo.toISOString(),
              isActive: card.isActive,
              guest: {
                firstName: card.guest.firstName,
                lastName: card.guest.lastName,
                ...(card.guest.profileImagePath && { profileImagePath: card.guest.profileImagePath }),
                ...(card.guest.nationalId && { nationalId: card.guest.nationalId }),
                ...(card.guest.passportNo && { passportNo: card.guest.passportNo }),
                ...(card.guest.nationality && { nationality: card.guest.nationality }),
                ...(card.guest.company && { company: card.guest.company }),
                ...(card.guest.jobTitle && { jobTitle: card.guest.jobTitle }),
                ...(card.guest.roomNumber && { roomNumber: card.guest.roomNumber }),
                restaurant: card.guest.restaurant ? {
                  name: card.guest.restaurant.name,
                  ...(card.guest.restaurant.nameAr && { nameAr: card.guest.restaurant.nameAr }),
                  ...(card.guest.restaurant.location && { location: card.guest.restaurant.location }),
                  ...(card.guest.restaurant.restaurantType && { restaurantType: card.guest.restaurant.restaurantType })
                } : {
                  name: ''
                }
              },
              mealTime: card.mealTime
            }}
            locale={locale}
          />
        </div>

        {/* Print Instructions */}
        <PrintButton />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `
      }} />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Print Card ${id}`,
  };
}