FROM node:20-alpine AS base

# ── Stage 1: install all dependencies ─────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: build Next.js ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: minimal production runner ────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public                                    ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone    ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static        ./.next/static

# Kuromoji: standalone tracer misses binary .dat dictionary files
# Must copy the full module explicitly so Japanese tokenization works at runtime
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/kuromoji ./node_modules/kuromoji

# Drizzle migrations (SQL files applied at startup via entrypoint)
COPY --from=builder --chown=nextjs:nodejs /app/drizzle              ./drizzle

# Migration script
COPY --chown=nextjs:nodejs scripts/migrate.mjs                      ./scripts/migrate.mjs

# Entrypoint (runs migrations then starts server)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
