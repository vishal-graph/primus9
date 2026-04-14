import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness for the Next.js UI (load balancers / uptime monitors).
 * Does not call backend or auth.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'tatvaops-vision-frontend',
    timestamp: new Date().toISOString(),
  });
}
