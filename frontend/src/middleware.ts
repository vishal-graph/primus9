import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Clerk Middleware Configuration
 * Protects routes and handles authentication
 * Special handling for admin routes (/krsna)
 */

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/krsna(.*)',
]);

/**
 * Check if email is a TatvaOps admin email
 */
function isTatvaOpsEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@tatvaops.com');
}

export default clerkMiddleware(async (auth, request) => {
  const { userId } = auth();

  // Handle admin routes
  if (isAdminRoute(request)) {
    // Must be authenticated
    if (!userId) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect_url', request.url);
      signInUrl.searchParams.set('error', 'admin_auth_required');
      return NextResponse.redirect(signInUrl);
    }

    // Check if user has @tatvaops.com email
    try {
      const user = await clerkClient.users.getUser(userId);
      const primaryEmail = user.emailAddresses.find(
        (email) => email.id === user.primaryEmailAddressId
      );
      const userEmail = primaryEmail?.emailAddress || null;

      if (!isTatvaOpsEmail(userEmail)) {
        // Redirect to sign-in with error message
        const signInUrl = new URL('/sign-in', request.url);
        signInUrl.searchParams.set('error', 'admin_access_denied');
        return NextResponse.redirect(signInUrl);
      }

      // User is authorized admin, continue
      return NextResponse.next();
    } catch (error) {
      console.error('Error checking admin access:', error);
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('error', 'admin_check_failed');
      return NextResponse.redirect(signInUrl);
    }
  }

  // Handle regular protected routes
  if (!isPublicRoute(request)) {
    if (!userId) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect_url', request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
