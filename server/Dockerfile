# SERVER DOCKERFILE

# ---------- Stage 1: dependencies ----------
# mediasoup compiles its worker from source when no prebuilt binary exists for
# the platform (e.g. linux/arm64), which needs Python 3 + a C/C++ toolchain.
# These live only in the builder stage — the runtime image stays slim.
FROM node:20-slim AS deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip build-essential \
    && rm -rf /var/lib/apt/lists/*

# Debian's PEP 668 (externally-managed Python) blocks pip installs that
# mediasoup's build scripts rely on; this opt-out flag is the supported way.
ENV PIP_BREAK_SYSTEM_PACKAGES=1

WORKDIR /app

COPY package*.json ./

# --omit=dev: This excludes development dependencies, reducing image size.
RUN npm ci --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node package*.json ./
COPY --chown=node:node . .

USER node

EXPOSE 3000

# Run migrations before starting the API
CMD ["sh", "-c", "npm run migrate && npm start"]
