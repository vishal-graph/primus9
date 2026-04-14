# Production deployment, TWA binding, and APK / AAB release

This runbook assumes the **TatvaOps Vision** stack: Next.js frontend (`tatvaops-vision/frontend`), Express API (`tatvaops-vision/backend`), and Express auth service (`tatvaops-vision/services/auth-service`).

Replace placeholders: `YOURDOMAIN`, package id if not `com.tatvaops.vision`, and paths on your machine.

---

## Phase 1 — Deploy all services (HTTPS)

### 1.1 Frontend (Next.js)

1. Deploy to your **canonical HTTPS origin** (e.g. `https://www.YOURDOMAIN.com`).
2. Set environment variables in the hosting provider (e.g. Vercel):
   - `NEXT_PUBLIC_API_URL` — public API base if the browser calls the API directly; otherwise rely on same-origin `/api` rewrites and set `BACKEND_API_URL` for server-side rewrites only.
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` — optional.
   - `NEXT_PUBLIC_PRIVACY_POLICY_URL` / `NEXT_PUBLIC_TERMS_URL` — required for Play and in-app links.
3. Confirm in a browser (logged out):
   - `https://www.YOURDOMAIN.com/manifest.webmanifest`
   - `https://www.YOURDOMAIN.com/sw.js`
   - `https://www.YOURDOMAIN.com/offline.html`
   - `https://www.YOURDOMAIN.com/.well-known/assetlinks.json`  
   These must return **200** without redirecting to `/login` (middleware already allows them).

### 1.2 Backend API

1. Deploy to HTTPS (e.g. `https://api.YOURDOMAIN.com`).
2. Set `JWT_SECRET` to the **same** value as auth-service (backend verifies access tokens).
3. Set `CORS_ORIGINS` to include your **frontend** origin(s).
4. Set `DATABASE_URL`, Redis, S3, and other required vars per `backend/.env.example`.

### 1.3 Auth service

1. Deploy to HTTPS (e.g. `https://auth.YOURDOMAIN.com`).
2. Apply **Phase 2** env vars using `services/auth-service/.env.production.example` as a template.

### 1.4 No localhost in production

Production builds must not use `http://localhost` for user-facing OAuth callbacks, `FRONTEND_URL`, or CORS allowlists.

### 1.5 Health pings (monitoring)

| Layer | URL | Purpose |
|--------|-----|---------|
| **Next.js UI** | `GET /health` | Liveness JSON (`tatvaops-vision-frontend`). Public (middleware allowlist). |
| **Aggregate** | `GET /api/health` | Server-side probes **backend** `GET /health` and **auth** `GET /health`. In production set **`BACKEND_API_URL`** and **`NEXT_PUBLIC_AUTH_SERVICE_URL`** (or **`AUTH_SERVICE_URL`**). Returns **503** if a probe fails or URLs are missing in production. |
| **Backend API** | `GET /health`, `GET /health/ready`, `GET /health/live` | See `backend/src/api/health.ts`. |
| **Auth service** | `GET /health` | JSON liveness in `services/auth-service/src/index.ts`. |

---

## Phase 2 — Auth cookies and CORS (final)

### 2.1 Required auth-service settings

| Variable | Example | Notes |
|----------|---------|--------|
| `NODE_ENV` | `production` | Enables `SameSite=None` path in code when combined with `COOKIE_SECURE`. |
| `COOKIE_SECURE` | `true` | **Required** for `SameSite=None` cookies in browsers. |
| `COOKIE_DOMAIN` | `.YOURDOMAIN.com` | Leading dot; must match hosts that must receive `tatvaops_token` / `tatvaops_refresh`. |
| `CORS_ORIGINS` | `https://www.YOURDOMAIN.com` | Exact origins; include `www` and apex if both are used. |
| `FRONTEND_URL` | `https://www.YOURDOMAIN.com` | Post-login redirect target. |

The service already uses **`credentials: true`** in `services/auth-service/src/index.ts` for CORS.

### 2.2 Validation (manual)

On a **real phone** (Chrome or installed PWA / TWA):

1. Log in → confirm dashboard loads.
2. Hard refresh → still logged in.
3. Force-close browser or app → reopen → still logged in (refresh cookie + `SameSite=None` + correct `Domain`).

If login drops: check `COOKIE_DOMAIN`, `COOKIE_SECURE`, `CORS_ORIGINS`, and that the frontend calls refresh with `credentials: 'include'` (already implemented in `auth-client`).

---

## Phase 3 — Digital Asset Links (TWA)

### 3.1 Package name

Current template in the repo: **`com.tatvaops.vision`** (`frontend/public/.well-known/assetlinks.json`).  
If you change it in Bubblewrap, **update `assetlinks.json` to match**.

### 3.2 SHA-256 fingerprint

You need the **SHA-256** of the signing certificate that signs the APK/AAB you install (upload key, or **Play App Signing** certificate from Play Console if Google re-signs).

**Option A — from your keystore (after Bubblewrap or `keytool` creates it):**

```bash
keytool -list -v -keystore YOUR.keystore -alias YOUR_ALIAS
```

Copy the **SHA256** line (colon-separated hex). For `assetlinks.json`, use **lowercase hex without colons** (64 characters), or Bubblewrap/Google’s tool may accept the standard format; Digital Asset Links tool shows the expected format.

**Option B — Play App Signing:**

In Play Console: **Release → Setup → App signing** → copy **App signing key certificate** SHA-256 if that is what Google documents for your TWA verification path.

### 3.3 Update `assetlinks.json` in the frontend repo

Edit `tatvaops-vision/frontend/public/.well-known/assetlinks.json`:

- Set `sha256_cert_fingerprints` to your **real** value(s). You may list more than one fingerprint (e.g. upload key + Play signing key) during rotation.

Redeploy the frontend so the file is live at:

`https://www.YOURDOMAIN.com/.well-known/assetlinks.json`  
(or your apex domain — **must match** the site origin configured in Bubblewrap for verification.)

### 3.4 Validate

1. [Digital Asset Links API](https://developers.google.com/digital-asset-links/tools/generator) / statement list tester: host + package + fingerprint.
2. `curl -sSI https://www.YOURDOMAIN.com/.well-known/assetlinks.json` — **200**, `content-type` JSON, body is **strict JSON** only.

---

## Phase 4 — TWA build (Bubblewrap)

### 4.1 Prerequisites

- JDK 17+  
- Android SDK (Android Studio) and `ANDROID_HOME`  
- Node.js + npm  
- `npm i -g @bubblewrap/cli` (or use `npx @bubblewrap/cli`)

### 4.2 Initialize (interactive)

From an empty directory (recommended: outside git or under `android-twa/` after adding that folder to `.gitignore` for generated files):

```bash
bubblewrap init --manifest=https://www.YOURDOMAIN.com/manifest.webmanifest
```

Provide:

- **Package name** — final, matches `assetlinks.json`
- **Launcher name**, **icon** (use `frontend/public/icons/icon-512.png` or Play-ready artwork)
- **Theme color** — align with manifest (`#0a0a0f` or your brand)

### 4.3 Build

```bash
bubblewrap build
```

Typical outputs (exact paths depend on where you ran `init`):

| Artifact | Typical use |
|----------|-------------|
| `app-release-signed.apk` (names vary) | Side-load QA on devices |
| `app-release-bundle.aab` (if configured) | **Play Store upload** |

**Record your paths** after each build in the table at the end of this file.

### 4.4 Fullscreen / no Chrome UI

If the address bar or Chrome UI appears:

- Asset Links verification failed → fix `assetlinks.json`, host, package id, fingerprint, and redeploy.
- Wrong `startUrl` / scope in manifest vs Bubblewrap → align with Bubblewrap’s host and path.

---

## Phase 5 — Device testing (mandatory)

Install the **signed APK** on a physical device. Check:

- [ ] Fullscreen (no Chrome toolbar) when verification succeeds  
- [ ] Splash acceptable (Bubblewrap + manifest colors)  
- [ ] Login persists after kill and reopen  
- [ ] In-app navigation and Android **back** stack  
- [ ] Airplane mode → offline page or clear error (service worker + network UI)  
- [ ] No long blank screen (loading UI + SW)  
- [ ] HTTPS app links open in the TWA (after intent filters + verification)

---

## Phase 6 — Play Store prep

Use `docs/PLAY_STORE_REVIEW_JUSTIFICATION.md` for positioning (fullscreen, performance, offline, deep links — not “just a wrapper”).

Prepare:

- Short / full description, screenshots, feature graphic (1024×500), 512×512 icon  
- **Privacy policy URL** (mandatory)  
- Data safety form, permissions text  

---

## Release record (fill in after you ship)

| Item | Your value |
|------|------------|
| **Final frontend URL** | `https://` |
| **Backend API URL** | `https://` |
| **Auth service URL** | `https://` |
| **Android package name** | `com.tatvaops.vision` (or yours) |
| **SHA-256 fingerprint(s) in assetlinks** | |
| **APK path (local CI)** | |
| **AAB path (Play upload)** | |
| **Issues + fixes** | |

---

## What cannot be completed from the repo alone

- Choosing and publishing your **real domain**  
- Generating the **real SHA-256** without your keystore or Play signing cert  
- Running **Bubblewrap build** without JDK + Android SDK  
- **Physical device** verification  

Complete the **Release record** table after your first successful production cut.
