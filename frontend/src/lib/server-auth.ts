/**
 * Server-side auth helper — replaces Clerk's auth()
 *
 * Reads the tatvaops_token access token from cookies (Next.js server context)
 * and returns an Authorization header ready to use in backend fetch calls.
 *
 * Safe to use in Server Actions ('use server') and Server Components.
 */

import { cookies } from 'next/headers';

interface ServerAuthHeaders {
  Authorization: string;
  [key: string]: string;
}

/**
 * Returns { Authorization: 'Bearer <token>' } or null if not authenticated.
 * Use this in place of Clerk's auth().getToken().
 */
export async function getServerAuthHeaders(): Promise<ServerAuthHeaders | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tatvaops_token')?.value;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
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
