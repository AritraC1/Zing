FROM node:20-slim

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

USER node

EXPOSE 3000

CMD ["npm", "start"]