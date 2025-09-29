import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GuestForm } from '@/components/guests/GuestForm';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  
  if (!token) {
    return null;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true, role: true }
  });

  return user;
}

export default async function NewGuestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check permissions
  const canCreateGuest = await hasPermission(user.id, PERMISSIONS.GUEST_CREATE);
  if (!canCreateGuest) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale });

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/guests`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('guests.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('guests.addGuest')}</h1>
            <p className="text-muted-foreground">{t('guests.addGuestDescription')}</p>
          </div>
        </div>
        
        <GuestForm />
      </div>
    </DashboardLayout>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  
  return {
    title: t('guests.addGuest'),
    description: t('guests.addGuestDescription'),
  };
}