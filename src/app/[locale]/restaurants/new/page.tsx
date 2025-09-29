import { redirect } from 'next/navigation';
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



async function getUser() {


  try {

      const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return null;
  }
    const payload = await verifyAccessToken(token);
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

export default async function NewRestaurantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  // Check if user has permission to create restaurants
  const hasCreatePermission = await hasPermission(user.id, PERMISSIONS.RESTAURANT_CREATE);
  if (!hasCreatePermission) {
    redirect(`/${locale}/dashboard`);
  }
  
  const t = await getTranslations({ locale });
  
  return (
    <DashboardLayout user={user}>
      <div className="space-y-6  overflow-hidden mx-auto max-w-5xl w-full">
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
            {t('restaurants.addRestaurant')}
          </h1>
          <p className="text-muted-foreground">
            {t('restaurants.addRestaurantDescription')}
          </p>
        </div>
        
        <RestaurantForm mode="create" />
      </div>
    </DashboardLayout>
  );
}


