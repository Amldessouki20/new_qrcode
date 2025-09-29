import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { generateTokenPair } from '@/lib/jwt';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/auth';

// Login request validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(`login:${ip}`);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts',
          message: 'Please try again later',
          remainingAttempts: rateLimitResult.remainingAttempts
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
          const formattedErrors = validationResult.error.flatten();
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid input data',
           details: formattedErrors.fieldErrors 
        },
        { status: 400 }
      );
    }

    const { username, password } = validationResult.data;

    // Authenticate user
    const authResult = await authenticateUser({ username, password });
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: authResult.error || 'Invalid username or password'
        },
        { status: 401 }
      );
    }

    const user = authResult.user;

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user, 0);

    // Create response with tokens
    //  هذا يضمن حفظ الكوكي دائمًا
const response = new NextResponse(
  JSON.stringify({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken,

  }),
  {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }
);

    // Set refresh token as httpOnly cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // Set to false for localhost development
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    // Set access token as httpOnly cookie (optional, for SSR)
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: false, // Set to false for localhost development  //secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      maxAge: 7 * 24 * 60 * 60, // 7 days to match JWT_EXPIRES_IN
      path: '/'
    });

    // Also set token cookie for compatibility with reports page
    response.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during login'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'GET method is not supported for login' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'PUT method is not supported for login' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'DELETE method is not supported for login' },
    { status: 405 }
  );
}