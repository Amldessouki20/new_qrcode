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

export default async function NewGatePage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  // Check if user has permission to create gates
  if (!await hasPermission(user.id, PERMISSIONS.GATE_CREATE)) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale });

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Link 
            href={`/${locale}/gates`}
            className="text-muted-foreground hover:text-foreground"
          >
            ← {t('gates.back')}
          </Link>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('gates.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('gates.addGateDescription')}
          </p>
        </div>
        
        <GateForm mode="create" locale={locale} />
      </div>
    </DashboardLayout>
  );
}