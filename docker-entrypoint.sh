#!/bin/sh
# ─── Docker Entrypoint ───────────────────────────────────────
# Ensures the PostgreSQL database is migrated before starting
# the application. DATABASE_URL must point to a PostgreSQL
# instance (Supabase, self-hosted, etc).

set -e

echo "[entrypoint] Running database migrations..."
npx -y prisma migrate deploy
echo "[entrypoint] Migrations complete."



# Generate self-signed SSL certificates for local HTTPS bridging if they don't exist
if [ ! -f "./data/localhost.crt" ] || [ ! -f "./data/localhost.key" ]; then
  echo "[entrypoint] Generating self-signed SSL certificates for port 3001..."
  openssl req -nodes -new -x509 -keyout ./data/localhost.key -out ./data/localhost.crt -days 365 -subj "/CN=localhost" 2>/dev/null
fi

# Start the HTTPS proxy in the background
if [ -f "./scripts/https-proxy.mjs" ]; then
  node ./scripts/https-proxy.mjs &
fi

exec node server.js
