import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      // Show first few characters of URLs for debugging (without exposing full credentials)
      DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT SET',
      POSTGRES_URL_NON_POOLING_PREFIX: process.env.POSTGRES_URL_NON_POOLING ? process.env.POSTGRES_URL_NON_POOLING.substring(0, 20) + '...' : 'NOT SET',
    };

    return NextResponse.json({
      success: true,
      environment: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Environment check error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Environment check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}