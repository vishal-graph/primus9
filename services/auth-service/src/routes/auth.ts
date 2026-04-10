import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { config } from '../config';
import { buildGoogleAuthUrl, handleGoogleCallback, GoogleUserInfo } from '../lib/google-oauth';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  calcRefreshTokenExpiry,
  getRefreshTokenExpiryMs,
  TokenPayload,
} from '../lib/jwt';
import { verifyToken } from '../middleware/verify-token';

const router = Router();

// ============================================================
// Cookie helpers
// ============================================================

const REFRESH_COOKIE = 'tatvaops_refresh';
const ACCESS_COOKIE = 'tatvaops_token';

/** Omit Domain on localhost — some browsers mishandle Domain=localhost; cookies still work across ports. */
function cookieDomainOpts(): { domain?: string } {
  const d = config.cookieDomain?.trim();
  if (!d || d.toLowerCase() === 'localhost') return {};
  return { domain: d };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProduction = config.nodeEnv === 'production';
  const domainOpts = cookieDomainOpts();
  // Keep cookies for the full refresh window. JWT inside the access cookie still expires
  // per JWT_ACCESS_EXPIRY; APIs must verify exp. Otherwise the browser drops tatvaops_token
  // after 1h while tatvaops_refresh remains → Next middleware sends users to /login on refresh.
  const sessionMaxAge = getRefreshTokenExpiryMs();

  // Access token cookie — readable by JS for Authorization header injection
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: isProduction ? 'lax' : 'lax',
    ...domainOpts,
    maxAge: sessionMaxAge,
    path: '/',
  });

  // Refresh token cookie — httpOnly, NOT readable by JS
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: isProduction ? 'lax' : 'lax',
    ...domainOpts,
    maxAge: sessionMaxAge,
    path: '/',
  });
}

function clearAuthCookies(res: Response): void {
  const domainOpts = cookieDomainOpts();
  res.clearCookie(ACCESS_COOKIE, { path: '/', ...domainOpts });
  res.clearCookie(REFRESH_COOKIE, { path: '/', ...domainOpts });
}

// ============================================================
// Upsert user from Google profile
// ============================================================

async function upsertUserFromGoogle(googleUser: GoogleUserInfo) {
  const internalEmailDomains = config.internalEmailDomains;
  const isInternal = internalEmailDomains.some((d) =>
    googleUser.email.toLowerCase().endsWith(`@${d}`)
  );

  // Try to find by googleId first, then fall back to email (migration path for Clerk users)
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: googleUser.sub }, { email: googleUser.email }],
    },
  });

  if (!user) {
    // New user — create record
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
        googleId: googleUser.sub,
        authProvider: 'google',
        isInternal,
        internalRole: isInternal ? 'employee' : null,
        onboardingCompleted: false,
      },
    });
    logger.info({ userId: user.id, email: user.email, isInternal }, 'New user created via Google OAuth');
  } else if (!user.googleId) {
    // Existing Clerk user re-logging in via Google — link Google ID
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: googleUser.sub,
        authProvider: 'google',
        avatarUrl: user.avatarUrl || googleUser.picture,
        isInternal: user.isInternal || isInternal,
      },
    });
    logger.info({ userId: user.id }, 'Linked Google ID to existing user (Clerk migration)');
  }

  return user;
}

// ============================================================
// ROUTE: GET /auth/google
// Redirect user to Google consent screen
// ============================================================

router.get('/google', (req: Request, res: Response) => {
  const state = req.query.redirect as string | undefined;
  const authUrl = buildGoogleAuthUrl(state);
  logger.debug({ authUrl }, 'Redirecting to Google OAuth');
  res.redirect(authUrl);
});

// ============================================================
// ROUTE: GET /auth/google/callback
// Google redirects here after user consents
// ============================================================

router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, error: oauthError, state } = req.query;

  // Handle user denial
  if (oauthError || !code) {
    logger.warn({ oauthError }, 'Google OAuth callback error or denial');
    return res.redirect(`${config.frontendUrl}/login?error=oauth_denied`);
  }

  try {
    // 1. Exchange code for Google user info
    const googleUser = await handleGoogleCallback(code as string);

    // 2. Upsert user in DB
    const user = await upsertUserFromGoogle(googleUser);

    // 3. Build JWT payload
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.isInternal ? 'admin' : 'user',
      isInternal: user.isInternal,
      onboardingCompleted: user.onboardingCompleted,
    };

    // 4. Issue tokens
    const accessToken = signAccessToken(tokenPayload);
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = calcRefreshTokenExpiry();

    // 5. Store hashed refresh token in DB (revoke old ones for this user on login)
    await prisma.$transaction([
      // Revoke all existing active refresh tokens for this user (single-session model)
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      // Create new refresh token
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          userAgent: req.headers['user-agent'] ?? null,
          ipAddress: req.ip ?? null,
        },
      }),
    ]);

    // 6. Set cookies
    setAuthCookies(res, accessToken, rawRefreshToken);

    logger.info({ userId: user.id, onboardingCompleted: user.onboardingCompleted }, 'User authenticated via Google');

    // 7. Redirect based on onboarding status
    const redirectTo = user.onboardingCompleted
      ? `${config.frontendUrl}/dashboard`
      : `${config.frontendUrl}/onboarding`;

    return res.redirect(redirectTo);
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback failed');
    return res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
});

// ============================================================
// ROUTE: GET /auth/me
// Return current authenticated user
// ============================================================

router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.tokenPayload!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
        isInternal: true,
        internalRole: true,
        persona: true,
        onboardingCompleted: true,
        phoneNumber: true,
        locationLat: true,
        locationLng: true,
        formattedAddress: true,
        createdAt: true,
        businessProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    }

    return res.json({ success: true, data: user });
  } catch (err) {
    logger.error({ err }, '/auth/me error');
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ============================================================
// ROUTE: POST /auth/refresh
// Rotate refresh token and issue new access token
// ============================================================

router.post('/refresh', async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!rawRefreshToken) {
    return res.status(401).json({ success: false, error: { code: 'NO_REFRESH_TOKEN' } });
  }

  try {
    const tokenHash = hashRefreshToken(rawRefreshToken);

    // Find valid refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN' } });
    }

    if (storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      // Possible token theft — revoke all tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revokedAt: new Date() },
      });
      clearAuthCookies(res);
      return res.status(401).json({ success: false, error: { code: 'REFRESH_TOKEN_REUSE_DETECTED' } });
    }

    // Issue new token pair (rotation)
    const { user } = storedToken;
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.isInternal ? 'admin' : 'user',
      isInternal: user.isInternal,
      onboardingCompleted: user.onboardingCompleted,
    };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);
    const expiresAt = calcRefreshTokenExpiry();

    await prisma.$transaction([
      // Revoke old token
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      }),
      // Create new token
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt,
          userAgent: req.headers['user-agent'] ?? null,
          ipAddress: req.ip ?? null,
        },
      }),
    ]);

    setAuthCookies(res, newAccessToken, newRawRefreshToken);
    logger.info({ userId: user.id }, 'Refresh token rotated');

    return res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (err) {
    logger.error({ err }, 'Token refresh failed');
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ============================================================
// ROUTE: POST /auth/logout
// Revoke refresh token and clear cookies
// ============================================================

router.post('/logout', async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

  if (rawRefreshToken) {
    try {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    } catch (err) {
      logger.warn({ err }, 'Error revoking refresh token on logout (safe to ignore)');
    }
  }

  clearAuthCookies(res);
  return res.json({ success: true, data: { message: 'Logged out successfully' } });
});

export { router as authRouter };
