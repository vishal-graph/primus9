# TatvaOps Vision — TWA build for **app.primus9.ai**

This folder contains a committed **`twa-manifest.json`** so you can skip re-entering init answers and use:

`bubblewrap update` → `bubblewrap build`

**Host:** `app.primus9.ai` (no `https://` in `host`)  
**Package:** `com.tatvaops.vision`  
**Manifest URL:** `https://app.primus9.ai/manifest.webmanifest`

---

## Prerequisites

- **Windows workspace path:** Use a **short local folder** for Bubblewrap and Gradle (recommended: **`C:\TatvaOps`**). Avoid **`OneDrive\Documents\...`** for Android builds (sync, long paths, and Gradle daemon stability).
- **Node.js** 18+
- **JDK 17+** (`JAVA_HOME` set)
- **Android SDK** (`ANDROID_HOME` set; install build-tools + platform via Android Studio)
- **Bubblewrap:** `npm i -g @bubblewrap/cli` (or `npx @bubblewrap/cli`)

---

## Phase 1 — One-time keystore (local only)

From **`android-twa/`**, if `./android.keystore` does not exist:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000
```

Match **`alias`** `android` and path **`./android.keystore`** with `twa-manifest.json` → `signingKey`.

**Do not commit** the keystore (see `.gitignore`).

---

## Phase 2 — Sync Android project from manifest

```bash
cd android-twa
bubblewrap update
```

This generates/refreshes the Gradle TWA project from `twa-manifest.json`.

If you prefer a clean interactive init instead (first machine only):

```bash
bubblewrap init --manifest=https://app.primus9.ai/manifest.webmanifest
```

Use the same **package id**, **host**, **icons**, and **theme** as in `twa-manifest.json`, then keep using `update` / `build` as below.

---

## Phase 3 — SHA-256 for Digital Asset Links

### Option A — `keytool` (upload keystore; recommended)

```bash
keytool -list -v -keystore android.keystore -alias android
```

Copy **SHA256** under **Certificate fingerprints**.

### Option A2 — Bubblewrap CLI (if your version provides it)

Some releases expose a fingerprint helper after `init` (see `bubblewrap --help`). If `bubblewrap fingerprint` exists on your install, you can use it; otherwise **`keytool` above is authoritative**.

### Option B — Play App Signing

If Google Play re-signs your app, use the **App signing key certificate** SHA-256 from Play Console for `assetlinks.json` (or include both upload + app-signing fingerprints during rotation).

### Format for `assetlinks.json`

Use **one** 64-character lowercase hex string (no colons), e.g.:

`"sha256_cert_fingerprints": ["abcdef..."]`

Update:

`frontend/public/.well-known/assetlinks.json`

Then **redeploy the frontend** so:

`https://app.primus9.ai/.well-known/assetlinks.json`

returns the new JSON (no login redirect — middleware already allows `/.well-known`).

**Verify:** [Digital Asset Links statement list tester](https://developers.google.com/digital-asset-links/tools/generator)

---

## Phase 4 — Build APK / AAB

```bash
cd android-twa
bubblewrap build
```

Artifacts are written under this project directory (exact filenames depend on Bubblewrap version); typical patterns:

- `app-release-signed.apk` — sideload / QA
- `*.aab` — Play Console when you configure App Bundle output

---

## Phase 5 — Device test (mandatory before Play)

Install the **signed APK** on a physical device:

- [ ] **Fullscreen** — no Chrome address bar (if bar appears → fix asset links / SHA / host mismatch)
- [ ] Splash acceptable (theme `#0a0a0f` aligned with web manifest)
- [ ] Login works and **persists** after force-stop
- [ ] Navigation + Android **back** stack
- [ ] Offline / error UX acceptable

**Do not ship to Play** until fullscreen TWA is confirmed.

---

## Failure checklist

| Symptom | Likely cause |
|--------|----------------|
| Chrome UI / URL bar | `assetlinks.json` wrong, SHA mismatch, or `host` ≠ site origin |
| Blank / wrong origin | `host` in `twa-manifest.json` must be `app.primus9.ai` only |
| Login drops | Cookie / CORS on auth service (separate from TWA) |

---

## Record (fill after first successful build)

| Field | Value |
|--------|--------|
| SHA-256 in production `assetlinks.json` | |
| APK path | |
| AAB path | |
