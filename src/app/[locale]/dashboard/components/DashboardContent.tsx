'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  UtensilsCrossed,
  UserCheck,
  CreditCard,
  Plus,
  Eye,
  BarChart3,
  Activity,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { StatsChart } from '@/components/dashboard/StatsChart';

interface User {
  id: string;
  username: string;
  role: string;
}

interface DashboardContentProps {
  user: User;
}

interface DashboardStats {
  totalUsers: { value: number; change: string; percentage: string };
  totalRestaurants: { value: number; change: string; percentage: string };
  totalGuests: { value: number; change: string; percentage: string };
  totalCards: { value: number; change: string; percentage: string };
  activeCards: { value: number; change: string; percentage: string };
  todayScans: { value: number; change: string; percentage: string };
}

interface RecentActivity {
  id: string;
  action: string;
  user: string;
  time: string;
  type: string;
  location?: string;
}

const getStatsCardsConfig = () => [
  {
    key: 'totalUsers',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'totalRestaurants',
    icon: UtensilsCrossed,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    key: 'totalGuests',
    icon: UserCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    key: 'totalCards',
    icon: CreditCard,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

const getQuickActions = (t: (key: string) => string) => [
  {
    key: 'addGuest',
    href: '/guests',
    icon: Plus,
    title: t('guests.addGuest') || 'Add New Guest',
    description: t('guests.descriptionGuest') || 'Register a new guest in the system',
  },
  {
    key: 'viewReports',
    href: '/reports',
    icon: BarChart3,
    title: t('reports.viewReports') || 'View Reports',
    description: t('reports.descriptionReports') || 'Check system analytics and reports',
  },
  {
    key: 'scanActivity',
    href: '/scan',
    icon: Activity,
    title: t('scan.scanActivity') || 'Scan Activity',
    description: t('scan.descriptionScanActivity') || 'Monitor real-time scanning activity',
  },
  {
    key: 'manageCards',
    href: '/cards',
    icon: Eye,
    title: t('cards.manageCards') || 'Manage Cards',
    description: t('cards.descriptionmanageCard') || 'View and manage guest cards',
  },
];

export function DashboardContent({ user }: DashboardContentProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const getUserDisplayName = () => {
    return user?.username || 'User';
  };

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/stats', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data.stats || data);
      setRecentActivities(recentActivities || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [recentActivities]);

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const statsCardsConfig = getStatsCardsConfig();
  const quickActions = getQuickActions(t);

  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('dashboard.welcome')}, {getUserDisplayName()}!
        </p>
        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCardsConfig.map((statConfig) => {
          const Icon = statConfig.icon;
          const statData = stats?.[statConfig.key as keyof DashboardStats];
          return (
            <Card key={statConfig.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold">
                  {t( `dashboard.${statConfig.key}`)}
                </CardTitle>
                <div className={`p-2 rounded-lg ${statConfig.bgColor}`}>
                  <Icon className={`h-4 w-4 ${statConfig.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    (statData && typeof statData.value !== 'undefined') ? statData.value : 0
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {loading ? (
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    (statData && statData.change) ? statData.change : 'No data available'
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('quickActions.title')}</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.key}
                  href={`/${locale}${action.href}`}
                  className="block transition-transform hover:scale-[1.02]"
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 space-x-4 hover:bg-primary/5 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left space-y-1 flex-1">
                      <div className="font-semibold">{action.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                  </Button>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.recentActivities')}</CardTitle>
              <CardDescription>
                Latest system activities and updates
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-muted animate-pulse mt-2" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))
              ) : recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{activity.user}</span>
                        <span>•</span>
                        <span>{activity.time}</span>
                        {activity.location && (
                          <>
                            <span>•</span>
                            <span>{activity.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activities</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                View All Activities
              </Button>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Chart */}
      <StatsChart 
        stats={stats ? {
          totalUsers: stats.totalUsers.value,
          totalRestaurants: stats.totalRestaurants.value,
          totalGuests: stats.totalGuests.value,
          totalCards: stats.totalCards.value,
          activeCards: stats.activeCards.value,
          todayScans: stats.todayScans.value,
        } : null}
        loading={loading}
      />
    </div>
  );
}