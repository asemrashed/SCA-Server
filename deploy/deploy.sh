#!/usr/bin/env bash
# Safe VPS deploy for sca-server. Run from repo root on the VPS:
#   bash deploy/deploy.sh
#
# Uses `prisma migrate deploy` only — never `db push --accept-data-loss`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PM2_APP="${PM2_APP:-sca-serve4001}"

echo "==> git pull"
git pull

echo "==> prisma migrate deploy"
npx prisma migrate deploy

if command -v bun >/dev/null 2>&1; then
  echo "==> bun install"
  bun install
  echo "==> bun run build"
  bun run build
else
  echo "==> npm ci"
  npm ci
  echo "==> npm run build"
  npm run build
fi

echo "==> pm2 restart ${PM2_APP} --update-env"
pm2 restart "$PM2_APP" --update-env

echo "Deploy complete."
