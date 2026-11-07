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
- Message history with pagination and clientMsgId-based dedupe/idempotency
- Media upload support via Multer and Cloudinary
- Redux state persistence for a smoother session experience
- Account deletion with full session revocation
- Landing page, onboarding, profile setup, settings, and archived chats UI

> Call screens (audio/video) and the Signal/landline libraries are currently UI placeholders — WebRTC calling and end-to-end encryption are not wired up yet.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, Redux Toolkit, Redux Persist, Socket.IO Client |
| Backend | Node.js, Express 5, Socket.IO, PostgreSQL, Swagger |
| Auth & Security | Firebase phone auth, JWT, bcrypt/httpOnly cookies, DB-backed sessions & devices |
| Media & Utilities | Cloudinary, Multer, Axios, Zod |

> Redis appears in the development setup notes but is not currently used in the code — PostgreSQL handles persistence. It is planned for future features such as presence/rate-limiting stores.

## Repository Structure

```text
/
  README.md
  dev.sh                      # one-command local startup helper
  docker-compose.yaml         # postgres + api + frontend
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
    modules/                  # auth, chat, messages, media, users, devices, sessions
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
```

Also place your Firebase Admin service account key at `server/config/firebase/serviceAccountKey.json` — the Firebase admin SDK is initialized from it, and the `config/firebase` folder is git-ignored so credentials never land in Git.

### Client

Create `client/.env` (start from `client/.env.example`):

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

## Running the Project

### Option 1: Docker Compose

This starts PostgreSQL, the backend, and the frontend together.

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

> Tests exist for a few client reducers/mappers (`*.test.js` files under `client/src`). The server currently has no test suite.

## CI/CD

The repository includes a GitHub Actions workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) that validates the project by:

- installing client and server dependencies
- building the client app
- checking Docker image builds for both services

This workflow is a helpful reference for the expected validation steps before opening a pull request.

## API and Real-Time Notes

- API routes are mounted under `/api` (auth, users, chats, media).
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
