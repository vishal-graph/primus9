import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

/**
 * Compatibility route.
 *
 * Some upstream apps deep-link to /upload. Vision's actual entry is /entry.
 * Redirect while preserving query params (e.g. x_user_id bypass).
 */
export default async function UploadRedirectPage() {
  const h = await headers();
  const fullUrl = h.get('x-url') || h.get('referer') || '';

  // Best-effort query preservation.
  if (fullUrl) {
    try {
      const url = new URL(fullUrl);
      const qs = url.searchParams.toString();
      redirect(qs ? `/entry?${qs}` : '/entry');
    } catch {
      // ignore
    }
  }

  redirect('/entry');
}

