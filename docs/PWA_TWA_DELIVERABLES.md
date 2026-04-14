# PWA + TWA implementation — deliverables summary

## Final file structure (high level)

| Path | Purpose |
|------|---------|
| `frontend/public/manifest.webmanifest` | Web app manifest (installability, TWA input) |
| `frontend/public/sw.js` | Service worker: precache, network-first navigations, offline fallback, push placeholders |
| `frontend/public/offline.html` | Offline fallback page |
| `frontend/public/icons/*.png` | Launcher icons (generated via `npm run pwa:icons`) |
| `frontend/public/.well-known/assetlinks.json` | Digital Asset Links (replace SHA-256 placeholder) |
| `frontend/scripts/generate-pwa-icons.mjs` | Icon generator (sharp) |
| `frontend/src/app/not-found.tsx` | App Router 404 UI |
| `frontend/src/app/loading.tsx` | Global route loading UI |
| `frontend/src/app/(app)/loading.tsx` | Authenticated shell loading |
| `frontend/src/app/(app)/dashboard/loading.tsx` | Dashboard skeletons |
| `frontend/src/app/(app)/project/[slug]/[stage]/loading.tsx` | Project workspace skeleton |
| `frontend/src/components/ServiceWorkerRegister.tsx` | Registers `/sw.js`, reload on new SW |
| `frontend/src/components/PwaInstallPrompt.tsx` | `beforeinstallprompt` install CTA |
| `frontend/src/components/WebAnalytics.tsx` | Optional GA4 (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) |
| `frontend/src/lib/fetch-with-resilience.ts` | Timeout + retry helper |
| `frontend/src/lib/geolocation-errors.ts` | Permission / error copy |
| `frontend/next.config.mjs` | CSP + security headers |
| `services/auth-service/src/routes/auth.ts` | `SameSite=None` + `Secure` cookies in production |
| `backend/src/config/index.ts` | `JWT_SECRET` in validated config |
| `backend/src/middleware/auth.ts` | `jwt.verify` with issuer/audience |
| `android-twa/README.md` | Bubblewrap / Play steps |
| `docs/DEPLOYMENT_AND_TWA_RELEASE.md` | Production deploy, cookies, CORS, asset links, Bubblewrap, device QA |
| `docs/PLAY_STORE_REVIEW_JUSTIFICATION.md` | Store review positioning |
| `services/auth-service/.env.production.example` | Production cookie + CORS template |

## Commands used

```bash
cd tatvaops-vision/frontend
node scripts/generate-pwa-icons.mjs   # or: npm run pwa:icons
npm run build
npm run lint
```

Bubblewrap (on a machine with Android SDK):

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://YOUR_DOMAIN/manifest.webmanifest
bubblewrap build
```

## APK / AAB output

Artifacts are produced **locally** by Bubblewrap under the directory you initialized (not committed here). Upload the **AAB** to Play Console; use **APK** for device QA.

## Issues found and fixes

1. **`assetlinks.json` was invalid** — contained non-JSON trailing content. Replaced with valid JSON and a clear SHA-256 placeholder.
2. **Middleware blocked PWA/TWA static assets** — `/manifest.webmanifest`, `/sw.js`, `/.well-known`, `/icons`, `/offline.html` are now public.
3. **Auth cookies used `SameSite=Lax` in production** — insufficient for cross-site credentialed refresh; production now uses **`SameSite=None`** when `NODE_ENV=production` and `COOKIE_SECURE=true`.
4. **Backend trusted `jwt.decode`** — switched to **`jwt.verify`** with the same issuer/audience as auth-service; **`JWT_SECRET`** is required in backend config (matches `.env.example`).
5. **Large project stage bundle** — stage panels are **`next/dynamic`** imports with skeleton placeholders.

## Validation checklist (real Android device)

- [ ] Install PWA (Chrome menu + custom install snackbar when supported)
- [ ] Install Bubblewrap APK/AAB — TWA fullscreen, no Chrome UI when verified
- [ ] `/.well-known/assetlinks.json` passes Digital Asset Links Tool
- [ ] Login survives background / reopen (cookies + refresh)
- [ ] Deep link opens in app
- [ ] Airplane mode → offline page or graceful errors
- [ ] Lighthouse: PWA + performance targets on production URL
