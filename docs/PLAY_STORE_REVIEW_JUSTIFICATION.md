# Play Store review justification (TWA / PWA)

Use this text internally and in **Store listing → App description** / **review responses** if Google asks why the app exists alongside the website.

## Positioning (short)

**TatvaOps Vision** is a **mobile-optimized, installable experience** that delivers **full-screen immersive UI**, **faster repeat access** from the home screen, **offline-tolerant navigation** via a service worker, and **deep links** that open directly in the installed app. It is not a generic browser shortcut: users get a **standalone** shell, **splash-aligned branding**, and **device-appropriate** flows (permissions, resilient networking, session handling).

## Bullets for reviewers

- **Immersive UI**: `display: standalone` / TWA fullscreen — no browser chrome during normal use.
- **Performance**: Code-split heavy workspace stages; cached static assets; reduced cold navigation cost vs loading the full site in a tab each time.
- **Offline / resilience**: Service worker with offline fallback page; network timeouts and retries on API calls.
- **Deep integration**: Digital Asset Links, app links, geolocation-aware onboarding, file uploads for floor plans, payments (Razorpay) where applicable.
- **Trust & safety**: Security headers (including CSP), JWT verification on the API, cookie attributes suitable for production HTTPS.

## If challenged as “just a website”

Clarify that the Play listing is the **Trusted Web Activity** distribution of the same **verified origin**, with **asset links** proving app–site association, and that the product value is **distribution and UX** (install icon, task switcher, back stack, fullscreen, update strategy), equivalent to many approved **WebView/TWA** catalog apps that wrap a first-party PWA.

## Manual QA gate (required before release)

Validate on **real Android devices**: cold start / splash, back navigation, login persistence, deep links, offline fallback, payments, and that **no Chrome UI** appears in verified TWA mode.
