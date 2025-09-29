import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserForm } from '@/components/users/UserForm';
import { getTranslations } from 'next-intl/server';
import { User } from '@prisma/client';
export const dynamic = 'force-dynamic';



export interface UserFormProps {
  mode: 'create' | 'edit';
  userToEdit?: User; // لو مستورد من @prisma/client
}



async function getAuthUser() {
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

async function getUserToEdit(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  return user;
}

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect(`/${locale}/login`);
  }

  // Check if user has permission to edit users
  if (!(await hasPermission(authUser.id, PERMISSIONS.USER_UPDATE))) {
    redirect(`/${locale}/dashboard`);
  }

  const userToEdit = await getUserToEdit(id);

  if (!userToEdit) {
    notFound();
  }

  const t = await getTranslations({ locale });

  return (
    <DashboardLayout user={authUser}>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('users.editUser')}
          </h1>
          <p className="text-muted-foreground">
            {t('users.editDescription', { username: userToEdit.username })}
          </p>
        </div>
        <UserForm mode="edit" userToEdit={userToEdit} />
      </div>
    </DashboardLayout>
  );
}