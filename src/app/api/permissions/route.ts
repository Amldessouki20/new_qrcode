import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { verifyAccessToken } from '@/lib/jwt';
import { hasPermission } from '@/lib/permissions';




// GET /api/permissions - List all permissions
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userHasPermission = await hasPermission(payload.userId, 'permissions.read' as any);
    if (!userHasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: Prisma.PermissionWhereInput = {};
    if (category) {
      where.name = {
        startsWith: category,
        mode: 'insensitive',
      };
    }
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get permissions
    const permissions = await prisma.permission.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,

      },
      orderBy: {
        name: 'asc',
      },
    });

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, permission) => {
      const category = permission.name.split('_')[0] || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, Array<typeof permissions[0]>>);

    return NextResponse.json({
      permissions,
      groupedPermissions,
      categories: Object.keys(groupedPermissions),
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}