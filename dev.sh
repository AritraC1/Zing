#!/bin/bash
set -e

ROOT_DIR=$(pwd)

# Start infra
docker compose -f docker-compose.yaml up -d

# Start server (backend)
cd "$ROOT_DIR/server/" && npm run start &

# Start Frontend
cd "$ROOT_DIR/client/" && npm run dev &

cd "$ROOT_DIR"
echo "Project is running :)"