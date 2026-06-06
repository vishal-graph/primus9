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

function allowXUserIdBypass(): boolean {
  // NOTE: temporary integration escape hatch.
  // Default ON unless explicitly disabled.
  const raw = (process.env.NEXT_PUBLIC_ALLOW_X_USER_ID_BYPASS || '').trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  return true;
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

  // Temporary integration mode: allow session-less access when upstream provides x_user_id
  // (e.g. another app deep-links into Vision and we forward x-user-id to the backend).
  if (allowXUserIdBypass()) {
    const urlUserId = req.nextUrl.searchParams.get('x_user_id')?.trim();
    const cookieUserId = req.cookies.get('x_user_id')?.value?.trim();
    const userId = urlUserId || cookieUserId || '';

    if (userId) {
      const res = NextResponse.next();
      // Persist for subsequent navigations so user doesn't need query param everywhere.
      if (urlUserId && urlUserId !== cookieUserId) {
        res.cookies.set('x_user_id', urlUserId, {
          httpOnly: false,
          sameSite: 'lax',
          secure: req.nextUrl.protocol === 'https:',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
      return res;
    }
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
