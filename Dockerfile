# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app

# 1. Dependências
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 2. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL=https://propatchbr.bigdevz.com
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Dummy env vars para a compilação
ENV DATABASE_URL="postgresql://propatch_user:propatch_secret_2026@propatch-postgres:5432/propatch_db" \
    AUTH_SECRET="build_secret_key_minimum_32_characters_long_propatch_2026"

RUN npm run build

# 3. Runner de Produção (Standalone)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Cria diretórios para uploads e ISOs locais
RUN mkdir -p /app/storage/patches && chown -R nextjs:nodejs /app/storage

# Copia os artefatos gerados pelo standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
