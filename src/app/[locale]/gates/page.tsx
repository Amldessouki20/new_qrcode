import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GatesList } from '@/components/gates/GateList';
import { getTranslations } from 'next-intl/server';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';




interface PageProps {
  params: Promise<{
    locale: string;
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

export default async function GatesPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  // Check if user has permission to view gates
  if (!await hasPermission(user.id, PERMISSIONS.GATE_LIST)) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale });

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('gates.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('gates.description')}
          </p>
        </div>
        
        <GatesList locale={locale} />
      </div>
    </DashboardLayout>
  );
}