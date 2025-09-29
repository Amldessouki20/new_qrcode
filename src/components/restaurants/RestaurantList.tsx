'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, MapPin, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Restaurant {
  id: string;
  name: string;
  nameAr?: string;
  description: string | null;
  location: string | null;
  capacity: number;
  restaurantType: string;
  gateId?: string | null;
  gate?: {
    id: string;
    name: string;
    nameAr?: string;
    location?: string;
    isActive: boolean;
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  mealTimes?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  }[];
  _count?: {
    mealTimes: number;
    guestVisits: number;
  };
}

export function RestaurantsList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations();

  const fetchRestaurants = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/restaurants?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRestaurants(data.restaurants || []);
      } else {
        toast.error(t('restaurants.fetchError'));
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast.error(t('restaurants.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, setRestaurants, setLoading, t]);


  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/restaurants/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success(t('restaurants.deleteSuccess'));
        fetchRestaurants();
      } else {
        const error = await response.json();
        
        // Check if restaurant is linked to a gate
        if (error.isLinkedToGate) {
          toast.error(t('restaurants.deleteLinkedToGateError'));
        } else {
          toast.error(error.message || t('restaurants.deleteError'));
        }
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      toast.error(t('restaurants.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnlinkAndDelete = async (id: string) => {
    setDeletingId(id);
    try {
      // First unlink from gate
      const unlinkResponse = await fetch(`/api/restaurants/${id}/gate-link`, {
        method: 'DELETE',
      });
      
      if (unlinkResponse.ok) {
        // Then delete the restaurant
        const deleteResponse = await fetch(`/api/restaurants/${id}`, {
          method: 'DELETE',
        });
        
        if (deleteResponse.ok) {
          toast.success(t('restaurants.deleteSuccess'));
          fetchRestaurants();
        } else {
          const error = await deleteResponse.json();
          toast.error(error.message || t('restaurants.deleteError'));
        }
      } else {
        const error = await unlinkResponse.json();
        toast.error(error.message || t('restaurants.deleteError'));
      }
    } catch (error) {
      console.error('Error unlinking and deleting restaurant:', error);
      toast.error(t('restaurants.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [searchTerm, fetchRestaurants]);

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (restaurant.description && restaurant.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (restaurant.location && restaurant.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-4 overflow-hidden" >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder={t('restaurants.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value || '')}
              className="w-64"
              disabled
            />
          </div>
          <Button asChild>
            <Link href={`/${locale}/restaurants/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t('restaurants.addRestaurant')}
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse ">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 ">
      <div className="flex items-center justify-between ">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4" />
          <Input
            placeholder={t('restaurants.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value || '')}
            className="w-64"
          />
        </div>
        <Button asChild>
          <Link href={`/${locale}/restaurants/new`}>
            <Plus className="h-4 w-4 mr-2" />
            {t('restaurants.addRestaurant')}
          </Link>
        </Button>
      </div>

      {filteredRestaurants.length === 0 ? (
        <Card   className="w-full md:w-80 lg:w-96 h-64 min-h-[200px] p-6 border-0 shadow-md bg-slate-500">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? t('restaurants.noSearchResults') : t('restaurants.noRestaurants')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? t('restaurants.noSearchResultsDescription')
                  : t('restaurants.noRestaurantsDescription')
                }
                
              </p>
              {!searchTerm && (
                <Button asChild>
                  <Link href={`/${locale}/restaurants/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('restaurants.addFirstRestaurant')}
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.map((restaurant) => (
            <Card key={restaurant.id} className="border-0 shadow-md hover:shadow-lg transition-shadow bg-slate-50 px-3">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                    {restaurant.description && (
                      <CardDescription className="mt-1">
                        {restaurant.description}
                      </CardDescription>
                    )}
                    

                  </div>
                  <Badge variant={restaurant.isActive ? 'default' : 'secondary'}>
                    {restaurant.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {restaurant.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {restaurant.location}
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    {t('restaurants.capacity', { count: restaurant.capacity })}
                  </div>
                  
                  {restaurant.restaurantType && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {restaurant.restaurantType}
                      </Badge>
                    </div>
                  )}
                  
                  {restaurant.gate ? (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {t('restaurants.gateInfo', { 
                          gateName: restaurant.gate.name, 
                          location: restaurant.gate.location || '' 
                        })}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {t('restaurants.noGateAssigned')}
                      </Badge>
                    </div>
                  )}
                  
                  {restaurant._count && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {t('restaurants.mealTimesCount', { count: restaurant._count.mealTimes })}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/${locale}/restaurants/${restaurant.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={deletingId === restaurant.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {restaurant.gateId 
                                ? t('restaurants.restaurantLinkedToGate')
                                : t('restaurants.deleteConfirmTitle')
                              }
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {restaurant.gateId 
                                ? t('restaurants.restaurantLinkedToGateDescription')
                                : t('restaurants.deleteConfirmDescription', { name: restaurant.name })
                              }
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            {restaurant.gateId ? (
                              <>
                                <AlertDialogAction
                                  onClick={() => handleUnlinkAndDelete(restaurant.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('restaurants.unlinkAndDelete')}
                                </AlertDialogAction>
                              </>
                            ) : (
                              <AlertDialogAction
                                onClick={() => handleDelete(restaurant.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t('common.delete')}
                              </AlertDialogAction>
                            )}
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default RestaurantsList;