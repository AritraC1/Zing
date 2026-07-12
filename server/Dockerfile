# SERVER DOCKERFILE

FROM node:20-slim

WORKDIR /app

COPY --chown=node:node package*.json ./

# --omit=dev: This excludes development dependencies, reducing image size.
RUN npm ci --omit=dev

COPY --chown=node:node . .

USER node

EXPOSE 3000

# Run migrations before starting the API
CMD ["sh", "-c", "npm run migrate && npm start"]