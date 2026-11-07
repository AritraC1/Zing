# Zing Client

React 19 + Vite frontend for Zing, a real-time communication app: Firebase phone auth, one-to-one chat with Socket.IO, profile management, media sharing, and a landing page.

## Tech Stack

- React 19, Vite 7, Tailwind CSS 4
- Redux Toolkit + Redux Persist for state and session persistence
- React Router 7 (nested/protected/public route groups)
- Socket.IO client for real-time messaging, presence, and delivery/read receipts
- Axios with request/response interceptors (auth headers + automatic token refresh)
- Firebase JS SDK (phone OTP authentication)
- Vitest for unit tests

## Project Structure

```text
client/
  src/
    app/        AppInitializer — boots session restore and socket connection
    core/
      api/      axios instance, API endpoints
      config/   env vars, API base config, Firebase client config
      routes/   AllRoutes, ProtectedRoutes, PublicRoutes, OnboardingRoutes
      socket/   SocketProvider + context for the shared socket connection
    features/
      auth/     auth page, thunks, hooks, reducer
      chat/     chat pages/components/hooks/store (largest feature)
      users/    add-chat flows, users store
      profile/  profile setup, settings, update profile
      calls/    calls list + audio/video call screens (UI placeholder)
      landing/  marketing landing page sections
    shared/     API mappers, reusable utils, ErrorBoundary, loading page
    store/      redux store, reducer wiring, persistor
```

Feature folders follow a consistent pattern: `api/` (async thunks), `components/`, `pages/`, `hooks/`, `store/`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file (see `.env.example`):

```env
VITE_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_QRVALUE=your-qr-value
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

Notes:
- Use `VITE_BASE_URL=/api` and leave `VITE_SOCKET_URL` empty when running behind Docker/nginx (same-origin proxying).
- These variables are baked in at build time — changing them requires a rebuild.

## Scripts

```bash
npm run dev      # start the Vite dev server (http://localhost:5173)
npm run build    # create a production build
npm run preview  # preview the production build
npm run lint     # run ESLint
npm run test     # run Vitest tests once
```

## Testing

Unit tests live next to the code they cover in `__tests__` folders (e.g. the chat reducer tests and shared API mapper tests). Add tests for new reducers, mappers, and utils as you go — `npm run test` runs everything with Vitest.

## Docker

The `Dockerfile` builds the app and serves it with nginx; the docker build accepts Firebase/API config as build args so the same image can be reused across environments. See the root `docker-compose.yaml` and `nginx.conf` for details.
