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
  '/api/admin',
];

// API routes with public GET but protected POST
const publicGetApiRoutes = [
  '/api/settings',
];

// Routes that require moderator role
const moderatorRoutes = ['/moderate'];

// Routes that require admin role
const adminRoutes = ['/admin'];

// Helper to get user info from cookie
function getUserFromCookie(request: NextRequest): { is_admin?: boolean; is_moderator?: boolean } | null {
  const userCookie = request.cookies.get('530_user')?.value;
  if (!userCookie) return null;
  try {
    return JSON.parse(decodeURIComponent(userCookie));
  } catch {
    return null;
  }
}

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

  // For public GET API routes, allow GET without auth but require auth for POST
  if (publicGetApiRoutes.some(route => pathname.startsWith(route))) {
    if (request.method === 'GET') {
      return NextResponse.next();
    }
    // POST requires auth - fall through to protected API route logic
  }

  // For API routes, check auth and return 401 if not authenticated
  if (protectedApiRoutes.some(route => pathname.startsWith(route)) ||
      publicGetApiRoutes.some(route => pathname.startsWith(route))) {
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

  // Check role-based access for admin routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    const user = getUserFromCookie(request);
    if (!user?.is_admin) {
      // Redirect non-admins to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Check role-based access for moderator routes
  if (moderatorRoutes.some(route => pathname.startsWith(route))) {
    const user = getUserFromCookie(request);
    // Admins can also access moderator routes (hierarchical)
    if (!user?.is_moderator && !user?.is_admin) {
      // Redirect non-moderators to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
