import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyRefreshToken, generateTokenPair } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';



export async function POST() {
  try {
    // Get the refresh token from cookies
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'No refresh token provided'
        },
        { status: 401 }
      );
    }

    // Verify the refresh token
    let payload;
    try {
      payload =await verifyRefreshToken(refreshToken);
    } catch {
      // Token refresh error handled
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired refresh token'
        },
        { status: 401 }
      );
    }

    if (!payload?.userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid token payload'
        },
        { status: 401 }
      );
    }

    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true
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

    // Check if token version matches (if using token versioning)
    if (payload?.tokenVersion !== undefined && payload.tokenVersion !== (payload.tokenVersion || 0)) {
      return NextResponse.json(
        {
          error: 'Token revoked',
          message: 'Refresh token has been revoked'
        },
        { status: 401 }
      );
    }

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      payload?.tokenVersion || 0
    );

    // Create response with new access token
    const response = NextResponse.json(
      {
        success: true,
        message: 'Token refreshed successfully',
        accessToken
      },
      { status: 200 }
    );

    // Set new refresh token as httpOnly cookie
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days to match JWT_REFRESH_EXPIRES_IN
      path: '/'
    });

    // // Optionally set new access token as cookie too
    // response.cookies.set('accessToken', accessToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'strict',
    //   maxAge: 7 * 24 * 60 * 60, // 7 days to match JWT_EXPIRES_IN
    //   path: '/'
    // });

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);
    
    return NextResponse.json(
      {
        error: 'Token refresh failed',
        message: 'An error occurred while refreshing the token'
      },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST method for token refresh' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST method for token refresh' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST method for token refresh' },
    { status: 405 }
  );
}