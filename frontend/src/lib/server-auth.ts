/**
 * Server-side auth helper — replaces Clerk's auth()
 *
 * Reads the tatvaops_token access token from cookies (Next.js server context)
 * and returns an Authorization header ready to use in backend fetch calls.
 *
 * Safe to use in Server Actions ('use server') and Server Components.
 */

import { cookies } from 'next/headers';

export type ServerAuthHeaders = {
  Authorization?: string;
  'x-user-id'?: string;
};

/**
 * Returns auth headers (Bearer token when present, else x-user-id when bypass cookie is set),
 * or null if neither is available.
 * Use this in place of Clerk's auth().getToken().
 */
export async function getServerAuthHeaders(): Promise<ServerAuthHeaders | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tatvaops_token')?.value;
  if (token) return { Authorization: `Bearer ${token}` };

  const bypass = (process.env.NEXT_PUBLIC_ALLOW_X_USER_ID_BYPASS || '').trim().toLowerCase();
  const allowBypass =
    bypass === '1' || bypass === 'true' || bypass === 'yes' || process.env.NODE_ENV === 'development';

  if (!allowBypass) return null;
  const xUserId = cookieStore.get('x_user_id')?.value;
  if (!xUserId) return null;
  return { 'x-user-id': xUserId };
}

/**
 * Throws a redirect-friendly error if not authenticated.
 * Use at the top of protected server actions.
 */
export async function requireServerAuth(): Promise<ServerAuthHeaders> {
  const headers = await getServerAuthHeaders();
  if (!headers) {
    throw new Error('Not authenticated');
  }
  return headers;
}

/** Build fetch-compatible headers (no undefined values). */
export function asFetchHeaders(headers: ServerAuthHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}
