#!/bin/sh
set -e

MAX_RETRIES=30
RETRY_INTERVAL=2
retries=0

echo "[entrypoint] Running database migrations..."
until node scripts/migrate.mjs; do
  retries=$((retries + 1))
  if [ "$retries" -ge "$MAX_RETRIES" ]; then
    echo "[entrypoint] Migration failed after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "[entrypoint] Database not ready, retrying in ${RETRY_INTERVAL}s... (attempt $retries/$MAX_RETRIES)"
  sleep "$RETRY_INTERVAL"
done

echo "[entrypoint] Starting server..."
exec "$@"
