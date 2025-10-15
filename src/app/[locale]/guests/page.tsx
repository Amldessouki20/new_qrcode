import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GuestsList } from './components/GuestsList';

export const dynamic = 'force-dynamic';

export default async function GuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; search?: string; restaurant?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  // Verify authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  
  if (!token) {
    redirect(`/${locale}/login`);
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    redirect(`/${locale}/login`);
  }

  // Get user and check permissions
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check if user has permission to view guests
  const canViewGuests = await hasPermission(user.id, PERMISSIONS.GUEST_LIST);
  if (!canViewGuests) {
    redirect(`/${locale}/dashboard`);
  }

  // Parse search parameters
  const page = parseInt(resolvedSearchParams.page || '1');
  const search = resolvedSearchParams.search || '';
  const restaurantFilter = resolvedSearchParams.restaurant || '';
  const limit = 10;
  const offset = (page - 1) * limit;

  // Build where clause for filtering
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { religion: { contains: search, mode: 'insensitive' } },
      { jobTitle: { contains: search, mode: 'insensitive' } },
      { nationalId: { contains: search, mode: 'insensitive' } },
      { passportNo: { contains: search, mode: 'insensitive' } },
      { roomNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (restaurantFilter) {
    where.restaurantId = restaurantFilter;
  }

  // Get guests with pagination
  const [guests, totalCount, restaurants] = await Promise.all([
    prisma.guest.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImagePath: true,
        thumbnailImagePath: true,
        nationalId: true,
        passportNo: true,
        nationality: true,
        roomNumber: true,
        company: true,
        religion: true,
        jobTitle: true,
        checkInDate: true,
        expiredDate: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        cards: {
          select: {
            id: true,
            cardData: true,
            cardType: true,
            isActive: true,
            validFrom: true,
            validTo: true,
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    }),
    prisma.guest.count({ where }),
    prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        

        {/* Guests List */}
        <GuestsList
          guests={guests}
          restaurants={restaurants}
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          searchQuery={search}
          restaurantFilter={restaurantFilter}
          userPermissions={{
            canCreate: await hasPermission(user.id, PERMISSIONS.GUEST_CREATE),
            canUpdate: await hasPermission(user.id, PERMISSIONS.GUEST_UPDATE),
            canDelete: await hasPermission(user.id, PERMISSIONS.GUEST_DELETE),
            canViewCards: await hasPermission(user.id, PERMISSIONS.CARD_LIST),
          }}
        />
      </div>
    </DashboardLayout>
  );
}