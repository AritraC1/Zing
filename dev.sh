#!/bin/bash
# One-command local dev startup:
#   - starts Postgres in Docker
#   - runs DB migrations
#   - starts the API (nodemon, :3000) and the client (Vite, :5173)
# Docker mode (api + frontend + nginx) remains available via `docker compose up -d`
set -e

# Resolve repo root from the script location (works from any cwd)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Kill background jobs when the script is interrupted (Ctrl+C)
trap 'jobs -p | xargs kill 2>/dev/null' EXIT

# 1. Infra: only Postgres runs in Docker so the LOCAL API can use :3000
#    (--wait blocks until the container passes its healthcheck)
docker compose -f "$ROOT_DIR/docker-compose.yaml" up -d --wait postgres

# Local dev override: the API runs on the host, so it must reach Postgres
# through the published port (5433) instead of the Docker hostname.
# Credentials come from server/.env so Docker mode stays unaffected.
set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/server/.env"
set +a
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5433/${POSTGRES_DB}"

# 2. Dependencies (skipped when node_modules already exists)
if [ ! -d "$ROOT_DIR/server/node_modules" ]; then
  echo "Installing server dependencies..."
  (cd "$ROOT_DIR/server" && npm install)
fi

if [ ! -d "$ROOT_DIR/client/node_modules" ]; then
  echo "Installing client dependencies..."
  (cd "$ROOT_DIR/client" && npm install)
fi

# 3. Database migrations (idempotent, tracked in schema_migrations)
(cd "$ROOT_DIR/server" && npm run migrate)

# 4. Backend — needs server/.env (JWT, DATABASE_URL, firebase key...)
(cd "$ROOT_DIR/server" && npm run dev) &

# 5. Frontend — /api and /socket.io are proxied to :3000 by vite.config.js
(cd "$ROOT_DIR/client" && npm run dev) &

echo ""
echo "Project is running :)"
echo "  Client : http://localhost:5173"
echo "  API    : http://localhost:3000  (health: /health, docs: /api-docs)"
echo "Press Ctrl+C to stop."

# Stay attached until the background servers exit
wait
