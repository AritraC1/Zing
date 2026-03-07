# Zing

**Zing** is a real‑time communication platform built with a modern React/Vite frontend and a Node‑powered Express backend.

The application supports user authentication, text chat, audio/video calling, file sharing, notifications and more. The codebase is split into two main folders (`client/` and `server/`) to keep the frontend and backend concerns separated while still working together in a single repository.


## 🚀 Features

- **Authentication** – QR‑based login for the web client, JWT tokens, and phone integration.
- **Chat** – One‑to‑one and group conversations with message history.
- **Calls** – Audio and video calling via WebRTC and Socket.IO signaling.
- **Media & Files** – Upload/serve files through the API.
- **Notifications** – Real‑time push and in‑app alerts.
- **Modular server architecture** – Each domain (auth, chat, call, user, etc.) has its own controllers, services, models and routes.
- **Swagger API documentation** – available at `/api-docs` when the server is running.


## 🧱 Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 19, Vite, Tailwind CSS, Redux     |
| Backend   | Node.js, Express 5, PostgreSQL, Redis, Socket.IO |
| API Docs  | Swagger (swagger-jsdoc & swagger-ui-express) |
| Auth      | JWT, bcrypt                              |
| Utilities | Axios, UUID, Multer                      |


## 📁 Repository Structure

```
/README.md             # this file
/client                 # React/Vite web client
  /public              # static assets
  /src
    /core             # config, API helpers, routing
    /features         # feature folders: auth, chat, calls, etc.
    /shared           # shared components, hooks, utils
    /store            # Redux store configuration
/server                # Express API server
  /config             # swagger, environment helpers
  /middlewares        # express middleware
  /modules            # grouped by domain (auth, chat, call ...)
  /sockets            # socket.io event handlers
  index.js            # entry point
  package.json        # server deps & scripts
```

> **Note:** Many of the `server/modules/*` subdirectories are scaffolds and may need implementation. This README is written to help onboard developers and to serve as a starting point.


## 🛠 Prerequisites

- Node.js 18+ (v20 recommended)
- npm or yarn
- PostgreSQL (or configure a different database in the server code)
- Redis (for session/notification storage)


## 💻 Development

### 1. Install dependencies

```bash
# from repository root
cd client && npm install
cd ../server && npm install
```

### 2. Start the backend

```bash
# open a terminal in /server
npm run start   # uses nodemon for live reload
# or for a simple launch: npm run dev
```

Swagger docs will be available at `http://localhost:<PORT>/api-docs`.

### 3. Start the frontend

```bash
# in a separate terminal, from /client
npm run dev
```

The Vite dev server defaults to `http://localhost:5173` and will proxy API calls to the server if configured.


## ✅ Production Build

- **Frontend**: `cd client && npm run build` – outputs static files in `client/dist`.
- **Backend**: use any Node process manager (PM2, Docker, etc.) to run `node index.js` with the proper environment.

Deployment steps depend on your infrastructure; the code is framework‑agnostic.


## 📝 Contributing

1. Fork the repo and create a feature branch (`feature/foo`).
2. Implement your changes with clear commits and comments.
3. Run linting (`client/npm run lint`) and add tests if applicable.
4. Open a pull request describing the work and linking any relevant issues.

---
