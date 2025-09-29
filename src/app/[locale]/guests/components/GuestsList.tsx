'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { parseCardDataString } from '@/lib/qr-generator';

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  passportNo: string | null;
  nationality: string | null;
  roomNumber: string | null;
  company?: string | null;
  jobTitle?: string | null;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  cards: {
    id: string;
    cardData: string;
    cardType: string;
    isActive: boolean;
  }[];
  restaurant: {
    id: string;
    name: string;
  };
}

interface GuestsListProps {
  guests: Guest[];
  restaurants: {
    id: string;
    name: string;
  }[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  restaurantFilter: string;
  userPermissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canViewCards: boolean;
  };
}

export function GuestsList({ guests, totalCount, currentPage, totalPages, searchQuery, userPermissions }: GuestsListProps) {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (localSearchQuery) {
      params.set('search', localSearchQuery);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    window.location.search = params.toString();
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', page.toString());
    window.location.search = params.toString();
  };

  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    if (!confirm(t('guests.deleteConfirmation', { name: guestName }))) {
      return;
    }

    setDeletingGuestId(guestId);

    try {
      const response = await fetch(`/api/guests/${guestId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete guest');
      }

      toast.success(t('guests.deleteSuccess'));
      router.refresh();
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast.error(error instanceof Error ? error.message : t('guests.deleteError'));
    } finally {
      setDeletingGuestId(null);
    }
  };

  const getCardStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? t('guests.cardActive') : t('guests.cardInactive')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('guests.title')}</h1>
          <p className="text-muted-foreground">
            {t('guests.description', { count: totalCount })}
          </p>
        </div>
        {userPermissions.canCreate && (
          <Button asChild>
            <Link href={`/${locale}/guests/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t('guests.addGuest')}
            </Link>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('guests.searchAndFilter')}</CardTitle>
          <CardDescription>
            {t('guests.searchDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('guests.searchPlaceholder')}
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit">{t('common.search')}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Guests Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('guests.guestsList')}</CardTitle>
          <CardDescription>
            {t('guests.showing', { 
              start: (currentPage - 1) * 10 + 1,
              end: Math.min(currentPage * 10, totalCount),
              total: totalCount
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('guests.name')}</TableHead>
                  <TableHead>{t('guests.identification')}</TableHead>
                  <TableHead>{t('guests.nationality')}</TableHead>
                  <TableHead>{t('guests.room')}</TableHead>
                  <TableHead>{t('guests.company')}</TableHead>
                  <TableHead>{t('guests.cards')}</TableHead>
                  <TableHead>{t('guests.restaurant')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchQuery ? t('guests.noSearchResults') : t('guests.noGuests')}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  guests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {guest.firstName} {guest.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {guest.jobTitle}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{guest.nationalId || guest.passportNo || '-'}</div>
                          <div className="text-muted-foreground">
                            {guest.nationalId ? t('guests.nationalId') : guest.passportNo ? t('guests.passport') : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{guest.nationality}</TableCell>
                      <TableCell>{guest.roomNumber}</TableCell>
                      <TableCell>{guest.company || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {guest.cards.map((card) => (
                            <div key={card.id} className="flex items-center gap-2">
                              {(() => {
                                try {
                                  const parsedData = parseCardDataString(card.cardData);
                                  if (parsedData) {
                                    return (
                                      <div className="text-sm">
                                        <span className="font-mono">{parsedData.cardNumber}</span>
                                        {parsedData.guestName && (
                                          <div className="text-xs text-gray-500">{parsedData.guestName}</div>
                                        )}
                                      </div>
                                    );
                                  }
                                } catch (error) {
                                  console.error('Error parsing card data:', error);
                                }
                                return <span className="text-sm font-mono">{card.cardData.substring(0, 8)}...</span>;
                              })()}
                              {getCardStatusBadge(card.isActive)}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{guest.restaurant.name}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/${locale}/guests/${guest.id}`} className="flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                {t('common.view')}
                              </Link>
                            </DropdownMenuItem>
                            {userPermissions.canUpdate && (
                              <DropdownMenuItem asChild>
                                <Link href={`/${locale}/guests/${guest.id}/edit`} className="flex items-center">
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('common.edit')}
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {userPermissions.canDelete && (
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteGuest(guest.id, `${guest.firstName} ${guest.lastName}`)}
                                disabled={deletingGuestId === guest.id}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {deletingGuestId === guest.id ? t('common.deleting') : t('common.delete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                {t('guests.showing', { 
                  start: (currentPage - 1) * 10 + 1,
                  end: Math.min(currentPage * 10, totalCount),
                  total: totalCount
                })}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}