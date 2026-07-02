#!/usr/bin/env bash
set -euo pipefail

echo "==> Enterprise Fastify Backend — First-time setup"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "    Created .env from .env.example"
else
  echo "    .env already exists — skipping"
fi

echo "==> Installing dependencies"
npm install

echo "==> Generating Prisma client"
npx prisma generate

if command -v docker &>/dev/null; then
  echo "==> Starting PostgreSQL and Redis (Docker)"
  docker compose -f docker-compose.dev.yml up -d

  echo "    Waiting for database..."
  sleep 5

  echo "==> Running migrations"
  npm run db:migrate

  echo "==> Seeding database"
  npm run db:seed
else
  echo "    Docker not found — start Postgres/Redis manually, then run:"
  echo "      npm run db:migrate"
  echo "      npm run db:seed"
fi

echo ""
echo "Setup complete. Start the dev server with:"
echo "  npm run dev"
echo ""
echo "API:     http://localhost:3000/api/v1"
echo "Swagger: http://localhost:3000/docs"
echo "Admin:   admin@example.com / Admin@123456"
