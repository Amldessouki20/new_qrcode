import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';



export async function GET() {
  try {
    // Get the access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'No access token provided'
        },
        { status: 401 }
      );
    }

    // Verify the access token
    let payload;
    try {
      payload = verifyAccessToken(accessToken);
    } catch {
      // Authentication error handled
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired access token'
        },
        { status: 401 }
      );
    }

    if (!payload || !('userId' in payload)) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid token payload'
        },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId as string
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'User account no longer exists'
        },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          error: 'Account disabled',
          message: 'User account has been disabled'
        },
        { status: 403 }
      );
    }

    // Return user information
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get current user error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while fetching user information'
      },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET method to fetch user info' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET method to fetch user info' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET method to fetch user info' },
    { status: 405 }
  );
}