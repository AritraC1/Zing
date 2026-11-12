# Zing

Zing is a real-time communication app with a React/Vite frontend and an Express-based backend. It supports Firebase phone authentication, chat with delivery and read receipts, profile management, media sharing, and live socket-based updates.

> Note: At the moment, only the frontend is deployed. The backend is currently intended for local development and future deployment.

![Landing page](client/src/assets/images/landing.png)

## Overview

The project is organized into two main parts:

- **Client (`client/`):** a React application built with Vite, Redux Toolkit, React Router, Redux Persist, and a Socket.IO client, styled with Tailwind CSS.
- **Server (`server/`):** an Express 5 API and Socket.IO server backed by PostgreSQL, JWT auth (with DB-backed refresh sessions), Swagger documentation, and Cloudinary-powered media uploads.

## Features

- Firebase phone (OTP) authentication; server issues JWT access + refresh cookies
- Real-time one-to-one chat via Socket.IO with delivery and read-state updates
- Message history with WhatsApp-style pagination (newest page first, scroll up for older), clientMsgId-based dedupe/idempotency, and an offline IndexedDB message cache that survives reloads
- Media upload support via Multer and Cloudinary
- Web Push (FCM) notifications: offline devices are woken for new messages, with per-conversation mute respected server-side. Payloads are content-free — no sender name or message preview ever leaves the server to FCM
- Per-user conversation actions: archive and mute notifications (synced across devices), block/unblock, voice/video call from the contact pane
- Group chats (up to 10 members): create with picked contacts, rename, add/remove members (creator-managed), group unread counts, and per-member `admin`/`member` roles
- Group audio/video calls (up to 5 participants) routed through a mediasoup SFU with simulcast, incoming-call ringing, participant tiles, and call history
- Redux state persistence for a smoother session experience
- Account deletion with full session revocation
- Landing page, onboarding, profile setup, settings, and archived chats UI

> 1:1 audio and video calling is available via WebRTC (peer-to-peer media with Socket.IO signaling, call history persisted in the `calls` table). Group calls (up to 5 participants) use mediasoup as an SFU in-process (`server/sfu/`) with a `group_calls` history table; media is encrypted in transit via DTLS-SRTP.

## Future Work
- [ ] Implement end-to-end encryption (E2EE) for 1:1 and group chats
- [ ] Voice messages (enum value exists, no recording UI), message search
- [ ] Multi-device QR linking (VITE_QRVALUE env var exists but unused), no history sync
- [ ] SFU join tokens (membership checked directly on socket), screen share, 1:1→group call upgrade
- [ ] Envelope queue (no envelopes table, no msg:send/ack events) — offline delivery replays plaintext rows instead
- [ ] TURN — STUN-only; no /ice-servers endpoint, no coturn in compose


## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, Redux Toolkit, Redux Persist, Socket.IO Client |
| Backend | Node.js, Express 5, Socket.IO, PostgreSQL, Swagger |
| Auth & Security | Firebase phone auth, JWT, bcrypt/httpOnly cookies, DB-backed sessions & devices |
| Calling | WebRTC (P2P audio/video, STUN), mediasoup SFU (group calls up to 5), Socket.IO signaling, call history |
| Media & Utilities | Cloudinary, Multer, Axios, Zod |
| Scaling (optional) | Redis — Socket.IO adapter, presence with TTL, distributed rate limiting (in-process fallback when unset) |

> Redis is used in the code when `REDIS_URL` is configured: it backs the Socket.IO pub/sub adapter (fan-out across multiple server instances), the presence registry (TTL-based online keys), and distributed rate limiting. When it is unset — or unreachable — every consumer degrades gracefully to in-process behavior, so single-instance deployments and tests run unchanged.

## Repository Structure

```text
/
  README.md
  dev.sh                      # one-command local startup helper
  docker-compose.yaml         # postgres + redis + api + frontend
  .github/workflows/ci.yml    # CI: install, build client, build docker images
  client/
    src/
      app/                    # app-level initializers
      core/                   # axios instance, env config, routes, socket provider
      features/               # auth, chat, users, profile, landing, calls
      shared/                 # mappers, UI utilities, shared pages
      store/                  # redux store + root reducer
  server/
    index.js                  # HTTP + Socket.IO entry point
    config/                   # env, db, swagger, firebase admin
    routes/allRoutes.js       # mounts module routers under /api
    middlewares/              # auth, error, multer, rate limit, socket auth
    modules/                  # auth, chat, messages, media, users, devices, sessions, calls, groups
    sfu/                      # mediasoup worker + per-room routers (group calls)
    shared/                   # db migrations + SQL schemas, validation, utils
```

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm
- Docker and Docker Compose (for local infrastructure), or a local PostgreSQL instance

## Environment Variables

Reference `.env.example` in each folder — copy it to `.env` and fill in the values.

### Server

Create `server/.env` (start from `server/.env.example`):

```env
PORT=3000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/zing
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
# REDIS_URL=redis://localhost:6379
```

Also place your Firebase Admin service account key at `server/config/firebase/serviceAccountKey.json` — the Firebase admin SDK is initialized from it, and the `config/firebase` folder is git-ignored so credentials never land in Git.

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
VITE_FIREBASE_VAPID_KEY=your-web-push-certificate-key
```

`VITE_FIREBASE_VAPID_KEY` enables Web Push notifications — generate it in the Firebase console under Project settings → Cloud Messaging → Web Push certificates. Without it the app works normally but never registers for push. The Firebase Messaging service worker (`client/public/firebase-messaging-sw.js`) is generated automatically from these env vars by `npm run dev`/`npm run build` (see `client/scripts/`).

## Running the Project

### Option 1: Docker Compose

This starts PostgreSQL, Redis, the backend, and the frontend together.

```bash
docker compose -f docker-compose.yaml up --build
```

- Frontend: http://localhost:80
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api-docs

> The backend container expects `DATABASE_URL` to point at the `postgres` host (see `server/.env.example`).

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
npm run start
```

5. Start the frontend (new terminal)

```bash
cd client
npm run dev
```

You can also use the helper script, which boots Docker infra plus both apps:

```bash
./dev.sh
```

## Available Scripts

### Client

```bash
cd client
npm run dev      # start the Vite dev server
npm run build    # create a production build
npm run lint     # run ESLint
npm run test     # run Vitest tests
npm run preview  # preview the production build
```

### Server

```bash
cd server
npm run start    # start the Express + Socket.IO server
npm run migrate  # run database migrations (idempotent, tracked in schema_migrations)
```

> Tests exist for both apps: server Jest suites (`npm test`) and client Vitest suites (`npm run test`), both mocked and DB-free.

## CI/CD

The repository includes a GitHub Actions workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) that validates the project by:

- installing client and server dependencies
- running client Vitest tests (`npm run test`) and building the client app
- running server Jest tests (`npm test`, no database required — mocks)
- checking Docker image builds for both services

This workflow is a helpful reference for the expected validation steps before opening a pull request.

## API and Real-Time Notes

- API routes are mounted under `/api` (auth, users, chats, groups, media, calls, blocks, notifications).
- Swagger docs are generated from JSDoc annotations in `server/docs/` and served at `/api-docs`.
- Socket.IO is configured for real-time messaging and uses CORS settings that allow the Vite frontend and Docker origins.
- Authentication tokens are attached through Axios interceptors and socket auth middleware; refresh tokens are verified against hashed DB sessions.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Install dependencies and run the app locally.
4. Make your changes and verify the relevant flows.
5. Open a pull request with a clear summary.

---
