# Zing

Zing is a real-time communication app with a React/Vite frontend and an Express-based backend. It supports authentication, chat, profile management, media sharing, and live socket-based updates.

> Note: At the moment, only the frontend is deployed. The backend is currently intended for local development and future deployment.

![Landing page](client/src/assets/images/landing.png)

## Overview

The project is organized into two main parts:

- **Client:** a React application built with Vite, Redux Toolkit, React Router, Socket.IO client, and Tailwind-based UI components.
- **Server:** an Express API and Socket.IO server backed by PostgreSQL, Redis, JWT authentication, Swagger documentation, and Cloudinary-powered media uploads.

## Key Features

- JWT access and refresh token handling with cookie-based auth
- Real-time one-to-one chat with delivery and read-state updates
- Media upload support via Multer and Cloudinary
- Redux state persistence for a smoother session experience
- API documentation through Swagger
- Secure messaging-related dependencies such as Signal protocol libraries

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
  .github/
    workflows/
      ci.yml
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
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/zing
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FRONTEND_URL=http://localhost:5173
```

### Client

Create a .env file in the client folder with values such as:

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

This starts PostgreSQL, Redis, the backend, and the frontend together.

```bash
docker compose -f docker-compose.yaml up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api-docs

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
npm run dev      # start the Vite dev server
npm run build    # create a production build
npm run lint     # run ESLint
npm run test     # run Vitest tests
```

### Server

```bash
cd server
npm run start    # start the Express server
npm run migrate  # run database migrations
```

## CI/CD

The repository includes a GitHub Actions workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) that validates the project by:

- installing client and server dependencies
- building the client app
- checking Docker image builds for both services

This workflow is a helpful reference for the expected validation steps before opening a pull request.

## API and Real-Time Notes

- API routes are mounted under /api.
- Swagger docs are available at /api-docs on the backend.
- Socket.IO is configured for real-time messaging and uses CORS settings that allow the Vite frontend.
- Authentication tokens are attached through Axios interceptors and socket auth middleware.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Install dependencies and run the app locally.
4. Make your changes and verify the relevant flows.
5. Open a pull request with a clear summary.

---