import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';

// export const dynamic = 'force-dynamic';


// Guest update validation schema
const updateGuestSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  nationalId: z.string().optional(),
  passportNo: z.string().optional(),
  nationality: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  roomNumber: z.string().optional(),
  isActive: z.boolean().optional(),
  restaurantId: z.string().optional(),
});

// GET /api/guests/[id] - Get guest by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    if (!(await hasPermission(payload.userId, PERMISSIONS.GUEST_READ))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get guest with related data
    const guest = await prisma.guest.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nationalId: true,
        passportNo: true,
        nationality: true,
        company: true,
        jobTitle: true,
        checkInDate: true,
        checkOutDate: true,
        roomNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
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
            usageCount: true,
            maxUsage: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    return NextResponse.json({ guest });
  } catch (error) {
    console.error('Error fetching guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/guests/[id] - Update guest
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify authentication
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    if (!(await hasPermission(payload.userId, PERMISSIONS.GUEST_UPDATE))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if guest exists
    const existingGuest = await prisma.guest.findUnique({
      where: { id },
    });

    if (!existingGuest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateGuestSchema.parse(body);

    // Check if restaurant exists (if restaurantId is being updated)
    if (validatedData.restaurantId && validatedData.restaurantId !== existingGuest.restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: validatedData.restaurantId },
      });

      if (!restaurant) {
        return NextResponse.json(
          { error: 'Restaurant not found' },
          { status: 404 }
        );
      }
    }

    // Check if national ID already exists (if updating national ID)
    if (validatedData.nationalId && validatedData.nationalId !== existingGuest.nationalId) {
      const existingNationalId = await prisma.guest.findFirst({
        where: {
          nationalId: validatedData.nationalId,
          id: { not: id },
        },
      });

      if (existingNationalId) {
        return NextResponse.json(
          { error: 'Guest with this national ID already exists' },
          { status: 409 }
        );
      }
    }

    // Check if passport number already exists (if updating passport number)
    if (validatedData.passportNo && validatedData.passportNo !== existingGuest.passportNo) {
      const existingPassport = await prisma.guest.findFirst({
        where: {
          passportNo: validatedData.passportNo,
          id: { not: id },
        },
      });

      if (existingPassport) {
        return NextResponse.json(
          { error: 'Guest with this passport number already exists' },
          { status: 409 }
        );
      }
    }

    // Filter out fields that are not part of the guest model
    const { restaurantId, checkInDate, checkOutDate, ...guestData } = validatedData;
    
    // Prepare update data - filter out undefined values
    const filteredGuestData = Object.fromEntries(
      Object.entries(guestData).filter(([, value]) => value !== undefined)
    );
    
    const updateData: Prisma.GuestUpdateInput = {
      ...filteredGuestData,
      ...(checkInDate && { checkInDate: new Date(checkInDate) }),
      ...(checkOutDate && { checkOutDate: new Date(checkOutDate) }),
      updater: {
        connect: { id: payload.userId }
      },
    };
    
    // Handle restaurant relationship if restaurantId is provided
    if (restaurantId) {
      updateData.restaurant = {
        connect: { id: restaurantId }
      };
    }
    
    // Update guest
    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nationalId: true,
        passportNo: true,
        nationality: true,
        company: true,
        jobTitle: true,
        checkInDate: true,
        checkOutDate: true,
        roomNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Guest updated successfully',
      guest: updatedGuest,
    });
  } catch (error) {
      console.error('Error creating guest:', error); 
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error' },
        
        { status: 400 }
      );
    }

    console.error('Error updating guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/guests/[id] - Delete guest
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify authentication
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    if (!(await hasPermission(payload.userId, PERMISSIONS.GUEST_DELETE))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if guest exists
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Check if guest has associated smart cards
    if (guest._count.cards > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete guest with associated smart cards. Please remove them first.',
        },
        { status: 409 }
      );
    }

    // Delete guest
    await prisma.guest.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Guest deleted successfully' });
  } catch (error) {
    console.error('Error deleting guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}