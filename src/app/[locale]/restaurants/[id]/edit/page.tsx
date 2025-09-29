import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RestaurantForm } from '@/components/restaurants/RestaurantForm';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Local type that matches the actual data structure from the database query
type RestaurantWithPartialGate = {
  id: string;
  name: string;
  description: string | null;
  nameAr?: string | null;
  location: string | null;
  capacity: number;
  restaurantType: string;
  gateId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  mealTimes: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }[];
};

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

async function getRestaurant(id: string): Promise<RestaurantWithPartialGate | null> {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        location: true,
        capacity: true,
        restaurantType: true,
        gateId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        mealTimes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            isActive: true,
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    return restaurant;
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return null;
  }
}

export default async function EditRestaurantPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  // Check if user has permission to update restaurants
  if (!await hasPermission(user.id, PERMISSIONS.RESTAURANT_UPDATE)) {
    redirect(`/${locale}/dashboard`);
  }
  
  const restaurant = await getRestaurant(id);
  
  if (!restaurant) {
    notFound();
  }
  
  const t = await getTranslations({ locale });
  
  return (
    <DashboardLayout user={user}>
      <div className="space-y-6  overflow-hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${locale}/restaurants`}>
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('restaurants.editRestaurant')}
          </h1>
          <p className="text-muted-foreground">
            {t('restaurants.editRestaurantDescription', { name: restaurant.name })}
          </p>
        </div>
        
        <RestaurantForm mode="edit" restaurant={restaurant} />
      </div>
    </DashboardLayout>
  );
}