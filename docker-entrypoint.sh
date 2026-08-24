#!/bin/sh
set -e

echo "[entrypoint] Starting DukaanOS container..."

if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "[entrypoint] SKIP_MIGRATIONS=true, skipping database migrations."
else
  echo "[entrypoint] Running Prisma migrations..."
  npx prisma migrate deploy || {
    echo "[entrypoint] Migration failed. Check DATABASE_URL and database status."
    exit 1
  }
  echo "[entrypoint] Migrations applied successfully."
fi

echo "[entrypoint] Starting application server..."
exec node server.js
