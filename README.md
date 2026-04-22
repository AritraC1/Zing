# Zing

**Zing** is a real-time communication application with a React/Vite frontend and an Express backend.

![Landing page](client/src/assets/images/landing.png)

The repository is split into two apps:
- `client/` — React frontend with Redux, Socket.IO client, and UI for auth, chat, calls, profile, and users.
- `server/` — Express API server with PostgreSQL, Redis, JWT authentication, Swagger docs, and Socket.IO server logic.

## 🚀 Key Features

- **Authentication** — JWT-based auth with refresh support, phone-based onboarding, and profile updates.
- **Real-time chat** — one-to-one chat with live socket messaging and history fetching.
- **Socket.IO** — server and client socket integration for message events and real-time updates.
- **API documentation** — Swagger available on the backend.
- **Redux + persistence** — application state is managed with Redux Toolkit and persisted across reloads.
- **File/media support** — server supports file uploads via Multer and Cloudinary integration.

## 🧱 Tech Stack

| Layer       | Technology |
|-------------|------------|
| Frontend    | React 19, Vite, Tailwind CSS, Redux Toolkit, Redux Persist |
| Backend     | Node.js, Express 5, PostgreSQL, Redis, Socket.IO, Swagger |
| Authentication | JWT, cookie auth, refresh tokens, bcrypt |
| Utilities   | Axios, Firebase, Cloudinary, uuid, multer |

## 📁 Repository Structure

```
/README.md
/client
  package.json
  vite.config.js
  public/
  src/
    core/          # config, API clients, routing
    features/      # feature modules: auth, chat, calls, landing, profile, users
    shared/        # shared hooks, components, utils
    store/         # Redux store setup
/server
  package.json
  index.js        # Express + Socket.IO entry point
  config/         # environment, DB, Redis, swagger
  middlewares/    # auth, socket auth, multer, rate limiting
  modules/        # business domains: auth, chat, messages, users, sessions, devices
  shared/         # DB migration, sockets, utilities
```

## 🔧 Environment Variables

### Server (`/server/.env`)

Required values:

- `PORT` — backend port (default: `3000`)
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — JWT access token secret
- `JWT_REFRESH_SECRET` — JWT refresh token secret
- `CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name
- `CLOUDINARY_API_KEY` — Cloudinary API key
- `CLOUDINARY_API_SECRET` — Cloudinary API secret

### Client (`/client/.env`)

Typical values:

- `VITE_BASE_URL` — backend API base URL, e.g. `http://localhost:3000/api`
- `VITE_SOCKET_URL` — Socket.IO server URL, e.g. `http://localhost:3000`
- `VITE_QRVALUE` — QR login value
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

> Note: The client does not include a Vite proxy config, so `VITE_BASE_URL` must be configured if API calls are made from the frontend.

## 🛠 Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm
- PostgreSQL
- Redis

## 💻 Setup and Run

### 1. Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 2. Start the backend

```bash
cd server
npm run start
```

The server listens on `http://localhost:3000` by default and exposes Swagger docs at:

```text
http://localhost:3000/api-docs
```

### 3. Start the frontend

```bash
cd client
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

## ⚙️ Backend Scripts

- `npm run dev` — starts the server with `node index.js`
- `npm run start` — starts the server with `nodemon index.js`
- `npm run migrate` — runs database migrations from `server/shared/db/migration.js`

## ✅ Build

### Frontend

```bash
cd client
npm run build
```

Production artifacts are generated in `client/dist`.

### Backend

Run with your preferred process manager, for example:

```bash
cd server
node index.js
```

## 📌 Notes

- API routes are mounted under `/api` in the server.
- Socket.IO is configured on the backend with CORS allowing `http://localhost:5173`.
- The frontend stores auth state via Redux Persist and uses Axios interceptors to attach the JWT access token.
- The server uses `checkSocketForJwt` middleware to authorize socket connections.

## 🤝 Contributing

1. Fork the repository.
2. Create a descriptive branch name.
3. Install dependencies and run locally.
4. Implement your feature or fix.
5. Submit a pull request with a clear summary.

---
