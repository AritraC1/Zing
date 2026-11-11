# Zing Server

Express 5 + Socket.IO backend for Zing: Firebase phone auth with JWT cookies, one-to-one chat with delivery/read receipts, reactions/replies/starred messages, contact blocking, media uploads, and Swagger docs.

## Tech Stack

- Node.js, Express 5, Socket.IO 4
- PostgreSQL (raw SQL with a small repo/service pattern, no ORM)
- Redis (optional) for the Socket.IO pub/sub adapter, presence with TTL, and distributed rate limiting — degrades to in-process behavior when `REDIS_URL` is unset
- JWT access + refresh tokens (httpOnly cookies), DB-backed hashed refresh sessions
- Firebase Admin SDK for verifying OTP id tokens
- Cloudinary + Multer for media uploads
- Zod for request validation, Swagger for API docs
- express-rate-limit on auth endpoints (Redis-backed store when available)

## Project Structure

```text
server/
  index.js                  # app + HTTP server + Socket.IO bootstrap, CORS
  config/
    db.js                   # pg pool
    env.js                  # validates required env vars at startup
    swagger.js              # OpenAPI spec
    firebase.js             # Firebase Admin init from serviceAccountKey.json
  routes/allRoutes.js       # mounts auth/users/chats/media under /api
  middlewares/              # auth (JWT), socket auth, error handler, multer, rate limit
  modules/
    auth/                   # OTP verify, token refresh, logout, account deletion
    users/                  # profile endpoints
    chat/                   # conversations, participants, access checks, socket events
    messages/               # message persistence + status (delivered/seen)
    media/                  # upload endpoints
    devices/ sessions/      # device registry & refresh token sessions
  shared/
    db/ migrations/ + schemas/   # SQL bootstrap schemas + idempotent migration runner
    validation/                  # zod schemas
    utils/                       # jwt, hashing, cookies, cloudinary, transactions
    sockets/index.js             # socket wiring entry
```

Layering: `routes → controller → (service) → repo → db`. Repos use parameterized SQL only — never concatenate user input into queries.

## Database Migrations

```bash
npm run migrate
```

- Runs SQL files from `shared/db/migrations/` in sorted order.
- Bootstrap migration (`001_bootstrap.sql`) applies all files from `shared/db/schemas/`.
- Applied files are tracked in a `schema_migrations` table, so it is safe to re-run.
- To add a migration, add `002_<name>.sql` to the migrations folder.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file (see `.env.example`):

```env
PORT=3000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/zing
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

`REDIS_URL` is optional. When set, Socket.IO room fan-out is cluster-wide
(via the Redis adapter), the presence registry lives in Redis with a TTL
(so a crashed node's users go offline instead of ghost-online), and the
auth rate limiter counts across all instances. When unset, everything
falls back to the in-process implementations unchanged.

3. Place your Firebase Admin service account key at `config/firebase/serviceAccountKey.json` (this folder is git-ignored). The app exits on startup if required env vars are missing.

4. Run migrations, then start:

```bash
npm run migrate
npm run start
```

## Pages (Docker note)

When running through Docker, `DATABASE_URL` must point at the `postgres` container host. See the root `docker-compose.yaml`.

## Socket Events

- Client → server: `fetch_messages`, `send_message` (supports `replyToId` for replies/quoting), `react_to_message`, `star_message`, `edit_message`, `delete_message`, `typing`, `message_delivered`, `mark_read`, `presence_snapshot`
- Server → client: `message_history`, `message_sent`, `new_message`, `message_delivered`, `messages_read`, `message_edited`, `message_deleted`, `message_reaction_updated`, `message_starred`, `message_unstarred`, `typing_update`, `presence_update`, `chat_archived`, `error`

All events require an authenticated socket (JWT verified in the handshake middleware) and conversation-participant access checks. Blocks are enforced on messaging AND calls (`call:ring` rejects blocked pairs). Typing indicators are cleaned up server-side: an idle timer force-clears stale "typing…" and disconnects flush all of a user's typing sessions.

## Scripts

```bash
npm run start    # start the Express + Socket.IO server (http://localhost:3000)
npm run migrate  # run database migrations
```

---