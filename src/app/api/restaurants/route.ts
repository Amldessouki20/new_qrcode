import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';






// Restaurant validation schema
const createRestaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required').max(100, 'Name too long'),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  restaurantType: z.string().min(1, 'Restaurant type is required'),
  gateId: z.string().optional(),
  mealTimes: z.array(z.object({
    name: z.string().min(1, 'Meal name is required'),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    isActive: z.boolean().default(true),
  })).min(1, 'At least one meal time is required'),
  isActive: z.boolean().default(true),
});

// GET /api/restaurants - List restaurants with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    const canView = await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_READ);
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const include = searchParams.get('include') || '';

    // Build where clause
    const where: {
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        address?: { contains: string; mode: 'insensitive' };
        nameAr?: { contains: string; mode: 'insensitive' };
      }>;
      isActive?: boolean;
      restaurantType?: string;
    } = {};
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          nameAr: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Build order by clause
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (['name', 'capacity', 'createdAt'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.name = 'asc';
    }

    // Get total count
    const total = await prisma.restaurant.count({ where });

    // Build select clause based on include parameter
    const selectClause: {
      id: boolean;
      name: boolean;
      nameAr: boolean;
      description: boolean;
      location: boolean;
      capacity: boolean;
      restaurantType: boolean;
      gateId: boolean;
      isActive: boolean;
      createdAt: boolean;
      updatedAt: boolean;
      gate?: { select: { id: boolean; name: boolean; nameAr: boolean; location: boolean; isActive: boolean } };
      mealTimes?: { select: { id: boolean; name: boolean; nameAr: boolean; startTime: boolean; endTime: boolean; isActive: boolean } };
      _count?: { select: { mealTimes: boolean; guests: boolean } };
    } = {
      id: true,
      name: true,
      nameAr: true,
      description: true,
      location: true,
      capacity: true,
      restaurantType: true,
      gateId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      gate: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          location: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          mealTimes: true,
          guests: true,
        },
      },
    };

    // Include meal times if requested
    if (include.includes('mealTimes')) {
      selectClause.mealTimes = {
        select: {
          id: true,
          name: true,
          nameAr: true,
          startTime: true,
          endTime: true,
          isActive: true,
        },
      };
    }

    // Get restaurants
    const restaurants = await prisma.restaurant.findMany({
      where,
      select: selectClause,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      restaurants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/restaurants - Create new restaurant
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    const canCreate = await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_CREATE);
    if (!canCreate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createRestaurantSchema.parse(body);

 

    // Check if restaurant name already exists
    const existingRestaurant = await prisma.restaurant.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingRestaurant) {
      return NextResponse.json(
        { error: 'Restaurant with this name already exists' },
        { status: 409 }
      );
    }

    // Create restaurant with meal times
    const restaurant = await prisma.restaurant.create({
      data: {
        name: validatedData.name,
        ...(validatedData.nameAr && { nameAr: validatedData.nameAr }),
        ...(validatedData.description && { description: validatedData.description }),
        ...(validatedData.location && { location: validatedData.location }),
        capacity: validatedData.capacity,
        restaurantType: validatedData.restaurantType,
        ...(validatedData.gateId && { gateId: validatedData.gateId }),
        isActive: validatedData.isActive,
        mealTimes: {
          create: validatedData.mealTimes.map(mealTime => ({
            name: mealTime.name,
            startTime: mealTime.startTime,
            endTime: mealTime.endTime,
            isActive: mealTime.isActive,
          }))
        }
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        location: true,
        capacity: true,
        restaurantType: true,
        gateId: true,
        isActive: true,
        gate: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            location: true,
            isActive: true,
          }
        },
        mealTimes: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            isActive: true,
          }
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Restaurant created successfully',
        restaurant,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Error creating restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}