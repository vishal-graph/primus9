# Android TWA (Bubblewrap) — TatvaOps Vision

This folder documents how to produce a **Play Store–ready** Trusted Web Activity wrapper. Generated Gradle projects and keystores should **not** be committed until your team’s policy allows it.

**Primus9 production TWA (manifest + APK steps):**  
[`TWA_BUILD.md`](./TWA_BUILD.md) — uses committed [`twa-manifest.json`](./twa-manifest.json) for **app.primus9.ai** / **com.tatvaops.vision**.

**Full runbook (deploy, cookies, CORS, asset links, device tests, Play prep):**  
[`../docs/DEPLOYMENT_AND_TWA_RELEASE.md`](../docs/DEPLOYMENT_AND_TWA_RELEASE.md)

## Prerequisites

- Node.js + npm
- JDK 17+ (recommended for current Android tooling)
- Android SDK (via Android Studio) and `ANDROID_HOME` set
- Bubblewrap CLI: `npm i -g @bubblewrap/cli`

## 1. Deploy the web app (HTTPS)

Production must serve:

- `https://YOUR_DOMAIN/manifest.webmanifest`
- `https://YOUR_DOMAIN/.well-known/assetlinks.json` (valid JSON, **no** trailing garbage)
- `https://YOUR_DOMAIN/sw.js` and `offline.html` (public, not behind auth middleware)

Update `frontend/public/.well-known/assetlinks.json`:

- `package_name` — must match the Android application ID (e.g. `com.tatvaops.vision`).
- `sha256_cert_fingerprints` — use the **upload key** SHA-256 from Bubblewrap / your keystore, or **Play App Signing** certificate as required by your signing model.

## 2. Initialize Bubblewrap

From this directory (or an empty folder):

```bash
bubblewrap init --manifest=https://YOUR_DOMAIN/manifest.webmanifest
```

Configure:

- **Application ID** — same as `assetlinks.json` `package_name`
- **Launcher name** — user-visible title
- **Launcher icon** — use the repo’s `frontend/public/icons/icon-512.png` (or a maskable variant)
- **Splash screen** — background color = manifest `theme_color` / `#0a0a0f` for visual continuity
- **Start URL** — typically `/` (must stay within manifest `scope`)

## 3. Deep links (intent filters)

During `init`, Bubblewrap configures **Digital Asset Links** verification. Ensure:

- TWA **host** matches your production domain
- Intent filters cover the paths you need (often full site under `https://yourdomain/`)

Re-run **Google Digital Asset Links** verification after each signing cert change.

## 4. Build

```bash
bubblewrap build
```

Prefer **AAB** for Play Console upload; keep a signed **APK** for internal QA.

## 5. Versioning

- Bump **Android `versionCode`** / **`versionName`** on every Play upload.
- Web app updates ship independently; bump the service worker cache key in `frontend/public/sw.js` (`tatvaops-vision-v…`) when you need clients to drop stale caches.

## 6. Verification failure (fallback)

If asset links fail, Chrome may show **browser UI** or fail verification.

- **Preferred resilience**: ship a controlled **WebView fallback** build for internal testing only, or fix hosting + `assetlinks.json` before production.
- **Minimum**: show a dedicated **error screen** with support links — never a blank screen.

## 7. Crash monitoring (optional)

For native crashes, consider **Firebase Crashlytics** in the Android project. Web errors can be tracked separately (e.g. GA4 + logging).

## Commands reference

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://YOUR_DOMAIN/manifest.webmanifest
bubblewrap build
```

Replace `YOUR_DOMAIN` with your final production host.
