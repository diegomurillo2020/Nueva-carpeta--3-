# =============================================================================
# backend/Dockerfile – Multi-stage build
# Node 22 LTS (required by @supabase/supabase-js >= 2.112)
# Prisma binaryTarget = linux-musl-openssl-3.0.x (matches Alpine 3.20+ OpenSSL 3)
# =============================================================================

# ---- Base ---------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app
# curl for healthcheck, openssl for Prisma engine compatibility
RUN apk add --no-cache curl openssl
COPY package*.json ./
RUN npm ci --ignore-scripts

# ---- Development (hot-reload) -------------------------------------------
FROM base AS development
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ---- Builder ------------------------------------------------------------
FROM base AS builder
COPY . .
RUN npx prisma generate && npm run build

# ---- Production ---------------------------------------------------------
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
