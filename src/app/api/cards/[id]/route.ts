import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { updateCardSchema } from '@/lib/validations/guests';

// export const dynamic = 'force-dynamic';



interface CardUpdateInput {
  validTo?: Date;
  maxUsage?: number;
  isActive?: boolean;
  mealTimeId?: string;
}

// GET /api/cards/[id] - Get card by ID
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

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    });

    if (!user || !(await hasPermission(user.id, PERMISSIONS.CARD_READ))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Get card with related data
    const card = await prisma.card.findUnique({
      where: { id },
      include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              jobTitle: true,
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                },
              },
            },
          },
          mealTime: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
              isActive: true,
            },
          },
        scanLogs: {
          select: {
            id: true,
            scanTime: true,
            isSuccess: true,
          },
          orderBy: {
            scanTime: 'desc',
          },
          take: 10, // Last 10 scans
        },
        _count: {
          select: {
            scanLogs: true,
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error('Error fetching card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/cards/[id] - Update card
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

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    });

    if (!user || !(await hasPermission(user.id, PERMISSIONS.CARD_UPDATE))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if card exists
    const existingCard = await prisma.card.findUnique({
      where: { id:(await params).id },
      select: { id: true, guestId: true },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateCardSchema.parse(body);

    // Check if meal time exists (if provided)
    if (validatedData.mealTimeId) {
      const mealTime = await prisma.mealTime.findUnique({
        where: {
          id: validatedData.mealTimeId,
        },
      });

      if (!mealTime || !mealTime.isActive) {
        return NextResponse.json(
          { error: 'Meal time not found or inactive' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: CardUpdateInput = {};

    if (validatedData.validTo !== undefined) {
      updateData.validTo = new Date(validatedData.validTo);
    }

    if (validatedData.maxUsage !== undefined) {
      updateData.maxUsage = validatedData.maxUsage;
    }

    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }

    if (validatedData.mealTimeId !== undefined) {
      updateData.mealTimeId = validatedData.mealTimeId;
    }

    // Update card
    const card = await prisma.card.update({
      where: { id:(await params).id},
      data: updateData,
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
        mealTime: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error('Error updating card:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/cards/[id] - Delete card
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

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    });

    if (!user || !(await hasPermission(user.id, PERMISSIONS.CARD_DELETE))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if card exists
    const existingCard = await prisma.card.findUnique({
      where: { id: (await params).id },
      select: { id: true },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Delete card (this will also delete related scan logs due to cascade)
    await prisma.card.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}