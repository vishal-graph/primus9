import { NextRequest, NextResponse } from 'next/server';

/**
 * TatvaOps Vision — Next.js Middleware
 *
 * Replaces clerkMiddleware. Checks for `tatvaops_token` or `tatvaops_refresh` cookie.
 * Does NOT verify JWT signature here (edge runtime can't use jsonwebtoken easily).
 * Actual verification happens on the auth-service side via Bearer token on each API call.
 * 
 * Route protection rules:
 * - /login, /onboarding  → public (no redirect)
 * - /sign-in, /sign-up   → redirect to /login (Clerk routes killed)
 * - /krsna/*             → admin only (checked by backend, not here)
 * - everything else      → redirect to /login if no session cookies (access or refresh)
 */

const PUBLIC_PATHS = [
  '/login',
  '/onboarding',
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/manifest.webmanifest',
  '/sw.js',
  '/offline.html',
  '/.well-known',
  '/icons',
  '/health',
  '/api/health',
  '/api/webhook',   // Razorpay / other inbound webhooks (no auth needed)
];

// Legacy Clerk routes — redirect to new login
const LEGACY_AUTH_PATHS = ['/sign-in', '/sign-up'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Redirect old Clerk sign-in/sign-up to new login
  if (LEGACY_AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Public paths — let through
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('tatvaops_token')?.value;
  const refresh = req.cookies.get('tatvaops_refresh')?.value;

  // Allow refresh-only (e.g. access cookie expired and was removed by older deployments)
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
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files in /public/
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
