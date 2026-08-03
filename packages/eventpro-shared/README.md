# @eventpro/shared

Shared types and API client for EventPro web and mobile. Single source of truth for API contracts and DTOs.

## Build

```bash
cd packages/eventpro-shared
npm install
npm run build
```

Output is in `dist/`. Consuming apps (eventpro-frontend, eventpro-mobile) depend on this package via the repo workspaces.

## Usage

**Web (Vite):** Use your existing `api.ts` and `types/api.ts`; optionally migrate to import types from `@eventpro/shared` and use `createEventProApi()` with a web config (localStorage, baseURL from `import.meta.env`).

**Mobile (Expo):**

```ts
import { createEventProApi } from "@eventpro/shared";
import * as SecureStore from "expo-secure-store";

const api = createEventProApi({
  baseURL: "http://YOUR_IP:8080",
  getAccessToken: () => SecureStore.getItemAsync("accessToken"),
  setAccessToken: (t) => SecureStore.setItemAsync("accessToken", t),
  removeAccessToken: () => SecureStore.deleteItemAsync("accessToken"),
  onUnauthorized: () => { /* navigate to login */ },
});

const user = await api.getCurrentUser();
const events = await api.getOrganizerEvents();
const result = await api.checkInTicket(ticketId);
```

## Adding endpoints

1. Add the method to `createApiClient.ts` (and to `EventProApi` interface).
2. Use it from the mobile app (and optionally from the web app’s `api.ts` wrapper).
