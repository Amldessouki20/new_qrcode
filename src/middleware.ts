import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { verifyAccessToken, extractTokenFromHeader } from './lib/jwt';
const rateStore = new Map<string, { count: number; windowStart: number }>();

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
  '/accommodation'
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

function setSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

// ---------------------------
// 4️⃣ Main Middleware
// ---------------------------
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // Skip static files
  if (pathname.startsWith('/_next/') || pathname.includes('.') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Explicitly allow serving local uploads without interception
  if (pathname.startsWith('/uploads')) {
    return NextResponse.next();
  }

  if (isApi) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const windowMs = 60_000;
    const limit = 60;
    const rec = rateStore.get(ip as string);
    if (!rec || now - rec.windowStart >= windowMs) {
      rateStore.set(ip as string, { count: 1, windowStart: now });
    } else {
      rec.count += 1;
      rateStore.set(ip as string, rec);
    }
    const current = rateStore.get(ip as string)!;
    if (current.count > limit) {
      const res = new NextResponse(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
      res.headers.set('Retry-After', Math.ceil(windowMs / 1000).toString());
      res.headers.set('X-RateLimit-Limit', String(limit));
      res.headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - current.count)));
      res.headers.set('X-RateLimit-Reset', String(current.windowStart + windowMs));
      setSecurityHeaders(res);
      return res;
    }
    const res = NextResponse.next();
    setSecurityHeaders(res);
    return res;
  }

  // Apply i18n first
  const intlResponse = intlMiddleware(request);

  // Public routes: allow access without auth
  if (isPublicRoute(pathname)) {
    const response = intlResponse || NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  // Protected routes: check JWT
  if (isProtectedRoute(pathname)) {
    const auth = await verifyAuth(request);
    if (!auth.isValid) return redirectToLogin(request);
    const response = intlResponse || NextResponse.next();
    response.headers.set('x-user-id', auth.userId || '');
    response.headers.set('x-user-role', auth.role || '');
    setSecurityHeaders(response);
    return response;

   
  }

  // Default: continue
  const response = intlResponse || NextResponse.next();
  setSecurityHeaders(response);
  return response;
}

// ---------------------------
// 5️⃣ Config
// ---------------------------
export const config = {
  matcher: [
    // English routes
    '/((?:en|ar)/)?((?:dashboard|users|guests|cards|gates|reports|restaurants|scan-logs|accommodation)/?)',
    // Arabic routes
    '/((?:en|ar)/)?((?:لوحة-التحكم|المستخدمين|الضيوف|البطاقات|البوابات|التقارير|المطاعم|سجلات-المسح|الاسكان|)/?)',
    '/',
    '/login',
    '/تسجيل-الدخول',
    '/forgot-password',
    '/reset-password'
  ],
   runtime: 'nodejs', 
};


