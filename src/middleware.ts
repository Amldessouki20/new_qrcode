import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { verifyAccessToken, extractTokenFromHeader } from './lib/jwt';

// ---------------------------
// 1️⃣ i18n Middleware
// ---------------------------
const intlMiddleware = createMiddleware(routing);

// ---------------------------
// 2️⃣ Routes
// ---------------------------
const PROTECTED_ROUTES = [
  '/dashboard', '/users', '/guests', '/cards',
  '/gates', '/reports', '/restaurants', '/scan-logs',
  '/profile', '/settings','/accommodation'
];

const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/reset-password'];

// ---------------------------
// 3️⃣ Helpers
// ---------------------------
function isProtectedRoute(pathname: string) {
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '') || '/';
  return PROTECTED_ROUTES.some(route =>
    pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/')
  );
}

function isPublicRoute(pathname: string) {
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '') || '/';
  return PUBLIC_ROUTES.some(route =>
    pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/')
  );
}

async function verifyAuth(request: NextRequest) {
  try {
    let token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) token = request.cookies.get('accessToken')?.value || null;
    if (!token) return { isValid: false };

    const payload = verifyAccessToken(token);
    if (!payload) return { isValid: false };

    return { isValid: true, userId: payload.userId, role: payload.role };
  } catch {
    return { isValid: false };
  }
}

function redirectToLogin(request: NextRequest) {
  const locale = request.nextUrl.pathname.split('/')[1] || 'en';
  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

// ---------------------------
// 4️⃣ Main Middleware
// ---------------------------
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (pathname.startsWith('/_next/') || pathname.includes('.') || pathname.startsWith('/favicon.ico') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Apply i18n first
  const intlResponse = intlMiddleware(request);

  // Public routes: allow access without auth
  if (isPublicRoute(pathname)) return intlResponse || NextResponse.next();

  // Protected routes: check JWT
  if (isProtectedRoute(pathname)) {
    const auth = await verifyAuth(request);
    if (!auth.isValid) return redirectToLogin(request);
     const response = intlResponse || NextResponse.next();
      response.headers.set('x-user-id', auth.userId || '');
  response.headers.set('x-user-role', auth.role || '');
  return response;

   
  }

  // Default: continue
  return intlResponse || NextResponse.next();
}

// ---------------------------
// 5️⃣ Config
// ---------------------------
export const config = {
  matcher: [
    // English routes
    '/((?:en|ar)/)?((?:dashboard|users|guests|cards|gates|reports|restaurants|scan-logs|accommodation|settings)/?)',
    // Arabic routes
    '/((?:en|ar)/)?((?:لوحة-التحكم|المستخدمين|الضيوف|البطاقات|البوابات|التقارير|المطاعم|سجلات-المسح|الاسكان|الإعدادات)/?)',
    '/',
    '/login',
    '/تسجيل-الدخول',
    '/forgot-password',
    '/reset-password'
  ],
   runtime: 'nodejs', 
};


