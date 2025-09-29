import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { hashPassword } from '@/lib/bcrypt';
import { z } from 'zod';
import { Prisma } from '@prisma/client';





// User update validation schema
const updateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'SUPER_ADMIN']).optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});

// GET /api/users/[id] - Get single user
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

    // Check permissions - use the actual permission name from database
    const userHasPermission = await hasPermission(payload.userId, PERMISSIONS.USER_READ);
    if (!userHasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userPermissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Format response
    const formattedUser = {
      ...user,
      permissions: user.userPermissions.map(up => up.permission),
      userPermissions: undefined,
    };

    return NextResponse.json(formattedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
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

    // Check permissions - use the actual permission name from database
    const userHasPermission = await hasPermission(payload.userId, PERMISSIONS.USER_UPDATE);
    if (!userHasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();

    
    const validatedData = updateUserSchema.parse(body);

    // Check if username already exists (if username is being updated)
    if (validatedData.username && validatedData.username !== existingUser.username) {
      const userWithSameUsername = await prisma.user.findUnique({
        where: { username: validatedData.username },
      });

      if (userWithSameUsername) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData:Prisma.UserUpdateInput = {};
    if (validatedData.username) updateData.username = validatedData.username;
    if (validatedData.role) updateData.role = validatedData.role;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    
    // Hash password if provided
    if (validatedData.password) {
      updateData.password = await hashPassword(validatedData.password);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Handle permissions if provided
    if (validatedData.permissions) {
      // Remove existing permissions
      await prisma.userPermission.deleteMany({
        where: { userId: id },
      });

      // Add new permissions
      if (validatedData.permissions.length > 0) {
        const permissionRecords = await prisma.permission.findMany({
          where: {
            name: { in: validatedData.permissions },
          },
        });

        await prisma.userPermission.createMany({
          data: permissionRecords.map(permission => ({
            userId: id,
            permissionId: permission.id,
          })),
        });
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error'},
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

