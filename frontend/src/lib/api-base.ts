/**
 * Centralized API Base URL Resolver
 *
 * - Client: NEXT_PUBLIC_API_URL (or localhost:4000 in dev)
 * - Server (Server Actions / RSC): Prefer BACKEND_API_URL when set and normalized.
 *
 * **Dev tip:** If you see `fetch failed` / `httpRedirectFetch` on dashboard load, the Node
 * server often cannot reach direct local backend endpoints in some dev setups (IPv6/Docker). Either set BACKEND_API_URL
 * to `http://127.0.0.1:4000`, or omit it in development so we call this Next app’s origin
 * and use `next.config` rewrites to the backend (`/api/*` → backend).
 */

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Server-side: URL to use for fetch() from Node (Server Actions, route handlers). */
function getServerApiBase(): string {
  const explicit = process.env.BACKEND_API_URL
    ? normalizeBase(process.env.BACKEND_API_URL)
    : '';

  if (explicit) {
    return explicit;
  }

  // Development: call same Next server — rewrites proxy /api/* to the real backend.
  // Avoids broken direct fetches to localhost:4000 from Node (undici / IPv6 / redirects).
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || '3000';
    return `http://127.0.0.1:${port}`;
  }

  // Vercel / serverless: same-deployment URL hits rewrites when BACKEND_API_URL is unset.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  throw new Error(
    'BACKEND_API_URL is required in production (or deploy on Vercel with VERCEL_URL). ' +
      'Example: BACKEND_API_URL=http://127.0.0.1:4000'
  );
}

export function getApiBase(): string {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    return getServerApiBase();
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBase) {
    // Dev: call this Next app; rewrites in next.config.mjs proxy /api/* → backend (see getServerApiBase).
    // Avoid hardcoding :4000 here — keeps browser + Server Actions on the same origin and avoids
    // localhost → ::1 quirks when the backend is only bound to IPv4.
    if (typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const p = port || (protocol === 'https:' ? '443' : '80');
        return `${protocol}//127.0.0.1:${p}`;
      }
    }
    throw new Error(
      'NEXT_PUBLIC_API_URL is required in client runtime. Set it in .env.local or docker-compose.'
    );
  }

  return normalizeBase(apiBase);
}
