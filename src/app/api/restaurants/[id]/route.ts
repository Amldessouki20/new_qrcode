import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';




// Restaurant update validation schema
const updateRestaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required').max(100, 'Name too long').optional(),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').optional(),
  restaurantType: z.string().min(1, 'Restaurant type is required').optional(),
  gateId: z.string().optional().nullable(),
  mealTimes: z.array(z.object({
    name: z.string().min(1, 'Meal name is required'),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    isActive: z.boolean().default(true),
  })).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/restaurants/[id] - Get restaurant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (!await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Get restaurant with related data
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        location: true,
        capacity: true,
        restaurantType: true,
        gateId: true,
        gate: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            location: true,
            isActive: true,
          },
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
        mealTimes: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            startTime: true,
            endTime: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        guests: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            passportNo: true,
            company: true,
            jobTitle: true,
            checkInDate: true,
            checkOutDate: true,
            roomNumber: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: {
            firstName: 'asc',
          },
        },
        _count: {
          select: {
            mealTimes: true,
            guests: true,
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/restaurants/[id] - Update restaurant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (!await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_UPDATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Check if restaurant exists
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id },
    });

    if (!existingRestaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateRestaurantSchema.parse(body);

    // Check if name is being updated and already exists
    if (validatedData.name && validatedData.name !== existingRestaurant.name) {
      const nameExists = await prisma.restaurant.findFirst({
        where: {
          name: {
            equals: validatedData.name,
            mode: 'insensitive',
          },
          id: {
            not: id,
          },
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Restaurant with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Separate mealTimes from other data since it's a relation
    const { mealTimes, ...otherData } = validatedData;
    
    // Prepare update data - only include fields that are defined
    const updateData: Record<string, unknown> = {};
    
    if (otherData.name !== undefined) updateData.name = otherData.name;
    if (otherData.nameAr !== undefined) updateData.nameAr = otherData.nameAr;
    if (otherData.description !== undefined) updateData.description = otherData.description;
    if (otherData.location !== undefined) updateData.location = otherData.location;
    if (otherData.capacity !== undefined) updateData.capacity = otherData.capacity;
    if (otherData.restaurantType !== undefined) updateData.restaurantType = otherData.restaurantType;
    if (otherData.gateId !== undefined) updateData.gateId = otherData.gateId;
    if (otherData.isActive !== undefined) updateData.isActive = otherData.isActive;

    // Handle meal times update if provided
    if (mealTimes) {
      // Delete existing meal times and create new ones
      await prisma.mealTime.deleteMany({
        where: { restaurantId: id },
      });
      
      updateData.mealTimes = {
        create: mealTimes.map(mealTime => ({
          name: mealTime.name,
          startTime: mealTime.startTime,
          endTime: mealTime.endTime,
          isActive: mealTime.isActive,
        }))
      };
    }

    // Update restaurant
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: updateData,
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
        createdAt: true,
        updatedAt: true,
        mealTimes: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            isActive: true,
          },
          orderBy: {
            startTime: 'asc',
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Restaurant updated successfully',
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Error updating restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/restaurants/[id] - Delete restaurant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (!await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
          _count: {
            select: {
              mealTimes: true,
              guests: true,
            },
          },
        },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Check if restaurant has associated data
    if (restaurant._count.mealTimes > 0 || restaurant._count.guests > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete restaurant with associated meal times or guests. Please remove them first.',
        },
        { status: 409 }
      );
    }

    // Check if restaurant is linked to a gate
    if (restaurant.gateId) {
      return NextResponse.json(
        {
          error: 'Restaurant is linked to a gate. Please unlink it first or use force delete.',
          isLinkedToGate: true,
          gateId: restaurant.gateId,
        },
        { status: 409 }
      );
    }

    // Delete restaurant
    await prisma.restaurant.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}