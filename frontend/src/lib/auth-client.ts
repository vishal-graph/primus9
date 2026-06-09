
/**
 * Auth Client — TatvaOps Custom Auth Service
 *
 * Client-side helpers to communicate with services/auth-service.
 * Safe to use in React client components.
 * Does NOT interact with Clerk — runs in parallel.
 */

function trimAuthServiceBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

const AUTH_SERVICE_URL = trimAuthServiceBase(
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'https://auth.primus9.ai',
);

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: string;
  isInternal: boolean;
  internalRole: string | null;
  persona: string | null;
  onboardingCompleted: boolean;
  phoneNumber: string | null;
  locationLat: number | null;
  locationLng: number | null;
  formattedAddress: string | null;
  createdAt: string;
  businessProfile: BusinessProfile | null;
}

export interface BusinessProfile {
  id: string;
  companyName: string | null;
  portfolioLink: string | null;
  monthlyProjectVolume: string | null;
  gstNumber: string | null;
  businessPhone: string | null;
  businessLocationLat: number | null;
  businessLocationLng: number | null;
  businessAddress: string | null;
}

export interface OnboardingData {
  phoneNumber: string;
  whatsappNumber?: string;
  locationLat: number;
  locationLng: number;
  formattedAddress: string;
  pincode: string;
  persona: 'HOMEOWNER' | 'INTERIOR_DESIGNER' | 'REAL_ESTATE_DEVELOPER' | 'CONTRACTOR';
  businessProfile?: {
    companyName?: string;
    portfolioLink?: string;
    monthlyProjectVolume?: '1-3' | '4-10' | '10+';
    gstNumber?: string;
    businessPhone?: string;
    businessLocationLat?: number;
    businessLocationLng?: number;
    businessAddress?: string;
  };
}

/**
 * Redirect browser to Google login
 */
export function loginWithGoogle(): void {
  window.location.href = `${AUTH_SERVICE_URL}/auth/google`;
}

/**
 * Get the current authenticated user from auth-service
 * Reads access token from the tatvaops_token cookie automatically
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? (data.data as AuthUser) : null;
  } catch {
    return null;
  }
}

/**
 * Attempt to silently refresh auth tokens
 * Sends the httpOnly refresh cookie automatically
 */
export async function refreshAuthToken(): Promise<string | null> {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? (data.data.accessToken as string) : null;
  } catch {
    return null;
  }
}

/**
 * Log out from auth-service — revokes refresh token + clears cookies
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${AUTH_SERVICE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Ignore errors — cookies will expire naturally
  }
  window.location.href = '/login';
}

/**
 * Submit onboarding data to auth-service
 */
export async function completeOnboarding(data: OnboardingData): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${AUTH_SERVICE_URL}/onboarding/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Onboarding submission failed');
  }
}

/**
 * Get onboarding status
 */
export async function getOnboardingStatus(): Promise<{
  completed: boolean;
  currentStep: number;
  persona: string | null;
  existing: {
    phoneNumber: string;
    whatsappNumber: string;
    locationLat: number | null;
    locationLng: number | null;
    formattedAddress: string;
    pincode: string;
    businessProfile: {
      companyName: string;
      portfolioLink: string;
      monthlyProjectVolume: string;
      gstNumber: string;
      businessPhone: string;
    };
  };
} | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/onboarding/status`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

/**
 * Read access token from cookie (set by auth-service, readable by JS)
 */
export function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)tatvaops_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Decode JWT `exp` (ms since epoch). No signature verification — scheduling only.
 */
export function getAccessTokenExpiryMs(): number | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const json = atob(b64);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * How long to wait before calling /auth/refresh again.
 * Renews ~90s before JWT expiry; caps wait so 15m tokens never outlive the interval.
 */
export function getMsUntilProactiveRefresh(bufferSec = 90): number {
  const expMs = getAccessTokenExpiryMs();
  const now = Date.now();
  /** If we can't read exp, refresh on a short cadence (works for 15m access tokens) */
  const fallbackMs = 8 * 60 * 1000;

  if (expMs == null) return fallbackMs;

  const untilExpiry = expMs - now;
  const bufferMs = bufferSec * 1000;

  // Expired or imminently expiring — refresh very soon
  if (untilExpiry <= bufferMs) {
    return Math.max(3_000, untilExpiry - 15_000);
  }

  const ideal = untilExpiry - bufferMs;
  /** Never go more than 10m without attempting refresh (clock skew / odd JWTs) */
  const capMs = 10 * 60 * 1000;
  return Math.min(capMs, Math.max(30_000, ideal));
}
