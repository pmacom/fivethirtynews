import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/api/auth/discord',
  '/api/auth/discord/callback',
  '/api/auth/session',
  '/api/auth/logout',
  '/api/auth/verify', // For extension auth
];

// API routes that require authentication (add more as needed)
const protectedApiRoutes = [
  '/api/content',
  '/api/posts',
  '/api/channels',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('530_session')?.value;

  // For API routes, check auth and return 401 if not authenticated
  if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
    // Also check Authorization header for extension/API clients
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '')
      : null;

    if (!sessionToken && !bearerToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    // Token validation happens in the API route itself
    return NextResponse.next();
  }

  // For page routes, redirect to login if not authenticated
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
