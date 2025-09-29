import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/bcrypt';
import { UserRole } from '@prisma/client';

export async function POST() {
  try {
    console.log('Setup Admin - Starting admin user creation');

    // Test database connection first
    try {
      await prisma.$connect();
      console.log('Setup Admin - Database connection: SUCCESS');
    } catch (dbError) {
      console.error('Setup Admin - Database connection failed:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin user already exists',
        user: {
          id: existingAdmin.id,
          username: existingAdmin.username,
          role: existingAdmin.role,
          isActive: existingAdmin.isActive
        }
      }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await hashPassword('admin123');
    console.log('Setup Admin - Password hashed successfully');

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
      }
    });

    console.log('Setup Admin - Admin user created successfully:', adminUser.id);

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
        isActive: adminUser.isActive,
        createdAt: adminUser.createdAt
      }
    });

  } catch (error) {
    console.error('Setup Admin - Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create admin user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // List all users for debugging
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      users: users,
      count: users.length
    });

  } catch (error) {
    console.error('Setup Admin - List users error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to list users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}