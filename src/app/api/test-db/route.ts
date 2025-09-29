import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    const permissionCount = await prisma.permission.count();
    
    // Try to find admin user
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        role: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        userCount,
        permissionCount,
        adminUser,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
        jwtSecret: process.env.JWT_SECRET ? 'Configured' : 'Not configured'
      }
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
      jwtSecret: process.env.JWT_SECRET ? 'Configured' : 'Not configured'
    }, { status: 500 });
  }
}