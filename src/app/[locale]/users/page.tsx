import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UsersList } from '@/components/users/UsersList';
import { getTranslations } from 'next-intl/server';

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
        isActive: true,
      },
    });
    
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  // Check if user has permission to view users
  if (!await hasPermission(user.id, PERMISSIONS.USER_LIST)) {
    redirect(`/${locale}/dashboard`);
  }
  
  const t = await getTranslations({ locale });
  
  return (
    <DashboardLayout user={user}>
      <div className="space-y-4  overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
             <h1 className="text-3xl font-bold tracking-tight">
              {t ('users.title')}
            </h1> 
             <p className="text-muted-foreground">
              {t ('users.description')}
            </p> 
          </div>
        </div>
        
        <UsersList />
      </div>
    </DashboardLayout>
  );
}