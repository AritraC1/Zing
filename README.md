# Zing: Real-Time Communication App

Zing is a real-time communication app with a React/Vite frontend and an Express-based backend. It supports Firebase phone authentication, chat with delivery and read receipts, profile management, media sharing, and live socket-based updates.

> Note: At the moment, only the frontend is deployed. The backend is currently intended for local development and future deployment.

![Landing page](client/src/assets/images/landing.png)

## Overview

The project is organized into two main parts:

- **Client (`client/`):** a React application built with Vite, Redux Toolkit, React Router (v7), Redux Persist, and a Socket.IO client, styled with Tailwind CSS 4. It also uses the Firebase JS SDK for phone auth and Web Push, and `mediasoup-client` for group calls.
- **Server (`server/`):** an Express 5 API and Socket.IO server backed by PostgreSQL, JWT auth (with DB-backed refresh sessions), Firebase Admin (FCM) push notifications, Swagger documentation, Cloudinary-powered media uploads, and a mediasoup SFU for group calls.

## Features

- Firebase phone (OTP) authentication; server issues JWT access + refresh cookies
- Real-time one-to-one chat via Socket.IO with delivery and read-state updates
- Message history with WhatsApp-style pagination (newest page first, scroll up for older), `clientMsgId`-based dedupe/idempotency, and an offline IndexedDB message cache that survives reloads
- Message reactions, replies, starring, editing, and delete-for-me/delete-for-everyone
- Media upload support via Multer and Cloudinary
- Web Push notifications via Firebase Cloud Messaging (Admin SDK on the server): offline devices are woken for new messages, with per-conversation mute respected server-side and device push-token registration (`POST /api/notifications`). Payloads are content-free — no sender name or message preview ever leaves the server to FCM
- Per-user conversation actions: archive and mute notifications (synced across devices), block/unblock, voice/video call from the contact pane
- Group chats (up to 10 members): create with picked contacts, rename, add/remove members (creator-managed), group unread counts, and per-member `admin`/`member` roles
- Group audio/video calls (up to 5 participants) routed through a mediasoup SFU with simulcast, incoming-call ringing, participant tiles, and call history
- Redux state persistence (auth + chat slices) for a smoother session experience
- Account deletion with full session revocation
- Landing page, onboarding, profile setup, settings, and archived chats UI

> 1:1 audio and video calling is available via WebRTC (peer-to-peer media with Socket.IO signaling, call history persisted in the `calls` table). Group calls (up to 5 participants) use mediasoup as an SFU in-process (`server/sfu/`) with a `group_calls` history table; media is encrypted in transit via DTLS-SRTP.

## Future Work

- [ ] Complete end-to-end encryption (E2EE) for 1:1 and group chats — Signal Protocol groundwork already exists in the repo (libsignal client dependencies, device/prekey schema), but full E2EE is not wired up yet
- [ ] Voice messages (`voice_note` enum value exists, no recording UI), message search
- [ ] Multi-device QR linking (`VITE_QRVALUE` env var exists but unused), no history sync
- [ ] SFU join tokens (membership checked directly on socket), screen share, 1:1→group call upgrade
- [ ] Envelope queue (no envelopes table, no `msg:send`/ack events) — offline delivery replays plaintext rows instead
- [ ] TURN — STUN-only; no `/ice-servers` endpoint, no coturn in compose

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, Redux Toolkit, Redux Persist, React Router 7, Socket.IO Client, Firebase JS SDK, mediasoup-client |
| Backend | Node.js, Express 5, Socket.IO, PostgreSQL (`pg`), Firebase Admin (FCM), mediasoup, Swagger |
| Auth & Security | Firebase phone auth, JWT, bcrypt/httpOnly cookies, DB-backed sessions & devices |
| Calling | WebRTC (P2P audio/video, STUN), mediasoup SFU (group calls up to 5), Socket.IO signaling, call history |
| Media & Utilities | Cloudinary, Multer, Axios, Zod |
| Scaling (optional) | Redis — Socket.IO adapter, presence with TTL, distributed rate limiting (in-process fallback when unset) |

> Redis is used in the code when `REDIS_URL` is configured: it backs the Socket.IO pub/sub adapter (`@socket.io/redis-adapter`, fan-out across multiple server instances), the presence registry (TTL-based online keys), and distributed rate limiting (`express-rate-limit` + `rate-limit-redis`). When it is unset — or unreachable — every consumer degrades gracefully to in-process behavior, so single-instance deployments and tests run unchanged.

## Repository Structure

```text
/
  README.md
  dev.sh                      # one-command local startup helper
  docker-compose.yaml         # postgres + redis + api + frontend
  .env.example                # combined frontend+backend vars (used by Docker Compose)
  client/
    src/
      app/                    # app-level initializers
      core/                   # axios instance, env config, routes, socket provider
      features/               # auth, calls, chat, landing, notifications, profile, users
      shared/                 # mappers, UI utilities, shared pages
      store/                  # redux store + root reducer
    scripts/                  # generates public/firebase-messaging-sw.js from env vars
  server/
    index.js                  # HTTP + Socket.IO entry point (/health, graceful shutdown)
    core/
      config/                 # env, db, swagger, redis, firebase (Admin SDK)
      database/               # migrations + SQL schemas (tracked in schema_migrations)
      errors/                 # error middleware
      media/                  # multer middleware
      sockets/                # presence registry
      validation/             # zod schemas
    routes/routes.js          # mounts module routers under /api
    modules/                  # auth, blocks, calls, chat, device, groups, media,
                              # messages, notifications, sessions, users
    sfu/                      # mediasoup worker + per-room routers (group calls)
    docs/                     # swagger JSDoc annotations
    utils/                    # jwt, hashing, cookies, cloudinary helpers
```

## Prerequisites

- Node.js 20+ (both Dockerfiles use `node:20-slim`)
- npm
- Docker and Docker Compose (for local infrastructure), or a local PostgreSQL instance

## Environment Variables

Reference `.env.example` in each folder — copy it to `.env` and fill in the values. There is also a combined root `.env.example` used primarily for Docker Compose.

### Server

Create `server/.env` (start from `server/.env.example`):

```env
PORT=3000
FRONTEND_URL=http://localhost:3000

# Postgres credentials — POSTGRES_* are used by docker-compose and dev.sh;
# DATABASE_URL is what the server itself connects with.
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=zing
DATABASE_URL=postgresql://postgres:your_db_password@localhost:5433/zing

JWT_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Group calls (mediasoup SFU) — UDP/TCP media ports opened by the worker
RTC_MIN_PORT=40000
RTC_MAX_PORT=40100
# Public IP advertised in ICE candidates; required when the API runs in
# Docker or behind NAT (docker-compose sets it to the host machine).
# SFU_ANNOUNCED_IP=192.168.1.10

# Optional — enables the Redis layer (Socket.IO fan-out adapter,
# presence with TTL, distributed rate limiting). Leave unset for
# host-machine runs (Docker Compose injects the container-side URL);
# single-instance deployments then use in-process fallbacks.
# REDIS_URL=redis://localhost:6380

# Optional rate-limit tuning (defaults apply when unset)
# RATE_LIMIT_WINDOW_MS=900000
# RATE_LIMIT_MAX=100
```

`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and the `CLOUDINARY_*` vars are required at boot.

Also place your Firebase Admin service account key at `server/core/config/firebase/serviceAccountKey.json` — the Firebase admin SDK is initialized from it (path overridable via `FIREBASE_SERVICE_ACCOUNT_PATH`, and the server boots lazily without it). The `server/core/config/firebase` folder is git-ignored so credentials never land in Git.

### Client

Create `client/.env` (start from `client/.env.example`):

```env
VITE_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
# Not yet in client/.env.example — add this line manually:
VITE_FIREBASE_VAPID_KEY=your-web-push-certificate-key
```

`VITE_FIREBASE_VAPID_KEY` enables Web Push notifications — generate it in the Firebase console under Project settings → Cloud Messaging → Web Push certificates. Without it the app works normally but never registers for push. The Firebase Messaging service worker (`client/public/firebase-messaging-sw.js`) is generated automatically before `npm run dev` / `npm run build` (via the `predev`/`prebuild` hooks in `client/scripts/`).

> Note: the Docker frontend build receives all Firebase env vars (including the VAPID key) from your root `.env` as build args, so push notifications work in Docker too. The Firebase Admin service account key is never baked into the API image — docker-compose mounts `server/core/config/firebase/` from the host at runtime.

## Running the Project

### Option 1: Docker Compose

This starts PostgreSQL, Redis, the backend, and the frontend together.

```bash
docker compose -f docker-compose.yaml up --build
```

- Frontend: http://localhost:80 (nginx proxies `/api/` and `/socket.io/` to the API)
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api-docs
- Health check: http://localhost:3000/health
- Host ports: Postgres is exposed on **5433** and Redis on **6380** (to avoid clashing with local installs); containers reach each other on the compose network as `postgres:5432` / `redis:6379`
- The mediasoup SFU media port range `40000-40100` (UDP + TCP) is mapped on the host

> The backend container overrides `DATABASE_URL` (from `DATABASE_URL_DOCKER` in your root `.env`), `REDIS_URL`, `FRONTEND_URL`, and `SFU_ANNOUNCED_IP` for the compose network (see `docker-compose.yaml`).

### Option 2: Local Development

1. Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

2. Make sure PostgreSQL is running locally and matches `DATABASE_URL`.

3. Run database migrations

```bash
cd server
npm run migrate
```

4. Start the backend

```bash
npm run start        # or: npm run dev (node --watch auto-restart)
```

5. Start the frontend (new terminal)

```bash
cd client
npm run dev
```

You can also use the helper script, which boots Postgres in Docker, installs dependencies, runs migrations, and starts both apps (server `node --watch` + client Vite on http://localhost:5173):

```bash
./dev.sh
```

> `dev.sh` only starts Postgres in Docker — Redis is not required for local development (the server falls back to in-process behavior when `REDIS_URL` is unset).

## Available Scripts

### Client

```bash
cd client
npm run dev          # predev generates the Firebase SW, then starts Vite
npm run build        # prebuild generates the Firebase SW, then builds for production
npm run lint         # run ESLint
npm run test         # run Vitest tests
npm run preview      # preview the production build
npm run generate:sw  # regenerate public/firebase-messaging-sw.js from env vars
```

### Server

```bash
cd server
npm run start        # start the Express + Socket.IO server
npm run dev          # same, with node --watch auto-restart
npm run migrate      # run database migrations (idempotent, tracked in schema_migrations)
npm test             # run Jest suites (no database required — mocks)
npm run test:watch   # Jest in watch mode
```

> Tests exist for both apps: server Jest suites and client Vitest suites, both mocked and DB-free.

## Testing

- **Server:** Jest (`npm test` in `server/`) — modules are mocked; no PostgreSQL or Redis instance needed.
- **Client:** Vitest (`npm run test` in `client/`) — components/hooks tested with mocked sockets, API, and IndexedDB.

Run both suites before opening a pull request; there is currently no CI workflow configured in the repository.

## API and Real-Time Notes

- API routes are mounted under `/api` (auth, users, chats, groups, media, calls, blocks, notifications) — see `server/routes/routes.js`.
- Swagger docs are generated from JSDoc annotations in `server/docs/` (auth, blocks, calls, chat, user) and served at `/api-docs`; the groups and notifications endpoints are not yet documented there.
- `GET /health` returns a simple OK for load balancers / monitoring.
- Socket.IO is configured for real-time messaging and uses CORS settings that allow the Vite frontend and Docker origins.
- Authentication tokens are attached through Axios interceptors (with a refresh-and-retry queue on 401) and socket auth middleware; refresh tokens are verified against hashed DB sessions (`sessions` + `devices` tables).

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Install dependencies and run the app locally.
4. Make your changes and verify the relevant flows (run the test suites).
5. Open a pull request with a clear summary.

---
