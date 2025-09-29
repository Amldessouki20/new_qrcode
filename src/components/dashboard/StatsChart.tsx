'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, UtensilsCrossed, UserCheck, CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface StatsData {
  totalUsers: number;
  totalRestaurants: number;
  totalGuests: number;
  totalCards: number;
  activeCards: number;
  todayScans: number;


}

interface StatsChartProps {
  stats: StatsData | null;
  loading: boolean;
}

export function StatsChart({ stats, loading }: StatsChartProps) {
  const t = useTranslations();
  const [animatedStats, setAnimatedStats] = useState<StatsData | null>(null);

  useEffect(() => {
    if (stats && !loading) {
      // Animate numbers from 0 to actual value
      const duration = 1000; // 1 second
      const steps = 50;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        
        setAnimatedStats({
          totalUsers: Math.floor(stats.totalUsers * progress),
          totalRestaurants: Math.floor(stats.totalRestaurants * progress),
          totalGuests: Math.floor(stats.totalGuests * progress),
          totalCards: Math.floor(stats.totalCards * progress),
          activeCards: Math.floor(stats.activeCards * progress),
          todayScans: Math.floor(stats.todayScans * progress),
        });
        
        if (currentStep >= steps) {
          setAnimatedStats(stats);
          clearInterval(interval);
        }
      }, stepDuration);
      
      return () => clearInterval(interval);
    }
    
    return () => {}; // Return cleanup function for all code paths
  }, [stats, loading]);

  const chartData = [
    {
      name: t('dashboard.totalUsers'),
      value: animatedStats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
    },
    {
      name: t('dashboard.totalRestaurants'),
      value: animatedStats?.totalRestaurants || 0,
      icon: UtensilsCrossed,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
    },
    {
      name: t('dashboard.totalGuests'),
      value: animatedStats?.totalGuests || 0,
      icon: UserCheck,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-100',
    },
    {
      name: t('dashboard.totalCards'),
      value: animatedStats?.totalCards || 0,
      icon: CreditCard,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-100',
    },
  ];

  const maxValue = Math.max(...chartData.map(item => item.value), 1);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('dashboard.statistics')}
          </CardTitle>
          <CardDescription>
            System usage and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-2 w-full bg-muted animate-pulse rounded" />
                </div>
                <div className="w-12 h-4 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {t('dashboard.statistics')}
        </CardTitle>
        <CardDescription>
          System usage and performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {chartData.map((item, index) => {
            const Icon = item.icon;
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${item.lightColor}`}>
                  <Icon className={`h-4 w-4 text-${item.color.split('-')[1]}-600`} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm font-bold">{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ease-out ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Additional metrics */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {animatedStats?.activeCards || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('dashboard.stats.activeCards')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {animatedStats?.todayScans || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('dashboard.stats.todayScans')}
                </div>
              </div>
            </div>
          </div>
          
          {/* Trend indicator */}
          <div className="flex items-center justify-center pt-2">
            <div className="flex items-center space-x-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">System Growing</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}