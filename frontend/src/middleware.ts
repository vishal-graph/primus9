import { NextRequest, NextResponse } from 'next/server';

/**
 * TatvaOps Vision — Next.js Middleware
 *
 * Replaces clerkMiddleware. Checks for `tatvaops_token` or `tatvaops_refresh` cookie.
 * Does NOT verify JWT signature here (edge runtime can't use jsonwebtoken easily).
 * Actual verification happens on the auth-service side via Bearer token on each API call.
 *
 * PWA / TWA critical paths MUST bypass auth first — never redirect to /login.
 */

// Legacy Clerk routes — redirect to new login
const LEGACY_AUTH_PATHS = ['/sign-in', '/sign-up'];

/**
 * Public routes: PWA install, TWA Digital Asset Links, service worker, health probes, etc.
 * Checked before any cookie logic so they are never redirected to /login.
 */
function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/icons')) return true;
  if (pathname.startsWith('/.well-known')) return true;
  if (pathname.startsWith('/api/webhook')) return true;

  if (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/')
  ) {
    return true;
  }

  if (
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/offline.html' ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png' ||
    pathname === '/health' ||
    pathname === '/api/health'
  ) {
    return true;
  }

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Redirect old Clerk sign-in/sign-up to new login
  if (LEGACY_AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // PWA / TWA / static / webhooks — never require session cookies
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('tatvaops_token')?.value;
  const refresh = req.cookies.get('tatvaops_refresh')?.value;

  if (!token && !refresh) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Skip middleware for immutable Next assets, optimized images, favicon,
     * common static image extensions, and .webmanifest (PWA) so install/TWA probes
     * never hit auth by accident.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)',
  ],
};
