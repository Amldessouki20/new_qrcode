import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { TestTube, AlertTriangle } from 'lucide-react';
import ManualScanShell from '@/components/accommodation/ManualScanShell';

interface ManualScanPageProps {
  params: Promise<{ locale: string }>;
}

interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'MANAGER' | 'USER';
}

async function getUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    if (!token) return null;

    const payload = await verifyAccessToken(token);
    if (!payload || !payload.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true },
    });

    return user as User | null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export default async function ManualScanPage({ params }: ManualScanPageProps) {
  const { locale } = await params;
  const t = await getTranslations('accommodation');
  const user = await getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Align access with accommodation page: allow ADMIN/SUPER_ADMIN/USER or ACCOMMODATION_READ
  const roleAllows = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'USER';
  const canView = roleAllows ? true : await hasPermission(user.id, PERMISSIONS.ACCOMMODATION_READ);
  if (!canView) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-3">
            <TestTube className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t('manualScan.title') || 'صفحة المسح اليدوي المؤقتة'}
              </h1>
              <p className="text-muted-foreground">
                {t('manualScan.description') || 'اختبار رسائل النجاح والخطأ عن طريق إدخال QR Code يدوياً'}
              </p>
            </div>
          </div>

          {/* Warning Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              صفحة مؤقتة للاختبار
            </Badge>
            <span className="text-sm text-muted-foreground">
              هذه الصفحة مخصصة للاختبار فقط ويمكن حذفها لاحقاً
            </span>
          </div>
        </div>

        {/* Shell hosts interactive client components */}
        <ManualScanShell locale={locale} />

        <Separator />
      </div>
    </DashboardLayout>
  );
}