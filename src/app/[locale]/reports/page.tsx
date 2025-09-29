import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, BarChart3, Users, CreditCard, Building, Calendar, FileSpreadsheet, FileImage, FileType } from 'lucide-react';
import { ReportsClient } from '@/components/reports/ReportsClient';

export const dynamic = 'force-dynamic';

async function getUser() {
  try {
    const token = (await cookies()).get('token')?.value;
    if (!token) return null;
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  if (!(await hasPermission(user.userId, PERMISSIONS.USER_LIST))) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale });
  
  // Get statistics for reports
  const [totalUsers, totalRestaurants, totalGuests, totalCards, totalScans] = await Promise.all([
    prisma.user.count(),
    prisma.restaurant.count(),
    prisma.guest.count(),
    prisma.card.count(),
    prisma.scanLog.count()
  ]);

  const reportTypes = [
    {
      id: 'users',
      title: t('reports.types.users.title'),
      description: t('reports.types.users.description'),
      icon: <Users className="h-8 w-8 text-blue-600" />,
      count: totalUsers,
      color: 'blue'
    },
    {
      id: 'restaurants',
      title: t('reports.types.restaurants.title'),
      description: t('reports.types.restaurants.description'),
      icon: <Building className="h-8 w-8 text-green-600" />,
      count: totalRestaurants,
      color: 'green'
    },
    {
      id: 'accommodation',
      title: t('reports.types.accommodation.title'),
      description: t('reports.types.accommodation.description'),
      icon: <Building className="h-8 w-8 text-purple-600" />,
      count: totalGuests,
      color: 'purple'
    },
    {
      id: 'guests',
      title: t('reports.types.guests.title'),
      description: t('reports.types.guests.description'),
      icon: <Users className="h-8 w-8 text-purple-600" />,
      count: totalGuests,
      color: 'purple'
    },
    {
      id: 'cards',
      title: t('reports.types.cards.title'),
      description: t('reports.types.cards.description'),
      icon: <CreditCard className="h-8 w-8 text-orange-600" />,
      count: totalCards,
      color: 'orange'
    },
    {
      id: 'scans',
      title: t('reports.types.scans.title'),
      description: t('reports.types.scans.description'),
      icon: <BarChart3 className="h-8 w-8 text-red-600" />,
      count: totalScans,
      color: 'red'
    },
    {
      id: 'system',
      title: t('reports.types.system.title'),
      description: t('reports.types.system.description'),
      icon: <FileText className="h-8 w-8 text-gray-600" />,
      count: 1,
      color: 'gray'
    }
  ];

  const exportFormats = [
    {
      id: 'pdf',
      name: 'PDF',
      icon: <FileText className="h-5 w-5 text-red-600" />,
      description: t('reports.formats.pdf')
    },
    {
      id: 'excel',
      name: 'Excel',
      icon: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
      description: t('reports.formats.excel')
    },
    {
      id: 'word',
      name: 'Word',
      icon: <FileType className="h-5 w-5 text-blue-600" />,
      description: t('reports.formats.word')
    },
    {
      id: 'svg',
      name: 'SVG',
      icon: <FileImage className="h-5 w-5 text-purple-600" />,
      description: t('reports.formats.svg')
    }
  ];

  return (
    <DashboardLayout user={{ id: user.userId, username: user.username, role: user.role }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('reports.title')}
            </h1>
            <p className="text-gray-600">
              {t('reports.description')}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('reports.totalReports')}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportTypes.length}</div>
              <p className="text-xs text-muted-foreground">
                {t('reports.availableTypes')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('reports.exportFormats')}
              </CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exportFormats.length}</div>
              <p className="text-xs text-muted-foreground">
                {t('reports.supportedFormats')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('reports.lastGenerated')}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Date().toLocaleDateString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('reports.today')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Reports Components */}
        <ReportsClient 
          reportTypes={reportTypes}
          exportFormats={exportFormats}
          locale={locale}
        />
      </div>
    </DashboardLayout>
  );
}