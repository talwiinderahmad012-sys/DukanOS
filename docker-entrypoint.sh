#!/bin/sh
set -e

# DukaanOS Docker entrypoint
# Applies pending database migrations before starting the server.
# This is safe to run on every startup — prisma migrate deploy is idempotent.

echo "=== DukaanOS Container Starting ==="

# Run database migrations (unless explicitly skipped)
if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
  echo "SKIP_MIGRATIONS=true — skipping database migrations"
else
  echo "Applying database migrations..."
  prisma migrate deploy
  echo "Migrations complete."
fi

# Start the Next.js production server
echo "Starting Next.js server..."
exec node server.js
