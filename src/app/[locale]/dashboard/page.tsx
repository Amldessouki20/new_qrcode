import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { DashboardContent } from './components/DashboardContent';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';



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
    console.error('Error getting user:', error);
    return null;
  }
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  // احمِ صفحة الداشبورد بصلاحية صريحة
  const canViewDashboard = await hasPermission(user.id, PERMISSIONS.DASHBOARD_VIEW);
  if (!canViewDashboard && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    // وجّه المستخدم لصفحة لديه صلاحية أساسية لها (مثلاً الإقامة)
    redirect(`/${locale}/accommodation`);
  }
  
  return (
    <DashboardLayout user={user}>
      <DashboardContent user={user} />
    </DashboardLayout>
  );
}