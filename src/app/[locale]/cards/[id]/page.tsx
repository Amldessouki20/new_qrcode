import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, CreditCard, User, MapPin, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { parseCardDataString } from '@/lib/qr-generator';

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

  return await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });
}

export default async function CardDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  // Check if user has permission to view cards
  if (!(await hasPermission(user.id, PERMISSIONS.CARD_LIST))) {
    redirect(`/${locale}/dashboard`);
  }

  // Get card details with meal time information
  const card = await prisma.card.findUnique({
    where: { id },
    select: {
      id: true,
      cardData: true,
      cardType: true,
      validFrom: true,
      validTo: true,
      isActive: true,
      usageCount: true,
      maxUsage: true,
      createdAt: true,
      mealTime: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          startTime: true,
          endTime: true,
          isActive: true
        }
      },
      guest: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nationalId: true,
          nationality: true,
          roomNumber: true,
          company: true,
          jobTitle: true,
          checkInDate: true,
          checkOutDate: true,
          restaurant: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              location: true,
              restaurantType: true,
              mealTimes: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  startTime: true,
                  endTime: true,
                  isActive: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!card) {
    redirect(`/${locale}/cards`);
  }

  const t = await getTranslations({ locale });

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/cards`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('cards.title')}
            </h1>
            <p className="text-gray-600">
              {t('cards.description')}
            </p>
          </div>
          {card.guest && (
            <Button asChild>
              <Link href={`/${locale}/cards/${card.id}/print`} target="_blank">
                <Printer className="h-4 w-4 mr-2" />
                {t('cards.print')}
              </Link>
            </Button>
          )}
        </div>

        {/* Card Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('cards.cardInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('cards.cardNumber')}
                </label>
                {(() => {
                  try {
                    const parsedData = parseCardDataString(card.cardData);
                    if (parsedData) {
                      return (
                        <div className="space-y-2">
                          <p className="font-mono text-lg">{parsedData.cardNumber}</p>
                          <div className="text-sm text-gray-600 space-y-1">
                            {parsedData.guestName && (
                              <p><span className="font-medium">Guest:</span> {parsedData.guestName}</p>
                            )}
                            {parsedData.company && (
                              <p><span className="font-medium">Company:</span> {parsedData.company}</p>
                            )}
                            {parsedData.jobTitle && (
                              <p><span className="font-medium">Job Title:</span> {parsedData.jobTitle}</p>
                            )}
                            {parsedData.nationality && (
                              <p><span className="font-medium">Nationality:</span> {parsedData.nationality}</p>
                            )}
                            {parsedData.roomNumber && (
                              <p><span className="font-medium">Room:</span> {parsedData.roomNumber}</p>
                            )}
                            {parsedData.restaurantName && (
                              <p><span className="font-medium">Restaurant:</span> {parsedData.restaurantName}</p>
                            )}
                            {parsedData.allowedMealTimes && parsedData.allowedMealTimes.length > 0 && (
                              <div>
                                <span className="font-medium">Meal Times:</span>
                                <div className="ml-2 space-y-1">
                                  {parsedData.allowedMealTimes.map((mt, index) => (
                                    <p key={index} className="text-xs">
                                      {mt.name}: {mt.startTime} - {mt.endTime}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            <p><span className="font-medium">Max Usage:</span> {parsedData.maxUsage || 1}</p>
                            <p><span className="font-medium">Current Usage:</span> {parsedData.usageCount || 0}</p>
                          </div>
                        </div>
                      );
                    }
                  } catch (error) {
                    console.error('Error parsing card data:', error);
                  }
                  return <p className="font-mono text-lg">{card.cardData}</p>;
                })()}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('cards.cardType')}
                </label>
                <p>{card.cardType}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('cards.status')}
                </label>
                <div>
                  <Badge variant={card.isActive ? 'default' : 'secondary'}>
                    {card.isActive ? t('cards.active') : t('cards.inactive')}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('cards.createdAt')}
                </label>
                <p>{format(new Date(card.createdAt), 'PPpp')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Guest Information */}
          {card.guest ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('cards.guestInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t('guests.name')}
                  </label>
                  <p className="font-medium">
                    {card.guest.firstName} {card.guest.lastName}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t('guests.nationalId')}
                  </label>
                  <p>{card.guest.nationalId}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t('guests.nationality')}
                  </label>
                  <p>{card.guest.nationality}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t('guests.room')}
                  </label>
                  <p>{card.guest.roomNumber || t('common.notSpecified')}</p>
                </div>
                
                {card.guest.company && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      {t('guests.company')}
                    </label>
                    <p>{card.guest.company}</p>
                  </div>
                )}
                
                {card.guest.jobTitle && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      {t('guests.jobTitle')}
                    </label>
                    <p>{card.guest.jobTitle}</p>
                  </div>
                )}
                
                {card.guest.restaurant && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      {t('guests.restaurant')}
                    </label>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {card.guest.restaurant.name}
                    </p>
                  </div>
                )}
                
                {card.guest.checkInDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      {t('guests.checkIn')}
                    </label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(card.guest.checkInDate), 'PPP')}
                    </p>
                  </div>
                )}
                
                {card.guest.checkOutDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      {t('cards.checkOut')}
                    </label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(card.guest.checkOutDate), 'PPP')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('guests.guestInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {t('guests.noGuest')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('guests.noGuestDescription')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assigned Meal Time */}
        {card.mealTime && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('mealTimes.assignedMealTime')}
              </CardTitle>
              <CardDescription>
                {t('mealTimes.assignedMealTimeDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">
                      {locale === 'ar' && card.mealTime.nameAr ? card.mealTime.nameAr : card.mealTime.name}
                    </h3>
                    <p className="text-blue-700 font-medium">
                      {card.mealTime.startTime} - {card.mealTime.endTime}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-blue-600">
                    {card.mealTime.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Available Meal Times */}
        {card.guest?.restaurant?.mealTimes && card.guest.restaurant.mealTimes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('mealTimes.availableMealTimes')}
              </CardTitle>
              <CardDescription>
                {t('mealTimes.availableMealTimesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {card.guest.restaurant.mealTimes.map((mealTime) => (
                  <div 
                    key={mealTime.id} 
                    className={`p-4 border rounded-lg transition-colors ${
                      card.mealTime?.id === mealTime.id 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {locale === 'ar' && mealTime.nameAr ? mealTime.nameAr : mealTime.name}
                      </h4>
                      {card.mealTime?.id === mealTime.id && (
                        <Badge variant="outline" className="text-xs">
                          {t('assigned')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {mealTime.startTime} - {mealTime.endTime}
                    </p>
                    <Badge 
                      variant={mealTime.isActive ? 'default' : 'secondary'} 
                      className="mt-2 text-xs"
                    >
                      {mealTime.isActive ? t('active') : t('inactive')}
                    </Badge>
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
  const t = await getTranslations('cards');
  
  return {
    title: t('title'),
    description: t('description'),
  };
}