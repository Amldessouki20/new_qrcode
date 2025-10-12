import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, QrCode, Printer, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { CardSearch } from '@/components/cards/CardSearch';
import { CardSelection } from '@/components/cards/CardSelection';
import { CardVisualCompact } from '@/components/cards/CardVisualCompact';

export const dynamic = 'force-dynamic';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  
  if (!token) {
    return null;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  return await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });
}

export default async function CardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; limit?: string; search?: string; status?: string }>;
}) {
  const { locale } = await params;
  const { page = '1', limit = '10', search = '', status = 'all' } = await searchParams;
  const user = await getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  // Check if user has permission to view cards
  if (!(await hasPermission(user.id, PERMISSIONS.CARD_LIST))) {
    redirect(`/${locale}/dashboard`);
  }
  
  const t = await getTranslations({ locale });
  
  // Get cards statistics and actual cards
  const currentPage = parseInt(page);
  const pageSize = parseInt(limit);
  const skip = (currentPage - 1) * pageSize;
  
  // Build search filter
  const searchFilter = search ? {
    OR: [
      { cardData: { contains: search, mode: 'insensitive' as const } },
      { guest: {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { nationalId: { contains: search, mode: 'insensitive' as const } }
        ]
      }}
    ]
  } : {};

  // Add status filter
  const statusFilter = status === 'active' ? { isActive: true } : 
                      status === 'expired' ? { isActive: false } : {};

  // Combine filters
  const combinedFilter = {
    ...searchFilter,
    ...statusFilter
  };

  const [totalCards, activeCards, expiredCards, cards, totalFilteredCards] = await Promise.all([
    prisma.card.count(),
    prisma.card.count({ where: { isActive: true } }),
    prisma.card.count({ where: { isActive: false } }),
    prisma.card.findMany({
      where: combinedFilter,
      select: {
          id: true,
          cardData: true,
          cardType: true,
          isActive: true,
          createdAt: true,
          validFrom: true,
          validTo: true,
          usageCount: true,
          maxUsage: true,
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImagePath: true,
              thumbnailImagePath: true,
              nationalId: true,
              passportNo: true,
              nationality: true,
              company: true,
              religion: true,
              jobTitle: true,
              roomNumber: true,
              checkInDate: true,
              expiredDate: true,
              restaurant: {
                select: {
                  name: true,
                  nameAr: true,
                  location: true,
                  restaurantType: true,
                }
              }
            }
          },
          mealTime: {
            select: {
              name: true,
              nameAr: true,
              startTime: true,
              endTime: true
            }
          }
        },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize
    }),
    prisma.card.count({ where: combinedFilter })
  ]);
  
  const totalPages = Math.ceil(totalFilteredCards / pageSize);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('cards.title')}
            </h1>
            <p className="text-gray-600">
              {t('cards.description')}
            </p>
          </div>
          <div className="flex space-x-2">
            {/* <Button asChild>
              <Link href={`/${locale}/cards/new`}>
                <Plus className="h-4 w-4 mr-2" />
                {t('cards.addNew')}
              </Link>
            </Button> */}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('cards.total')}
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCards}</div>
              <p className="text-xs text-muted-foreground">
                {t('cards.totalDescription')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('cards.active')}
              </CardTitle>
              <QrCode className="h-4 w-4 text-grey-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeCards}</div>
              <p className="text-xs text-muted-foreground">
                {t('cards.activeDescription')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('cards.expired')}
              </CardTitle>
              <QrCode className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expiredCards}</div>
              <p className="text-xs text-muted-foreground">
                {t('cards.expiredDescription')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cards List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('cards.management.title')}</CardTitle>
            <CardDescription>
              {t('cards.management.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cards.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t('cards.management.noCards')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t('cards.management.getStarted')}
                </p>
                <Button asChild>
                  <Link href={`/${locale}/cards/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('cards.addNew')}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-4">
                   {/* Search and Actions */}
                   <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <CardSearch locale={locale} initialSearch={search} initialStatus={status} />
                       {t('cards.search.placeholder')}
                     </div>
                     
                     <div className="flex items-center space-x-4">
                       <span className="selected-count text-sm text-gray-600">0 {t('cards.selected')}</span>
                   
                       <CardSelection cardIds={cards.map(card => card.id)} />
                       

                     </div>
                   </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-medium w-12">
                            <input 
                              type="checkbox" 
                              className="select-all-checkbox"
                            />
                          </th>
                          <th className="text-left p-4 font-medium">{t('cards.printCard')}</th>
                          {/* <th className="text-left p-4 font-medium">{t('details')}</th> */}
                          <th className="text-left p-4 font-medium">{t('cards.actions.status')}</th>
                          <th className="text-left p-4 font-medium">{t('cards.actions.title')}</th>
                        </tr>
                      </thead>
                    <tbody>
                      {cards.map((card) => (
                        <tr key={card.id} className="border-b hover:bg-gray-50" data-card-id={card.id} data-card-active={card.isActive}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="card-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              data-card-id={card.id}
                            />
                          </td>
                          <td className="px-4 py-4 w-30">
                            <div className="flex direction-col items-center  ">
                              <CardVisualCompact 
                                card={{
                                  id: card.id,
                                  cardData: card.cardData,
                                  cardType: card.cardType,
                                  validFrom: card.validFrom.toISOString(),
                                  validTo: card.validTo.toISOString(),
                                  isActive: card.isActive,
                                  // maxUsage: card.maxUsage,
                                  // usageCount: card.usageCount,
                                  guest: {
                                    firstName: card.guest?.firstName || '',
                                    lastName: card.guest?.lastName || '',
                                    ...(card.guest?.profileImagePath && { profileImagePath: card.guest.profileImagePath }),
                                    nationalId: card.guest?.nationalId || '',
                                    passportNo: card.guest?.passportNo || '',
                                    nationality: card.guest?.nationality || '',
                                    company: card.guest?.company || '',
                                    religion: card.guest?.religion || '',
                                    jobTitle: card.guest?.jobTitle || '',
                                    roomNumber: card.guest?.roomNumber || '',
                                    restaurant: {
                                      name: card.guest?.restaurant?.name || '',
                                      nameAr: card.guest?.restaurant?.nameAr || '',
                                      location: card.guest?.restaurant?.location || '',
                                      restaurantType:card.guest?.restaurant?.restaurantType || '',
                                    }
                                  },
                                  ...(card.mealTime && {
                                    mealTime: {
                                      name: card.mealTime.name,
                                      startTime: card.mealTime.startTime,
                                      endTime: card.mealTime.endTime
                                    }
                                  })
                                }} 
                                locale={locale} 
                              />
                            </div>
                          </td>
                         
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                              card.isActive && new Date(card.validTo) > new Date()
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {card.isActive && new Date(card.validTo) > new Date() ? t('cards.active') : t('cards.expired')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-1">
                              {card.guest && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    className="text-center"
                                  >
                                    <Link href={`/${locale}/cards/${card.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    className="text-center"
                                  >
                                    <Link href={`/${locale}/cards/${card.id}/print`} target="_blank">
                                      <Printer className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    {/* <div className="text-sm text-muted-foreground">
                      {t('common.pagination.showing')} 
                      {((currentPage - 1) * pageSize) + 1} 
                      {t('common.pagination.to')} 
                      {Math.min(currentPage * pageSize, totalFilteredCards)} 
                      {t('common.pagination.of')} {totalFilteredCards} 
                      {t('common.pagination.results')}
                    </div> */}

                 
                    <div className="text-sm text-muted-foreground">
                   {t("common.pagination.showing", {
                  start: (currentPage - 1) * pageSize + 1,
                  end: Math.min(currentPage * pageSize, totalFilteredCards),
                  total: totalFilteredCards,
                    })}
                     </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        asChild={currentPage > 1}
                      >
                        {currentPage > 1 ? (
                          <Link href={`/${locale}/cards?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(search ? `search=${search}` : '')), page: String(currentPage - 1), limit: String(pageSize) }).toString()}`}>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            {t('common.pagination.previous')}
                          </Link>
                        ) : (
                          <span>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            {t('common.pagination.previous')}
                          </span>
                        )}
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              asChild={currentPage !== pageNum}
                            >
                              {currentPage === pageNum ? (
                                <span>{pageNum}</span>
                              ) : (
                                <Link href={`/${locale}/cards?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(search ? `search=${search}` : '')), page: String(pageNum), limit: String(pageSize) }).toString()}`}>
                                  {pageNum}
                                </Link>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        asChild={currentPage < totalPages}
                      >
                        {currentPage < totalPages ? (
                          <Link href={`/${locale}/cards?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(search ? `search=${search}` : '')), page: String(currentPage + 1), limit: String(pageSize) }).toString()}`}>
                            {t('common.pagination.next')}
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Link>
                        ) : (
                          <span>
                            {t('common.pagination.next')}
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
          </div>
            )}
          </CardContent>
        </Card>
        
      </div>
      <script dangerouslySetInnerHTML={{
        __html: `
          function updateSelectedCount() {
            const checkboxes = document.querySelectorAll('.card-checkbox:checked');
            const count = checkboxes.length;
            const countElement = document.querySelector('.selected-count');
            const printBtn = document.querySelector('.print-selected-btn');
            
            if (countElement) {
              countElement.textContent = count + ' selected';
            }
            
            if (printBtn) {
              printBtn.disabled = count === 0;
            }
            
            // Update select all checkbox state
            const selectAllCheckbox = document.querySelector('.select-all-checkbox');
            const allCheckboxes = document.querySelectorAll('.card-checkbox');
            if (selectAllCheckbox && allCheckboxes.length > 0) {
              selectAllCheckbox.checked = count === allCheckboxes.length;
              selectAllCheckbox.indeterminate = count > 0 && count < allCheckboxes.length;
            }
          }
          
          function printSelectedCards() {
            const selectedCheckboxes = document.querySelectorAll('.card-checkbox:checked');
            const cardIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.cardId);
            
            if (cardIds.length === 0) {
              alert('Please select at least one card to print.');
              return;
            }
            
            // Open print page with selected card IDs
            const printUrl = '/${locale}/cards/print-multiple?ids=' + cardIds.join(',');
            window.open(printUrl, '_blank');
          }
          
          // Add event listeners when DOM is loaded
          document.addEventListener('DOMContentLoaded', function() {
            const printBtn = document.querySelector('.print-selected-btn');
            if (printBtn) {
              printBtn.addEventListener('click', printSelectedCards);
            }
            
            // Add checkbox event listeners
            const selectAllCheckbox = document.querySelector('.select-all-checkbox');
            if (selectAllCheckbox) {
              selectAllCheckbox.addEventListener('change', function(e) {
                const checkboxes = document.querySelectorAll('.card-checkbox');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
                updateSelectedCount();
              });
            }
            
            const cardCheckboxes = document.querySelectorAll('.card-checkbox');
            cardCheckboxes.forEach(checkbox => {
              checkbox.addEventListener('change', updateSelectedCount);
            });
          });
        `
      }} />
    </DashboardLayout>
  );
}