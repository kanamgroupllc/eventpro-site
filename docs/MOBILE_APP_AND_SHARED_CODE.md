# Mobile App & Shared Code

This doc describes how the EventPro mobile app is implemented in parallel with the web app while reusing most of the code.

## Options considered

| Approach | Reuse | Pros | Cons |
|----------|--------|------|------|
| **Capacitor** | 100% (same codebase) | One codebase, one deployment; web app runs inside native shell | WebView-based; camera/QR and native UX are limited |
| **Shared package + Expo** | Types + API + logic | True native app; one source of truth for types and API; mobile can use native camera/QR | Two UI codebases (web + React Native) |

**Chosen: Shared package + Expo.** We want a real mobile app (e.g. Check-in with native camera) and to evolve web and mobile in parallel with a single source of truth for API and types.

---

## Repo layout

```
eventpro-site/
├── packages/
│   └── eventpro-shared/          # Shared types + API client factory
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types.ts          # All API/types (single source of truth)
│           └── createApiClient.ts # createEventProApi(config) → auth, events, check-in, …
├── eventpro-frontend/            # Existing Vite + React web app
│   └── (imports types + optional API from @eventpro/shared)
├── eventpro-mobile/              # Expo (React Native) app
│   └── (imports @eventpro/shared; uses native camera, navigation, etc.)
├── backend/                      # Unchanged
└── package.json                  # npm workspaces (optional) or file: refs
```

---

## Shared package (`@eventpro/shared`)

- **types** – All DTOs and enums (User, Event, CheckInResult, ApiResponse, …). Web and mobile import from here.
- **createApiClient(config)** – Builds an API client that works in both environments:
  - **Web:** pass `baseURL`, `getToken`/`setToken`/`removeToken` from `localStorage`, `onUnauthorized` → redirect to `/login`.
  - **Mobile:** pass `baseURL` (e.g. from env), token from `expo-secure-store` or `AsyncStorage`, `onUnauthorized` → navigate to login screen.

The shared client exposes only the methods each app needs (mobile starts with auth + organizer events + check-in; web keeps using its full `api.ts` or gradually migrates).

---

## Web app (eventpro-frontend)

- **Option A (minimal change):** Keep existing `src/types/api.ts` and `src/lib/api.ts`. Add dependency on `@eventpro/shared` and use it only for types (e.g. re-export types from shared so both apps stay in sync when you add new fields).
- **Option B (full reuse):** Refactor so the web app uses `createApiClient()` from shared with a web-specific config (localStorage, baseURL from Vite env). Then `src/lib/api.ts` becomes a thin wrapper that calls the shared client.

Start with **Option A** so the mobile app can ship without touching the web app much; move to Option B when you want a single API implementation.

---

## Mobile app (eventpro-mobile)

- **Stack:** Expo (React Native), TypeScript.
- **Screens (MVP):** Login, Organizer event list, Check-in (camera QR scan + manual ticket ID). Uses native camera for QR via `expo-camera` or `expo-barcode-scanner`.
- **Auth:** Token stored in `expo-secure-store`; shared API client uses it for requests; on 401 clear token and show login.
- **API base URL:** From `app.config.js` extra or `.env` (e.g. `EXPO_PUBLIC_API_URL`). For local dev, use your machine’s IP (e.g. `http://192.168.1.x:8080`) so the device can reach the backend.

---

## Running both in parallel

1. **Backend:** Run as today (e.g. `make up` or Gradle; ensure it listens on `0.0.0.0` or your LAN IP for mobile).
2. **Web:** `cd eventpro-frontend && npm run dev`.
3. **Mobile:** `cd eventpro-mobile && npx expo start`. Use Expo Go on a device or a simulator; set `EXPO_PUBLIC_API_URL` to `http://<your-ip>:8080` for device testing.
4. **Shared:** After editing `packages/eventpro-shared`, run `npm run build` (if it has a build step) or rely on TypeScript project references; web and mobile will pick up changes when you reinstall or rebuild.

---

## Adding new API methods for mobile

1. Add the method to the shared `createApiClient` return type and implementation (using the same axios instance and config).
2. Use the new method in the mobile app.
3. (Optional) Expose it in the web app’s `api.ts` by calling the shared client or by adding the same call in the web’s wrapper.

---

## Checklist

- [x] Root `package.json` with workspaces (`packages/*`, `eventpro-frontend`, `eventpro-mobile`).
- [x] `packages/eventpro-shared` with types + `createApiClient` (login, getCurrentUser, getOrganizerEvents, checkInTicket).
- [x] `eventpro-frontend` depends on `@eventpro/shared` (optional: migrate types/API imports later).
- [x] `eventpro-mobile` (Expo) depends on `@eventpro/shared`; Login, Event list, Check-in screens.
- [x] README in `eventpro-mobile` for `EXPO_PUBLIC_API_URL` and run instructions.
