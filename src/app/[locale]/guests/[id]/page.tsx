import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { DeleteGuestButton } from '@/components/guests/DeleteGuestButton';
import { GuestAvatar } from '@/components/ui/guest-avatar';

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

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true, role: true }
  });

  return user;
}

async function getGuest(id: string) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        cards: {
          select: {
            id: true,
            cardData: true,
            cardType: true,
            isActive: true,
            validTo: true,
          },
        },
      },
    });

    return guest;
  } catch (error) {
    console.error('Error fetching guest:', error);
    return null;
  }
}

export default async function GuestViewPage({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}) {
  const { locale, id } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check permissions
  const canViewGuest = await hasPermission(user.id, PERMISSIONS.GUEST_READ);
  if (!canViewGuest) {
    redirect(`/${locale}/dashboard`);
  }

  const guest = await getGuest(id);
  if (!guest) {
    notFound();
  }

  const t = await getTranslations('guests');
  const canUpdateGuest = await hasPermission(user.id, PERMISSIONS.GUEST_UPDATE);
  const canDeleteGuest = await hasPermission(user.id, PERMISSIONS.GUEST_DELETE);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/guests`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back')}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{`${guest.firstName} ${guest.lastName}`}</h1>
              <p className="text-muted-foreground">{t('guestDetails')}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {canUpdateGuest && (
              <Link href={`/${locale}/guests/${guest.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('edit')}
                </Button>
              </Link>
            )}
            {canDeleteGuest && (
              <DeleteGuestButton guestId={guest.id} guestName={`${guest.firstName} ${guest.lastName}`} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('personalInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Image */}
              <div className="flex items-center gap-4 mb-6">
                <GuestAvatar
                  src={guest.profileImagePath}
                  alt={`${guest.firstName} ${guest.lastName}`}
                  fallbackText={`${guest.firstName.charAt(0)}${guest.lastName.charAt(0)}`}
                  size="xl"
                />
                <div>
                  <h3 className="text-xl font-semibold">{`${guest.firstName} ${guest.lastName}`}</h3>
                  <p className="text-muted-foreground">{guest.jobTitle || t('guest')}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('identification')}</label>
                <p className="text-lg">{guest.nationalId || guest.passportNo || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('nationality')}</label>
                <p className="text-lg">{guest.nationality || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('room')}</label>
                <p className="text-lg">{guest.roomNumber || '-'}</p>
              </div>
              {guest.company && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('company')}</label>
                  <p className="text-lg">{guest.company}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('status')}</label>
                <div className="mt-1">
                  <Badge variant={guest.isActive ? 'default' : 'secondary'}>
                    {guest.isActive ? t('active') : t('inactive')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('additionalInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {guest.restaurant && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('restaurant')}</label>
                  <p className="text-lg">{guest.restaurant.name}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('createdAt')}</label>
                <p className="text-lg">{new Date(guest.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('updatedAt')}</label>
                <p className="text-lg">{new Date(guest.updatedAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {guest.cards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('associatedCards')}
              </CardTitle>
              <CardDescription>
                {t('cardsAssignedToGuest')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {guest.cards.map((card) => (
                  <div key={card.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{card.cardData}</span>
                      <Badge variant={card.isActive ? 'default' : 'secondary'}>
                        {card.isActive ? t('active') : t('inactive')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{card.cardType}</p>
                    {card.validTo && (
                      <p className="text-sm text-muted-foreground">
                        {t('expires')}: {new Date(card.validTo).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

export async function generateMetadata() {
  const t = await getTranslations('guests');
  
  return {
    title: t('guestDetails'),
    description: t('viewGuestDescription'),
  };
}