import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';




// Permission assignment validation schema
const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string()).min(1, 'At least one permission must be selected'),
});

// GET /api/users/[id]/permissions - Get user permissions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check permissions - use the actual permission name from database
    const userHasPermission = await hasPermission(payload.userId, PERMISSIONS.USER_READ);
    if (!userHasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId: id },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Get all available permissions
    const allPermissions = await prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      user,
      userPermissions: userPermissions.map(up => up.permission),
      allPermissions,
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users/[id]/permissions - Assign permissions to user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check permissions - use the actual permission name from database
    const userHasPermission = await hasPermission(payload.userId, PERMISSIONS.USER_UPDATE);
    if (!userHasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = assignPermissionsSchema.parse(body);

    // Verify all permission IDs exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: {
          in: validatedData.permissionIds,
        },
      },
    });

    if (permissions.length !== validatedData.permissionIds.length) {
      return NextResponse.json(
        { error: 'One or more permission IDs are invalid' },
        { status: 400 }
      );
    }

    // Use transaction to replace user permissions
    await prisma.$transaction(async (tx) => {
      // Delete existing permissions
      await tx.userPermission.deleteMany({
        where: { userId: id },
      });

      // Create new permissions
      await tx.userPermission.createMany({
        data: validatedData.permissionIds.map(permissionId => ({
          userId: id,
          permissionId,
        })),
      });
    });

    // Get updated user permissions
    const updatedUserPermissions = await prisma.userPermission.findMany({
      where: { userId: id },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Permissions assigned successfully',
      permissions: updatedUserPermissions.map(up => up.permission),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Error assigning permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// put /api/users/[id]/permissions - Remove specific permissions from user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check permissions - use the actual permission name from database
    const userHasPermission = await hasPermission(payload.userId, PERMISSIONS.USER_UPDATE);
    if (!userHasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permissionIds = searchParams.get('permissionIds')?.split(',') || [];

    if (permissionIds.length === 0) {
      return NextResponse.json(
        { error: 'No permission IDs provided' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove specific permissions
    await prisma.userPermission.deleteMany({
      where: {
        userId: id,
        permissionId: {
          in: permissionIds,
        },
      },
    });

    return NextResponse.json({ message: 'Permissions removed successfully' });
  } catch (error) {
    console.error('Error removing permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}