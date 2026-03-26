import { config } from '../config';
import { logger } from './logger';

// ============================================================
// Google OAuth 2.0 — Manual implementation (no Passport)
// Uses the standard googleapis URL builder + token exchange
// ============================================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleUserInfo {
  sub: string;        // Google user ID (stable unique identifier)
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;    // Profile picture URL
}

/**
 * Build the Google OAuth consent screen URL
 * User is redirected here from GET /auth/google
 */
export function buildGoogleAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleCallbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',  // Always show account picker
    ...(state ? { state } : {}),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 * Called in GET /auth/google/callback
 */
async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  id_token: string;
}> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleCallbackUrl,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ error }, 'Google token exchange failed');
    throw new Error(`Google token exchange failed: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    id_token: string;
  }>;
}

/**
 * Fetch Google user profile using the access token
 */
async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  return response.json() as Promise<GoogleUserInfo>;
}

/**
 * Full Google OAuth callback flow:
 * 1. Exchange code → access token
 * 2. Fetch user profile
 * Returns the GoogleUserInfo
 */
export async function handleGoogleCallback(code: string): Promise<GoogleUserInfo> {
  logger.debug('Exchanging Google authorization code');
  const tokens = await exchangeCodeForTokens(code);
  logger.debug('Fetching Google user info');
  const userInfo = await fetchGoogleUserInfo(tokens.access_token);

  if (!userInfo.email_verified) {
    throw new Error('Google account email is not verified');
  }

  return userInfo;
}
