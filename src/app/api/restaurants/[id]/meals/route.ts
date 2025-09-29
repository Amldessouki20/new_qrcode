import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { mealTimeQuerySchema } from '@/lib/validations/restaurants';
import { z } from 'zod';




// GET /api/restaurants/[id]/meals - Get meal times for a restaurant
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

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    const userHasPermission = await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_READ);
    if (!userHasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id: restaurantId } = await params;

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const { isActive } = mealTimeQuerySchema.parse({ ...queryParams, restaurantId });

    // Build where clause
    const where: { restaurantId: string; isActive?: boolean } = { restaurantId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get meal times
    const mealTimes = await prisma.mealTime.findMany({
      where,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },

      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ mealTimes });
  } catch (error) {
    console.error('Error fetching meal times:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/restaurants/[id]/meals - Create meal time for a restaurant
// export async function POST(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     // Verify authentication
//     const token = request.cookies.get('accessToken')?.value;
//     if (!token) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const payload = verifyAccessToken(token);
//     if (!payload) {
//       return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
//     }

//     // Get user from database
//     const user = await prisma.user.findUnique({
//       where: { id: payload.userId },
//     });

//     if (!user) {
//       return NextResponse.json({ error: 'User not found' }, { status: 404 });
//     }

//     // Check permissions
//     const userHasPermission = await hasPermission(payload.userId, PERMISSIONS.RESTAURANT_UPDATE);
//     if (!userHasPermission) {
//       return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
//     }

//     const { id: restaurantId } = await params;

//     // Verify restaurant exists
//     const restaurant = await prisma.restaurant.findUnique({
//       where: { id: restaurantId },
//     });

//     if (!restaurant) {
//       return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
//     }

//     // Parse and validate request body
//     const body = await request.json();
//     const validatedData = mealTimeSchema.parse({ ...body, restaurantId });

//     // Check for overlapping meal times
//     const overlappingMealTime = await prisma.mealTime.findFirst({
//       where: {
//         restaurantId,
//         isActive: true,
//         OR: [
//           {
//             AND: [
//               { startTime: { lte: validatedData.startTime } },
//               { endTime: { gt: validatedData.startTime } },
//             ],
//           },
//           {
//             AND: [
//               { startTime: { lt: validatedData.endTime } },
//               { endTime: { gte: validatedData.endTime } },
//             ],
//           },
//           {
//             AND: [
//               { startTime: { gte: validatedData.startTime } },
//               { endTime: { lte: validatedData.endTime } },
//             ],
//           },
//         ],
//       },
//     });

//     if (overlappingMealTime) {
//       return NextResponse.json(
//         { error: 'Meal time overlaps with existing meal time' },
//         { status: 409 }
//       );
//     }

//     // Create meal time
//     const mealTime = await prisma.mealTime.create({
//       data: {
//         name: validatedData.name,
//         startTime: validatedData.startTime,
//         endTime: validatedData.endTime,
//         isActive: validatedData.isActive,
//         restaurantId: restaurantId,
//       },
//       include: {
//         restaurant: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//       },
//     });

//     return NextResponse.json(mealTime, { status: 201 });
//   } catch (error) {
//     console.error('Error creating meal time:', error);
    
//     if (error instanceof z.ZodError) {
//       return NextResponse.json(
//         { error: 'Invalid input data', details: error.errors },
//         { status: 400 }
//       );
//     }
    
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }