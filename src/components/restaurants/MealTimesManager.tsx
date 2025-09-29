'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MealTimesManagerProps {
  restaurantId: string;
}

export function MealTimesManager({ restaurantId }: MealTimesManagerProps) {
  const [loading, setLoading] = useState(true);
  const t = useTranslations();

  useEffect(() => {
    // Simulate loading for now
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [restaurantId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('mealTimes.title')}</CardTitle>
          <CardDescription>{t('mealTimes.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('mealTimes.title')}</CardTitle>
        <CardDescription>{t('mealTimes.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          {t('mealTimes.comingSoon')}
        </div>
      </CardContent>
    </Card>
  );
}