# KanamEvents Mobile

Mobile app (Expo / React Native) that mirrors the web app: Discover, Profile, Organizer, Admin. Shares types and API client with the web via `@eventpro/shared`.

## Local development

### 1. Install and build shared package

From the **repo root**:

```bash
npm install
cd packages/eventpro-shared && npm run build && cd ../..
```

### 2. Environment variables

Copy the example env file and adjust for your setup:

```bash
cp eventpro-mobile/.env.example eventpro-mobile/.env
```

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL |
| `EXPO_PUBLIC_WEB_URL` | Web app URL (Stripe checkout opens here in the browser) |

**Local URLs**

- **iOS Simulator:** `http://localhost:8080` / `http://localhost:5173`
- **Android Emulator:** `http://10.0.2.2:8080` / `http://10.0.2.2:5173`
- **Physical device (Expo Go):** use your **Mac’s LAN IP**, not `localhost`. Phone and Mac must be on the same Wi‑Fi.

After changing `.env`, restart Expo: `npx expo start --clear`.

### 3. Start backend + app

```bash
# Terminal 1 — API (repo root)
# … start Spring Boot on :8080

# Terminal 2 — mobile
cd eventpro-mobile
npx expo start
```

Press **`i`** (iOS Simulator), **`a`** (Android Emulator), or scan the QR code with **Expo Go**.

### 4. Quick smoke test

1. Login / sign up with the same credentials as web.
2. Browse events → add tickets → checkout (opens web Stripe in browser).
3. **Organizer:** Check-in with QR scanner or ticket UUID.
4. **Profile:** Order history / wallet shows ticket QR from backend.

---

## Deploy for testers (EAS)

Use [Expo Application Services (EAS)](https://docs.expo.dev/eas/) to ship installable builds. **Expo Go is fine for dev; testers should get a standalone build** pointing at a shared staging API (not localhost).

### Prerequisites

- [Expo account](https://expo.dev/signup) (free tier works for early testing)
- **Staging API + web** deployed and reachable over HTTPS
- **Apple Developer Program** ($99/yr) for iOS TestFlight
- **Google Play Console** ($25 one-time) for Play internal testing (optional; Android APK link works without Play)

### One-time setup

```bash
npm install -g eas-cli
eas login
cd eventpro-mobile
eas init          # links project on expo.dev; adds projectId to app config
```

### Configure staging / production URLs

Edit **`eas.json`** → `build.preview.env` and `build.production.env`:

```json
"preview": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://staging-api.yourdomain.com",
    "EXPO_PUBLIC_WEB_URL": "https://staging.yourdomain.com"
  }
}
```

Replace `yourdomain.com` with your real staging hostnames. These values are **baked in at build time** — changing them requires a new build (or [EAS Update](https://docs.expo.dev/eas-update/introduction/) for JS-only changes later).

Optional: store URLs as [EAS environment variables](https://docs.expo.dev/eas/environment-variables/) instead of committing them:

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://staging-api.yourdomain.com --environment preview
```

Update `eas.json` submit section with your Apple Team ID before TestFlight submit.

### Build for internal testers

```bash
cd eventpro-mobile

# Both platforms (recommended first run)
npm run build:preview

# Or one platform at a time
npm run build:preview:ios
npm run build:preview:android
```

EAS prints a **build dashboard URL**. When complete:

- **Android:** download the **APK** from the build page and share the link (or sideload).
- **iOS:** download the `.ipa` for registered devices, or submit to TestFlight (below).

### iOS — TestFlight

```bash
# After preview/production iOS build succeeds
eas submit --platform ios --profile production
```

Then in [App Store Connect](https://appstoreconnect.apple.com):

1. Open **TestFlight** → your app → **Internal Testing** (instant, up to 100 Apple IDs on your team) or **External Testing** (wider audience; short Beta App Review).
2. Add testers by email. They install via the **TestFlight** app.

### Android — internal testing

**Option A — fastest:** share the **APK download link** from the EAS build page.

**Option B — Play Console:** upload the AAB from a production-profile build, create an **Internal testing** release, share the opt-in link.

```bash
npm run build:production   # AAB for Play Store
npm run submit:android
```

### EAS profiles (this repo)

| Profile | Use | Distribution |
|---------|-----|--------------|
| `development` | Dev client + local API | Internal |
| `preview` | **Tester builds** → staging API | Internal (APK / ad hoc) |
| `production` | App Store / Play release | Store |

---

## Tester onboarding

Send testers this checklist after inviting them to TestFlight or sharing an Android APK.

### Before they install

- [ ] Staging web and API are up (`EXPO_PUBLIC_*` URLs in the build match your deployment).
- [ ] They have a **test account** (or can sign up on staging).
- [ ] Stripe **test mode** is enabled on staging if testing payments.

### Install

| Platform | Steps |
|----------|--------|
| **iOS** | Install **TestFlight** from the App Store → accept email invite → install **KanamEvents** |
| **Android** | Open the **APK link** from your team → allow “Install unknown apps” if prompted → install |

### What to test

1. **Sign up / log in** — same backend as web.
2. **Discover** — list events, open detail, select tickets or seats.
3. **Checkout** — cart, tax state, reservation timer; pay via browser (Stripe).
4. **My tickets / Wallet** — QR code displays after purchase.
5. **Organizer check-in** — scan ticket QR or enter ticket UUID.
6. **Admin** (if applicable) — verification queue, stats.

### Reporting issues

Ask testers to include:

- Device model + OS version
- Build number (Profile → About, or TestFlight build #)
- Steps to reproduce
- Screenshot / screen recording for UI bugs

### Known limitations (beta)

- **Payments** open the **web checkout** in the device browser (native Stripe SDK not yet integrated).
- **`EXPO_PUBLIC_*` URLs** are fixed per build; confirm testers use a build pointed at staging, not localhost.

---

## Features

- **Auth** — Login, sign up, forgot password; JWT in SecureStore.
- **Discover** — Events, ticket/seat selection, cart, checkout (web Stripe).
- **Profile** — Profile, settings, order history, wallet with QR tickets.
- **Organizer** — Dashboard, events, check-in (camera QR + manual UUID).
- **Admin** — Overview, users, verification.

## Shared code

- **Types & API:** `@eventpro/shared` (`packages/eventpro-shared`). Add endpoints in `createApiClient.ts` once; use in web and mobile.
- See also: `docs/MOBILE_APP_AND_SHARED_CODE.md`, `docs/MOBILE_FEATURE_PARITY.md`.
