import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { hashPassword } from '@/lib/bcrypt';
import { z } from 'zod';




// User creation validation schema
const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER','SUPER_ADMIN']).default('USER'),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).optional(),
});



// GET /api/users - List users with pagination
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.username = {
        contains: search,
        mode: 'insensitive',
      };
    }
    if (role) {
      where.role = role as Prisma.EnumUserRoleFilter;
    }
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
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
                name: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Format response
    const formattedUsers = users.map(user => ({
      ...user,
      permissions: user.userPermissions.map(up => up.permission),
      userPermissions: undefined,
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
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
    // For development: Allow ADMIN users to bypass permission check
    const userHasPermission = await hasPermission(payload.userId, PERMISSIONS.USER_CREATE);
    const isAdmin = payload.role === 'ADMIN';
    
    if (!userHasPermission && !isAdmin) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Need users.create permission or ADMIN role.',
        required: PERMISSIONS.USER_CREATE,
        userRole: payload.role,
        hasPermission: userHasPermission,
        isAdmin
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);
    //check if user is admin or super admin
    const canAssignPermissions = payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN';
    if (validatedData.permissions?.length && !canAssignPermissions) {
      return NextResponse.json(
        { 
          error: 'Only ADMIN or SUPER_ADMIN users can assign permissions when creating users',
          userRole: payload.role,
          canAssignPermissions
        },
        { status: 403 }
      );
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        password: hashedPassword,
        role: validatedData.role,
        isActive: validatedData.isActive,
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Link permissions if provided
if (validatedData.permissions && validatedData.permissions.length > 0) {
  // Remove duplicates from permissions array
  const uniquePermissions = [...new Set(validatedData.permissions)];
  
  const permissions = await prisma.permission.findMany({
    where: {
      name: {
        in: uniquePermissions,
      },
    },
    select: { id: true, name: true },
  });



  if (permissions.length > 0) {
    await prisma.userPermission.createMany({
      data: permissions.map(p => ({
        userId: user.id,
        permissionId: p.id,
      })),
    });

  }
}

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
        
      return NextResponse.json(
        
        { error: 'Validation error' },
        
        { status: 400 }
      );
    }
  


    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}