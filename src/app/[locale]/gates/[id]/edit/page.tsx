import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GateForm } from '@/components/gates/GateForm';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';



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
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
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

export default async function EditGatePage({ params }: PageProps) {
  const { locale, id } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  if (!(await hasPermission(user.id, PERMISSIONS.GATE_UPDATE))) {
    redirect(`/${locale}/dashboard`);
  }
  
  const gate = await getGate(id);
  
  if (!gate) {
    redirect(`/${locale}/gates`);
  }
  
  const t = await getTranslations({ locale });
  
  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/${locale}/gates/${gate.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{t('gates.edit.title')}</h1>
              <p className="text-muted-foreground">
                {t('gates.edit.subtitle', { name: gate.name })}
              </p>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl">
          <GateForm 
            gate={gate ? {
              id: gate.id,
              name: gate.name,
              nameAr: gate.nameAr,
              typeId: gate.typeId || undefined,
              defaultProtocolId: gate.defaultProtocolId || undefined,
              gateType: gate.gateType || '',
              gateTypeAr: '', // Not available in database
              protocolName: gate.protocolName || undefined,
              protocolNameAr: undefined, // Not available in database
              ipAddress: gate.ipAddress || undefined,
              port: gate.port || undefined,
              serialPort: gate.serialPort || undefined,
              baudRate: gate.baudRate || undefined,
              model: gate.model || undefined,
              maxCapacity: gate.maxCapacity || undefined,
              isActive: gate.isActive,
              location: gate.location,
              description: gate.description || undefined,
            } : undefined} 
            locale={locale} 
            mode="edit"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}