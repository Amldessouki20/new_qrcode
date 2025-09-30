import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log('Debug Login - Starting authentication for:', username);

    // Test database connection first
    // let dbConnected = false;
    try {
      await prisma.$connect();
      await prisma.user.count();
      // dbConnected = true;
      console.log('Debug Login - Database connection: SUCCESS');
    } catch (dbError) {
      console.error('Debug Login - Database connection failed:', dbError);
      return NextResponse.json({
        success: false,
        step: 'database_connection',
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

    // Try to find user
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
      });
      console.log('Debug Login - User lookup result:', user ? 'FOUND' : 'NOT_FOUND');
    } catch (userError) {
      console.error('Debug Login - User lookup failed:', userError);
      return NextResponse.json({
        success: false,
        step: 'user_lookup',
        error: 'User lookup failed',
        details: userError instanceof Error ? userError.message : 'Unknown user lookup error'
      }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        step: 'user_not_found',
        error: 'User not found',
        details: `No user found with username: ${username}`
      }, { status: 404 });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({
        success: false,
        step: 'user_inactive',
        error: 'User account is deactivated',
        details: 'User exists but account is not active'
      }, { status: 403 });
    }

    // Test password verification
    let passwordValid = false;
    try {
      passwordValid = await verifyPassword(password, user.password);
      console.log('Debug Login - Password verification:', passwordValid ? 'SUCCESS' : 'FAILED');
    } catch (passwordError) {
      console.error('Debug Login - Password verification failed:', passwordError);
      return NextResponse.json({
        success: false,
        step: 'password_verification',
        error: 'Password verification failed',
        details: passwordError instanceof Error ? passwordError.message : 'Unknown password error'
      }, { status: 500 });
    }

    if (!passwordValid) {
      return NextResponse.json({
        success: false,
        step: 'invalid_password',
        error: 'Invalid password',
        details: 'Password does not match'
      }, { status: 401 });
    }

    // If we get here, authentication should succeed
    return NextResponse.json({
      success: true,
      step: 'authentication_success',
      message: 'All authentication steps passed',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Debug Login - Unexpected error:', error);
    return NextResponse.json({
      success: false,
      step: 'unexpected_error',
      error: 'Unexpected authentication error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}