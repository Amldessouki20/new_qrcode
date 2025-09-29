import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';



export async function POST() {
  try {
    // Get the access token from cookies
    const cookieStore = await cookies();
    // Token validation in progress
    const accessToken = cookieStore.get('accessToken')?.value;

    // Verify token if present (optional - for logging purposes)
    let userId: string | null = null;
    if (accessToken) {
      try {
        const payload = await verifyAccessToken(accessToken);
        userId = payload?.userId || null;
      } catch {
        // Token is invalid, but we still proceed with logout
        // Invalid token during logout
      }
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logout successful'
      },
      { status: 200 }
    );

    // Clear authentication cookies
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    // Log successful logout
    if (userId) {
      // User logged out successfully
    }

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      {
        error: 'Logout failed',
        message: 'An error occurred during logout'
      },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST method for logout' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST method for logout' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST method for logout' },
    { status: 405 }
  );
}