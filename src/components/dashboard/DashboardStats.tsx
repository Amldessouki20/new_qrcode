'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, CreditCard, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DashboardStatsProps {
  stats?: {
    totalUsers: number;
    totalGuests: number;
    totalRestaurants: number;
    totalCards: number;
    activeScans: number;
    todayScans: number;
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const t = useTranslations();

  const defaultStats = {
    totalUsers: 0,
    totalGuests: 0,
    totalRestaurants: 0,
    totalCards: 0,
    activeScans: 0,
    todayScans: 0,
    ...stats
  };

  const statsCards = [
    {
      title: t('stats.totalUsers'),
      value: defaultStats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: t('stats.totalGuests'),
      value: defaultStats.totalGuests,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: t('stats.totalRestaurants'),
      value: defaultStats.totalRestaurants,
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: t('stats.totalCards'),
      value: defaultStats.totalCards,
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              {index === 3 && (
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                  <Activity className="h-3 w-3" />
                  <span>{t('stats.todayScans')}: {defaultStats.todayScans}</span>
                  <Badge variant="outline" className="text-xs">
                    {t('common.active')}: {defaultStats.activeScans}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardStats;