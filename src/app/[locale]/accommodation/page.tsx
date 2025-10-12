import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import AccommodationScanTable from '@/components/accommodation/AccommodationScanTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRole } from '@prisma/client';
import { TestTube } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';



interface AccommodationPageProps {
  params: Promise<{ locale: string }>;
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
    if (!payload || !payload.userId) {
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

export default async function AccommodationPage({ params }: AccommodationPageProps) {
  const { locale } = await params;
  const t = await getTranslations('accommodation');
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has permission to view accommodation scans
  const canViewScans = await hasPermission(user.id, PERMISSIONS.CARD_READ);
  if (!canViewScans) {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4">
        {/* Page Header */}
        {/* <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div> */}
         <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t('title')}
              </h1>
              <p className="text-muted-foreground">
                {t('description')}
              </p>
            </div>
            <Link href={`/${locale}/accommodation/manual-scan`}>
              <Button variant="outline" className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                المسح اليدوي
              </Button>
            </Link>
          </div>
        </div>
         

        {/* Scan Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">{t('scanResults.title')}</span>
            </CardTitle>
            <CardDescription>
              {t('scanResults.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<TableSkeleton />}>
              <AccommodationScanTable locale={locale} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Loading skeleton for the table
function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: AccommodationPageProps) {
  await params; // Consume params to satisfy Next.js requirements
  const t = await getTranslations('accommodation');
  
  return {
    title: t('title'),
    description: t('description'),
  };
}