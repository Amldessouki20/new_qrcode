import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, MapPin, Network, Settings } from 'lucide-react';



interface PageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

interface User {
  id: string;
  username: string;
  role: UserRole;
}

async function getUser(): Promise<User | null> {
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
    console.error('Error getting user:', error);
    return null;
  }
}

async function getGate(id: string) {
  try {
    const gate = await prisma.gate.findUnique({
      where: { id },
      include: {
        type: true,
        defaultProtocol: true,
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            location: true,
          },
        },
      },
    });
    
    return gate;
  } catch (error) {
    console.error('Error getting gate:', error);
    return null;
  }
}

export default async function GateViewPage({ params }: PageProps) {
  const { locale, id } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  if (!(await hasPermission(user.id, PERMISSIONS.GATE_READ))) {
    redirect(`/${locale}/dashboard`);
  }
  
  const gate = await getGate(id);
  
  if (!gate) {
    redirect(`/${locale}/gates`);
  }
  
  const t = await getTranslations({ locale });
  
  return (
    <DashboardLayout user={user}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/${locale}/gates`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('gates.back')}
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{gate.name}</h1>
              <p className="text-muted-foreground">{gate.nameAr}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {await hasPermission(user.id, PERMISSIONS.GATE_UPDATE) && (
              <Link href={`/${locale}/gates/${gate.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('gates.edit.title')}
                </Button>
              </Link>
            )}
            
            <Badge variant={gate.isActive ? 'default' : 'secondary'}>
              {gate.isActive ? t('gates.active') : t('gates.inactive')}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                {t('gates.edit.basicInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('gates.edit.name')}
                </label>
                <p className="text-sm">{gate.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('gates.edit.nameAr')}
                </label>
                <p className="text-sm">{gate.nameAr}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('gates.edit.location')}
                </label>
                <p className="text-sm flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {gate.location}
                </p>
              </div>
              
              {gate.type && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('gates.edit.type')}
                  </label>
                  <p className="text-sm">{gate.type.name}</p>
                </div>
              )}
              
              {gate.model && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('gates.edit.model')}
                  </label>
                  <p className="text-sm">{gate.model}</p>
                </div>
              )}
              
              {gate.maxCapacity && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('gates.edit.maxCapacity')}
                  </label>
                  <p className="text-sm">{gate.maxCapacity}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Network Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Network className="h-5 w-5 mr-2" />
                {t('gates.edit.networkConfig')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gate.ipAddress && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('gates.edit.ipAddress')}
                  </label>
                  <p className="text-sm font-mono">{gate.ipAddress}</p>
                </div>
              )}
              
              {gate.port && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('gates.edit.port')}
                  </label>
                  <p className="text-sm font-mono">{gate.port}</p>
                </div>
              )}
              
              {gate.serialPort && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('gates.edit.serialPort')}
                  </label>
                  <p className="text-sm font-mono">{gate.serialPort}</p>
                </div>
              )}
              
              {gate.baudRate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('gates.edit.baudRate')}
                  </label>
                  <p className="text-sm font-mono">{gate.baudRate}</p>
                </div>
              )}
              
              {gate.defaultProtocol && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('gates.edit.protocol')}
                  </label>
                  <p className="text-sm">{gate.defaultProtocol.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Description */}
        {gate.description && (
          <Card>
            <CardHeader>
              <CardTitle>{t('gates.edit.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{gate.description}</p>
            </CardContent>
          </Card>
        )}
        
        {/* Associated Restaurants */}
        {gate.restaurants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('gates.view.associatedRestaurants')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gate.restaurants.map((restaurant) => (
                  <div key={restaurant.id} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{restaurant.name}</h4>
                    <p className="text-sm text-muted-foreground">{restaurant.nameAr}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {restaurant.location}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>{t('gates.information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('gates.createdBy')}:</span>
              <span>{gate.createdBy.username}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('gates.createdAt')}:</span>
              <span>{new Date(gate.createdAt).toLocaleDateString(locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('gates.updatedAt')}:</span>
              <span>{new Date(gate.updatedAt).toLocaleDateString(locale)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}