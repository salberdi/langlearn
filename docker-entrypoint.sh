#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
node scripts/migrate.mjs

echo "[entrypoint] Starting server..."
exec "$@"
