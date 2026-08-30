# syntax=docker/dockerfile:1
# =============================================================================
# frontend/Dockerfile – Next.js Multi-stage build
# Node 22 LTS (required by @supabase/supabase-js >= 2.112)
# =============================================================================

FROM node:22-alpine AS base
WORKDIR /app

# ---- Development (hot-reload with volume mount) --------------------------
FROM base AS development
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- Builder -------------------------------------------------------------
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production ----------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
