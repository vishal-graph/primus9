import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

// ============================================================
// JWT Token Payload Structure
// ============================================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  isInternal: boolean;
  onboardingCompleted: boolean;
}

export interface DecodedToken extends TokenPayload, JwtPayload {}

// ============================================================
// Access Token — lifetime from JWT_ACCESS_EXPIRY (e.g. 15m, 1h)
// ============================================================

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwtAccessExpiry as SignOptions['expiresIn'],
    issuer: 'tatvaops-auth-service',
    audience: 'tatvaops-apps',
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwtSecret, {
    issuer: 'tatvaops-auth-service',
    audience: 'tatvaops-apps',
  }) as DecodedToken;
}

// ============================================================
// Refresh Token — long-lived random bytes (NOT a JWT)
// We store a SHA-256 hash in DB; the raw token is sent in cookie
// ============================================================

export function generateRefreshToken(): string {
  // 64 bytes = 128 hex chars — cryptographically secure
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Access token JWT lifetime in milliseconds (JWT `exp` claim).
 * Do not use for browser cookie maxAge on the access cookie — use {@link getRefreshTokenExpiryMs}
 * so the cookie is not deleted while the refresh session is still valid.
 */
export function getAccessExpiryMs(): number {
  const raw = config.jwtAccessExpiry;
  const match = raw.match(/^(\d+)(d|h|m)$/);
  if (!match) return 60 * 60 * 1000; // fallback 1h
  const value = parseInt(match[1], 10);
  const unit = match[2] as 'd' | 'h' | 'm';
  const ms =
    unit === 'd' ? value * 86_400_000
    : unit === 'h' ? value * 3_600_000
    : value * 60_000;
  return ms;
}

function parseRefreshExpiryMs(raw: string): number {
  const match = raw.match(/^(\d+)(d|h|m)$/);
  if (!match) throw new Error(`Invalid JWT_REFRESH_EXPIRY format: ${raw}`);
  const value = parseInt(match[1], 10);
  const unit = match[2] as 'd' | 'h' | 'm';
  return unit === 'd' ? value * 86_400_000
    : unit === 'h' ? value * 3_600_000
    : value * 60_000;
}

/** Refresh session length — use for auth cookie maxAge (access + refresh). */
export function getRefreshTokenExpiryMs(): number {
  return parseRefreshExpiryMs(config.jwtRefreshExpiry);
}

export function calcRefreshTokenExpiry(): Date {
  return new Date(Date.now() + parseRefreshExpiryMs(config.jwtRefreshExpiry));
}
