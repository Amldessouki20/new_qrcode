'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { Plus, Search, Building2, Filter, Users, Clock } from 'lucide-react';
import RestaurantForm from './RestaurantForm';
import RestaurantsList from './RestaurantList';
import { Gate } from '@/lib/types/api';

// interface RestaurantType {
//   id: string;
//   name: string;
//   nameAr?: string;
//   description?: string;
//   isActive: boolean;
// }

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  restaurantType: string;
  gateId?: string | null;
  gate?: Gate | null;
  isActive: boolean;
  mealTimes?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }[];
}

interface RestaurantManagementProps {
  initialRestaurants?: Restaurant[];
}

const RestaurantManagement: React.FC<RestaurantManagementProps> = ({ initialRestaurants = [] }) => {
  const t = useTranslations('restaurants');
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');

  // Fetch restaurants
  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/restaurants');
      if (response.ok) {
        const data = await response.json();
        setRestaurants(data.restaurants || []);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialRestaurants.length === 0) {
      fetchRestaurants();
    }
  }, [initialRestaurants.length, fetchRestaurants]);

  // Filter restaurants based on search term
  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNew = () => {
    setEditingRestaurant(null);
    setView('form');
  };

  if (view === 'form') {
    return (
      <RestaurantForm
        mode={editingRestaurant ? 'edit' : 'create'}
        {...(editingRestaurant && { restaurant: editingRestaurant })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t('restaurant.title')}</h1>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          {t('restaurant.addRestaurant')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{restaurants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.active')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {restaurants.filter(r => r.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalCapacity')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {restaurants.reduce((sum, r) => sum + (r.capacity || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value || '')}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {t('restaurant.filter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Restaurants List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">{t('loading')}</p>
            </CardContent>
          </Card>
        ) : filteredRestaurants.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('noRestaurants')}</h3>
              <p className="text-muted-foreground mb-4">{t('noRestaurantsDescription')}</p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('restaurant.addFirstRestaurant')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <RestaurantsList />
        )}
      </div>
    </div>
  );
};

export default RestaurantManagement;