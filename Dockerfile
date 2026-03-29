FROM node:20-alpine AS base

# ── Stage 1: production dependencies only ─────────────────────────────────────
FROM base AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: all dependencies (dev included, needed for build) ────────────────
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 3: build Next.js ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 4: minimal production runner ────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public                                  ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone  ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static      ./.next/static

# All production node_modules — standalone traces only what server.js needs,
# but migrate.mjs and kuromoji need the full runtime dependency tree
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules    ./node_modules

# Drizzle migrations (SQL files + meta/_journal.json)
COPY --from=builder --chown=nextjs:nodejs /app/drizzle           ./drizzle

# Migration script
COPY --chown=nextjs:nodejs scripts/migrate.mjs                   ./scripts/migrate.mjs

# AWS RDS root CA bundle for SSL verification
RUN mkdir -p /app/certs && \
    wget -O /app/certs/global-bundle.pem \
    https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Entrypoint (runs migrations then starts server)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
