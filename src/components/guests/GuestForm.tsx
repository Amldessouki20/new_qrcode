'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, User } from 'lucide-react';
import Image from 'next/image';
import { ImageUpload, ImageUploadError } from '@/components/ui/image-upload';
import { GuestAvatar } from '@/components/ui/guest-avatar';


interface Restaurant {
  id: string;
  name: string;
  restaurantType?: string;
  mealTimes: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  }[];
}

interface GuestFormProps {
  initialData?: {
    id: string;
    name: string;
    identification: string;
    nationality: string;
    room: string;
    company?: string;
    religion?: string;
    jobTitle?: string;
    restaurantId?: string;
    restaurantType?: string;
    isActive: boolean;
    profileImagePath?: string;
  } | undefined;
  isEdit?: boolean;
}

export function GuestForm({ initialData, isEdit = false }: GuestFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    identification: initialData?.identification ?? '',
    nationality: initialData?.nationality ?? '',
    room: initialData?.room ?? '',
    company: initialData?.company ?? '',
    religion: initialData?.religion ?? '',
    jobTitle: initialData?.jobTitle ?? '',
    restaurantId: initialData?.restaurantId ?? '',
    restaurantType: initialData?.restaurantType ?? '',
    isActive: initialData?.isActive ?? true,
    // Card information
    checkInDate: new Date().toISOString().split('T')[0],
    expiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    maxMeals: 3, // Default: breakfast, lunch, dinner
    selectedMealTimes: [] as string[],
    // Profile image
    profileImage: null as string | null,
  });
  const [imageError, setImageError] = useState<string | null>(null);
  const [createdGuest, setCreatedGuest] = useState<{
    guest: {
      id: string;
      firstName: string;
      lastName: string;
      nationalId?: string;
      company?: string;
      religion?: string;
      jobTitle?: string;
      roomNumber?: string;
      // Image fields from API
      profileImagePath?: string;
      thumbnailImagePath?: string;
      imageUploadedAt?: string;
      imageSize?: number;
      imageMimeType?: string;
    };
    card: {
      id: string;
      cardData: string;
      validFrom: string;
      validTo: string;
      maxUsage: number;
    };
    printUrl?: string;
  } | null>(null);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants?include=mealTimes');
      if (response.ok) {
        const data = await response.json();
        setRestaurants(data.restaurants || []);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const selectedRestaurant = restaurants.find(r => r.id === formData.restaurantId);
  const availableMealTimes = selectedRestaurant?.mealTimes || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = isEdit ? `/api/guests/${initialData?.id}` : '/api/guests';
      const method = isEdit ? 'PUT' : 'POST';

      // Validate required fields
      if (!formData.restaurantId || formData.restaurantId === 'none') {
        toast.error('Please select a restaurant');
        return;
      }

      if (!formData.name.trim()) {
        toast.error('Please enter guest name');
        return;
      }

      // Validate that initialData.id exists for edit operations
      if (isEdit && !initialData?.id) {
        toast.error('Guest ID is required for editing');
        return;
      }

      // Validate dates
      if (formData.checkInDate && formData.expiredDate) {
        const checkIn = new Date(formData.checkInDate);
        const expired = new Date(formData.expiredDate);
        if (expired <= checkIn) {
          toast.error('Expired date must be after check-in date');
          return;
        }
      }

      const nameParts = formData.name.trim().split(' ');
      const requestData: {
        firstName: string;
        lastName: string;
        nationalId: string;
        nationality: string;
        roomNumber: string;
        company: string;
        religion?: string;
        jobTitle?: string;
        restaurantId: string;
        restaurantType: string;
        isActive: boolean;
        checkInDate?: string;
        expiredDate?: string;
        maxMeals?: number;
        selectedMealTimes?: string[];
        profileImage?: string;
      } = {
        firstName: nameParts[0] || 'Guest',
        lastName: nameParts.slice(1).join(' ') || 'User',
        nationalId: formData.identification,
        nationality: formData.nationality,
        roomNumber: formData.room,
        company: formData.company,
        religion: formData.religion,
        jobTitle: formData.jobTitle,
        restaurantId: formData.restaurantId,
        restaurantType: formData.restaurantType,
        isActive: formData.isActive,
        ...(formData.checkInDate && { checkInDate: new Date(formData.checkInDate + 'T00:00:00.000Z').toISOString() }),
        ...(formData.expiredDate && { expiredDate: new Date(formData.expiredDate + 'T23:59:59.999Z').toISOString() }),
        ...(formData.profileImage && { profileImage: formData.profileImage }),
      };

      // Only include card-related fields when creating a new guest
      if (!isEdit) {
        requestData.maxMeals = formData.maxMeals;
        requestData.selectedMealTimes = formData.selectedMealTimes;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save guest');
        
      }

      const data = await response.json();
      toast.success(data.message || (isEdit ? t('guests.guestUpdated') : t('guests.guestCreated')));
      
      // If a new guest was created with a card, show card information in the same page
      if (!isEdit && data.card) {
        setCreatedGuest(data);
        setShowCard(true);
      } else if (isEdit) {
        router.back();
      } else {
        router.push(`/${locale}/guests`);
    

      }
      router.refresh();
    } catch (error) {
      console.error('Error saving guest:', error);
      toast.error(error instanceof Error ? error.message : t('saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean | number | string[] | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
   
    <div className="space-y-2 overflow-hidden mx-auto max-w-xl w-full  text-ms  ">
      <Card className="p-2 bg-slate-50 shadow-sm text-lg ">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{isEdit ? t('guests.editGuest') : t('guests.addGuest')}</CardTitle>
        <CardDescription className="text-xs">
          {isEdit ? t('guests.editGuestDescription') : t('guests.addGuestDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent >
        <form onSubmit={handleSubmit} className="space-y-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('guests.fullName')}</Label>
              <Input   className="h-8 text-sm px-2 max-w-xs"
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('guests.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identification">{t('guests.identification')}</Label>
              <Input  className="h-8 text-sm px-2 max-w-xs"
                id="identification"
                type="text"
                value={formData.identification}
                onChange={(e) => handleInputChange('identification', e.target.value)}
                placeholder={t('guests.identificationPlaceholder')}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="nationality">{t('guests.nationality')}</Label>
              <Input  className="h-8 text-sm px-2 max-w-xs"
                id="nationality"
                type="text"
                value={formData.nationality}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
                placeholder={t('guests.nationalityPlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">{t('guests.room')}</Label>
              <Input  className="h-8 text-sm px-2 max-w-xs"
                id="room"
                type="text"
                value={formData.room}
                onChange={(e) => handleInputChange('room', e.target.value)}
                placeholder={t('guests.roomPlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">{t('guests.religion')}</Label>
              <Input  className="h-8 text-sm px-2 max-w-xs"
                id="religion"
                type="text"
                value={formData.religion}
                onChange={(e) => handleInputChange('religion', e.target.value)}
                placeholder={t('guests.religionPlaceholder')}
                required
              />
            </div>
          </div>
          <div className= "grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="company">{t('guests.company')} ({t('guests.optional')})</Label>
            <Input  className="h-8 text-sm px-2 max-w-xs"
              id="company"
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder={t('guests.companyPlaceholder')}
            />
          </div>

          <div className="space-y-2"  >
            <Label htmlFor="restaurantId">{t('guests.restaurant')} ({t('guests.optional')})</Label>
            <Select  
              value={formData.restaurantId}
              onValueChange={(value) => handleInputChange('restaurantId', value)}
            >
              <SelectTrigger  className="h-8 text-sm px-2 max-w-xs">
                <SelectValue placeholder={t('guests.selectRestaurant')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('guests.noRestaurant')}</SelectItem>
                {restaurants.map((restaurant) => (
                  <SelectItem  key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>

          {/* Card Information Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">{t('guests.cardInformation')}</h3>
           
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="checkInDate">{t('guests.checkInDate')}</Label>
                <Input  className="h-8 text-sm px-2 max-w-xs"
                  id="checkInDate"
                  type="date"
                  value={formData.checkInDate}
                  onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiredDate">{t('guests.expiredDate')}</Label>
                <Input  className="h-8 text-sm px-2 max-w-xs"
                  id="expiredDate"
                  type="date"
                  value={formData.expiredDate}
                  onChange={(e) => handleInputChange('expiredDate', e.target.value)}
                  min={formData.checkInDate}
                  required
                />
              </div>
            </div>

            {/* Meal-related fields only show when creating a new guest */}
            {!isEdit && (
              <>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="maxMeals">{t('guests.maxMealsPerDay')}</Label>
                  <Input
                    id="maxMeals"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxMeals}
                    onChange={(e) => handleInputChange('maxMeals', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                {/* Meal Times Selection */}
                {availableMealTimes.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label>{t('guests.allowedMealTimes')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableMealTimes.map((mealTime) => (
                        <div key={mealTime.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`mealTime-${mealTime.id}`}
                            checked={formData.selectedMealTimes.includes(mealTime.id)}
                            onChange={(e) => {
                              const newMealTimes = e.target.checked
                                ? [...formData.selectedMealTimes, mealTime.id]
                                : formData.selectedMealTimes.filter(id => id !== mealTime.id);
                              handleInputChange('selectedMealTimes', newMealTimes);
                            }}
                            className="rounded border-gray-300"
                          />
                      <Label htmlFor={`mealTime-${mealTime.id}`} className="text-sm">
                        {mealTime.name} ({mealTime.startTime} - {mealTime.endTime})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* Profile Image Upload */}
          <div className="space-y-4 pl-45">
            <Label>{t('guests.profileImage')}</Label>
            <div className="flex items-start gap-2">
              {/* Current Image Preview */}
              {(initialData?.profileImagePath || formData.profileImage) && (
                <div className="flex flex-col items-center gap-2">
                  <GuestAvatar
                    src={formData.profileImage ? `data:image/jpeg;base64,${formData.profileImage}` : initialData?.profileImagePath}
                    alt={formData.name}
                    fallbackText={formData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    size="lg"
                  />
                  <span className="text-xs text-gray-500">{t('guests.currentImage')}</span>
                </div>
              )}
              
              {/* Image Upload Component */}
              <div className="flex-1">
                <ImageUpload
                  value={formData.profileImage || undefined}
                  onChange={(base64Image: string | null) => {
                    handleInputChange('profileImage', base64Image);
                    setImageError(null);
                  }}
                  onError={(error: string) => setImageError(error)}
                  maxSize={2048 * 1024}
                  acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  className="h-32"
                />
                {imageError && (
                  <ImageUploadError error={imageError} />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {t('guests.imageUploadHint')}
                </p>
              </div>
            </div>
           </div>

          <div className="flex items-center space-x2">
            <input  className="h-8 text-sm px-2 max-w-xs"
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              // className="rounded border-gray-300"
            />
            <Label htmlFor="isActive">{t('guests.isActive')}</Label>
          </div>

          <div className="flex gap-2 ">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? t('guests.update') : t('guests.create')}
            </Button>
          </div>
        </form>
      </CardContent>
      </Card>

      {/* Card Display Section */}
      { showCard && createdGuest && (
        <Card className="mt-6">
           <CardHeader>
             <CardTitle className="text-green-600">{t('guests.CreatedSuccessfully')}</CardTitle>
             <CardDescription>{t('guests.cardGeneratedDescription')}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600">{t('guests.guestInformation')}</h4>
                    <div className="flex items-center gap-3 py-2">
                      {createdGuest?.guest?.profileImagePath ? (
                        <Image
                          src={createdGuest.guest.profileImagePath}
                          alt={`${createdGuest.guest.firstName} ${createdGuest.guest.lastName}`}
                          width={64}
                          height={64}
                          className="rounded-full border"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-100 border flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p><strong>{t('guests.name')}:</strong> {createdGuest?.guest?.firstName} {createdGuest?.guest?.lastName}</p>
                    <p><strong>{t('guests.nationalId')}:</strong> {createdGuest?.guest?.nationalId || 'N/A'}</p>
                    <p><strong>{t('guests.company')}:</strong> {createdGuest?.guest?.company || 'N/A'}</p>
                    <p><strong>{t('guests.room')}:</strong> {createdGuest?.guest?.roomNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600">{t('cards.cardInformation')}</h4>
                    <p><strong>{t('cards.cardId')}:</strong> {createdGuest?.card?.id}</p>
                    <p><strong>{t('cards.validFrom')}:</strong> {createdGuest?.card?.validFrom ? new Date(createdGuest!.card!.validFrom).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>{t('cards.validTo')}:</strong> {createdGuest?.card?.validTo ? new Date(createdGuest!.card!.validTo).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>{t('cards.maxUsage')}:</strong> {createdGuest?.card?.maxUsage}</p>
                  </div>
                </div>

                {/* Meal Times Information */}
                {(() => {
                  try {
                    if (!createdGuest?.card?.cardData) return null;
                    
                    const cardData = JSON.parse(createdGuest?.card?.cardData || '{}');
                    let allowedMealTimes: { id: string; name: string; startTime: string; endTime: string; }[] = [];
                    
                    // New format (mealTimeIds array)
                    if (cardData.mealTimeIds && Array.isArray(cardData.mealTimeIds)) {
                      const selectedRestaurant = restaurants.find(r => r.id === formData.restaurantId);
                      if (selectedRestaurant?.mealTimes) {
                        allowedMealTimes = selectedRestaurant!.mealTimes!.filter(mt => 
                          cardData.mealTimeIds.includes(mt.id)
                        );
                      }
                    }
                    // Old full format (allowedMealTimes array)
                    else if (cardData.allowedMealTimes && Array.isArray(cardData.allowedMealTimes)) {
                      allowedMealTimes = cardData.allowedMealTimes;
                    }
                    // Fallback: use selected meal times from form
                    else if (formData.selectedMealTimes.length > 0) {
                      const selectedRestaurant = restaurants.find(r => r.id === formData.restaurantId);
                      if (selectedRestaurant?.mealTimes) {
                        allowedMealTimes = selectedRestaurant!.mealTimes!.filter(mt => 
                          formData.selectedMealTimes.includes(mt.id)
                        );
                      }
                    }
                    
                    if (allowedMealTimes.length > 0) {
                      return (
                        <div className="mt-4">
                          <h4 className="font-semibold text-sm text-gray-600 mb-2">{t('guests.allowedMealTimes')}</h4>
                          <div className="space-y-1">
                            {allowedMealTimes.map((mealTime) => (
                              <div key={mealTime.id} className="flex items-center justify-between bg-green-50 p-2 rounded border border-green-200">
                                <span className="font-medium text-green-800">{mealTime.name}</span>
                                <span className="text-sm text-green-600">{mealTime.startTime} - {mealTime.endTime}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch (error) {
                    console.error('Error parsing card data:', error);
                  }
                  return null;
                })()}
                </div>
                 
                 <div className="flex gap-4 pt-4 border-t">
                   <Button
                     onClick={() => {
                       if (createdGuest?.printUrl) {
                         window.open(createdGuest.printUrl, '_blank');
                       }
                     }}
                     className="bg-blue-600 hover:bg-blue-700"
                   >
                     {t('cards.printCard')}
                   </Button>
                   <Button
                     onClick={() => {
                       if (createdGuest?.card?.id) {
                         const virtualCardUrl = `/api/cards/${createdGuest.card.id}/virtual`;
                         window.open(virtualCardUrl, '_blank');
                       }
                     }}
                     className="bg-green-600 hover:bg-green-700"
                   >
                     📱 {t('cards.virtualCard')}
                   </Button>
                 
                  
                   <Button
                     onClick={() => {
                       setShowCard(false);
                       router.push('/guests');
                     }}
                     variant="outline"
                   >
                     {t('cards.backToGuestsList')}
                   </Button>
                 </div>
               
           </CardContent>
        </Card>
          
         ) }
         </div>
      
     );
}

export default GuestForm;