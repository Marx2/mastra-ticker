FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/.mastra/output ./

EXPOSE 4111

CMD ["node", "index.mjs"]
