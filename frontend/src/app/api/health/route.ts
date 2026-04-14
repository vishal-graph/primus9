import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PROBE_TIMEOUT_MS = 5_000;

type ProbeResult =
  | { status: 'ok'; httpStatus: number; body: unknown }
  | { status: 'error'; httpStatus?: number; message: string }
  | { status: 'skipped'; message: string };

function trimBase(url: string | undefined): string | undefined {
  const t = url?.trim();
  if (!t) return undefined;
  return t.replace(/\/+$/, '');
}

function backendHealthUrl(): string | undefined {
  const b = trimBase(process.env.BACKEND_API_URL);
  if (b) return `${b}/health`;
  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:4000/health';
  }
  return undefined;
}

function authHealthUrl(): string | undefined {
  const a = trimBase(process.env.AUTH_SERVICE_URL) || trimBase(process.env.NEXT_PUBLIC_AUTH_SERVICE_URL);
  if (a) return `${a}/health`;
  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:4500/health';
  }
  return undefined;
}

async function probe(url: string | undefined): Promise<ProbeResult> {
  if (!url) {
    return {
      status: 'skipped',
      message: 'URL not configured (set BACKEND_API_URL or AUTH_SERVICE_URL / NEXT_PUBLIC_AUTH_SERVICE_URL)',
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    if (!res.ok) {
      return { status: 'error', httpStatus: res.status, message: `HTTP ${res.status}` };
    }
    return { status: 'ok', httpStatus: res.status, body };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', message: msg };
  }
}

/**
 * Aggregated health: backend API `GET /health`, auth-service `GET /health`.
 * The Next.js UI is considered up if this handler returns.
 *
 * - Production: set `BACKEND_API_URL` and `NEXT_PUBLIC_AUTH_SERVICE_URL` (or `AUTH_SERVICE_URL`).
 * - Development: defaults probe `http://127.0.0.1:4000/health` and `http://127.0.0.1:4500/health`.
 */
export async function GET() {
  const backendUrl = backendHealthUrl();
  const authUrl = authHealthUrl();
  const [backend, auth] = await Promise.all([probe(backendUrl), probe(authUrl)]);

  const isProd = process.env.NODE_ENV === 'production';
  const failed =
    backend.status === 'error' ||
    auth.status === 'error' ||
    (isProd && backend.status === 'skipped') ||
    (isProd && auth.status === 'skipped');

  return NextResponse.json(
    {
      status: failed ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      ui: { status: 'ok', service: 'tatvaops-vision-frontend' },
      probes: {
        backend: { url: backendUrl ?? null, ...backend },
        auth: { url: authUrl ?? null, ...auth },
      },
    },
    { status: failed ? 503 : 200 }
  );
}
