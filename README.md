# Zing

Zing is a real-time communication platform with a React/Vite frontend and an Express-based backend. The app includes authentication, live chat, media sharing, and real-time socket events for a modern messaging experience.

![Landing page](client/src/assets/images/landing.png)

## Overview

The repository is split into two main parts:

- Client: a React application with Redux Toolkit, Socket.IO client, routing, and UI for auth, chat, calls, profile, and user discovery.
- Server: an Express API plus Socket.IO server backed by PostgreSQL, Redis, JWT auth, Swagger docs, and media uploads.

## Key Features

- JWT access/refresh token handling with cookie-based auth
- Real-time one-to-one chat with socket-driven delivery/read states
- Media upload support through Multer and Cloudinary
- Redux state management with persistence for session-aware UI
- Swagger API documentation for backend endpoints
- Signal-compatible crypto dependencies for secure messaging workflows

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, Redux Toolkit, Redux Persist, Socket.IO Client |
| Backend | Node.js, Express 5, Socket.IO, PostgreSQL, Redis, Swagger |
| Auth & Security | JWT, bcrypt, cookie auth, Firebase integration |
| Media & Utilities | Cloudinary, Multer, Axios, UUID, Zod |

## Repository Structure

```text
/
  README.md
  dev.sh
  docker-compose.yaml
  client/
    package.json
    src/
      app/
      core/
      features/
      shared/
      store/
  server/
    package.json
    index.js
    config/
    middlewares/
    modules/
    shared/
```

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm
- PostgreSQL
- Redis
- Docker and Docker Compose (optional, for local infrastructure)

## Environment Variables

### Server

Create a .env file in the server folder with values such as:

```env
PORT=5001
DATABASE_URL=postgres://user:password@localhost:5432/zing
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Client

Create a .env file in the client folder with values such as:

```env
VITE_BASE_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
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

This starts PostgreSQL, Redis, the backend, and the frontend together.

```bash
docker compose -f docker-compose.yaml up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- Swagger: http://localhost:5001/api-docs

### Option 2: Local Development

1. Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

2. Start infrastructure services

If you are not using Docker, make sure PostgreSQL and Redis are running locally.

3. Start the backend

```bash
cd server
npm run start
```

4. Start the frontend

```bash
cd client
npm run dev
```

You can also use the helper script:

```bash
./dev.sh
```

## Available Scripts

### Client

```bash
cd client
npm run dev      # start Vite dev server
npm run build    # create production build
npm run lint     # run ESLint
npm run test     # run Vitest tests
```

### Server

```bash
cd server
npm run start    # start the Express server
npm run migrate  # run database migrations
```

## API and Real-Time Notes

- API routes are mounted under /api.
- Swagger documentation is available at /api-docs on the backend.
- Socket.IO is configured for real-time messaging and uses CORS for the Vite frontend.
- Authentication tokens are attached through Axios interceptors and socket auth middleware.

---