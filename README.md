# Fastify Enterprise Starter

[![Node.js](https://img.shields.io/badge/Node.js-24%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Production-ready enterprise backend boilerplate built with **Node.js 24+**, **TypeScript**, **Fastify**, **PostgreSQL**, **Prisma**, **Redis**, and **BullMQ**.

Use it as the foundation for SaaS, fintech, e-commerce, ERP, CRM, AI products, and large-scale APIs.

---

## Table of Contents

- [Features](#features)
- [Quick Start (5 minutes)](#quick-start-5-minutes)
- [Authentication Flow](#authentication-flow)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Storage (Local / S3)](#storage-local--s3)
- [Email Setup](#email-setup)
- [RBAC](#rbac)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Production Checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

| Category | What's included |
|----------|-----------------|
| **Architecture** | Clean Architecture, modular design, repository/service/controller pattern, DI container |
| **Auth** | JWT access + refresh tokens, rotation, session validation, device sessions, email verification |
| **Security** | Argon2, Helmet, CORS, Redis rate limiting, auth endpoint throttling, Zod validation |
| **RBAC** | Roles, permissions, middleware guards |
| **Database** | PostgreSQL + Prisma, migrations, seeding, connection pooling |
| **Cache & Queue** | Redis, BullMQ (email, notifications, image processing, dead-letter queue) |
| **Storage** | Pluggable `StorageProvider` — local filesystem or S3-compatible (AWS S3, R2, MinIO) |
| **Email** | SMTP via Nodemailer + BullMQ workers |
| **Observability** | Pino logging, health/readiness probes, OpenTelemetry-ready |
| **DevEx** | Swagger (dev), ESLint, Prettier, Husky, Vitest, GitHub Actions CI |
| **Deploy** | Docker, Docker Compose, auto-migrations on container start |

---

## Quick Start (5 minutes)

### Prerequisites

- **Node.js 24+** — run `nvm use` if you use nvm (see `.nvmrc`)
- **Docker** (recommended for Postgres + Redis)

### One-command setup

```bash
git clone <your-repo-url>
cd fastify-enterprise-starter
npm run setup
npm run dev
```

`npm run setup` will:
1. Copy `.env.example` → `.env`
2. Install dependencies
3. Start Postgres + Redis via Docker
4. Run migrations and seed data

### Manual setup

```bash
npm install
cp .env.example .env
npm run docker:dev          # start Postgres + Redis
npm run db:migrate          # apply migrations
npm run db:seed             # seed roles, permissions, admin
npm run dev                 # start dev server
```

### URLs

| Resource | URL |
|----------|-----|
| API base | http://localhost:3000/api/v1 |
| Swagger docs | http://localhost:3000/docs |
| Health (liveness) | http://localhost:3000/health |
| Readiness (DB + Redis) | http://localhost:3000/ready |

### Default admin (after seed)

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `Admin@123456` |

---

## Authentication Flow

```
Register → Email verification → Login → Use API
                ↓
         (token in email via SMTP)
```

### Step 1 — Register

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Secure@123",
    "firstName": "Jane",
    "lastName": "Doe"
  }'
```

Response: user object only — **no tokens** until email is verified.

### Step 2 — Verify email

Check your email for the verification token (or server logs if SMTP is not configured), then:

```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_VERIFICATION_TOKEN"}'
```

Resend verification (public):

```bash
curl -X POST http://localhost:3000/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Step 3 — Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Secure@123"}'
```

Response includes `accessToken` and `refreshToken`.

### Step 4 — Call protected endpoints

```bash
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 5 — Refresh token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### Step 6 — Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

Logout immediately invalidates the session — the access token will not work on the next request.

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register new user |
| POST | `/api/v1/auth/login` | — | Login (verified users only) |
| POST | `/api/v1/auth/refresh` | — | Rotate tokens |
| POST | `/api/v1/auth/logout` | ✓ | Logout current session |
| POST | `/api/v1/auth/forgot-password` | — | Request password reset |
| POST | `/api/v1/auth/reset-password` | — | Reset with token |
| POST | `/api/v1/auth/change-password` | ✓ | Change password |
| POST | `/api/v1/auth/verify-email` | — | Verify email with token |
| POST | `/api/v1/auth/resend-verification` | — | Resend by email (public) |
| POST | `/api/v1/auth/resend-verification/me` | ✓ | Resend for logged-in user |
| GET | `/api/v1/auth/sessions` | ✓ | List device sessions |
| DELETE | `/api/v1/auth/sessions/:id` | ✓ | Revoke a session |

### Users

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/users/me` | ✓ | Get current user |
| PATCH | `/api/v1/users/me` | ✓ | Update profile |
| POST | `/api/v1/users/me/avatar` | ✓ | Upload avatar (multipart) |
| GET | `/api/v1/users` | `users:read` | List users |
| GET | `/api/v1/users/:id` | `users:read` | Get user by ID |
| PATCH | `/api/v1/users/:id` | `users:update` | Admin update user |
| POST | `/api/v1/users/:id/roles` | `users:update` | Assign role |
| DELETE | `/api/v1/users/:id` | `users:delete` | Soft delete user |

### Roles & Permissions

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET/POST | `/api/v1/roles` | `roles:read` / `roles:create` |
| GET/PATCH/DELETE | `/api/v1/roles/:id` | `roles:read` / `roles:update` / `roles:delete` |
| GET/POST | `/api/v1/permissions` | `permissions:read` / `permissions:create` |

### Response format

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```

---

## Project Structure

```
src/
├── config/              # Zod-validated environment config
├── common/              # DI container, shared services (hash, token, email)
├── modules/
│   ├── auth/            # Authentication & sessions
│   ├── users/           # User management
│   ├── roles/           # Role management
│   └── permissions/     # Permission management
├── storage/             # StorageProvider (local, S3)
├── cache/               # Redis client + cache service
├── queue/               # BullMQ queue service
├── jobs/                # Background job processors
├── middleware/          # Auth, rate limiting, error handling
├── plugins/             # Fastify plugins (security, swagger, static files)
├── routes/              # Route registration + health endpoints
├── app.ts               # Application factory
└── server.ts            # Entry point

prisma/
├── schema.prisma        # Database schema
├── migrations/          # SQL migrations
└── seed.ts              # Roles, permissions, admin user

docs/
└── DEPLOYMENT.md        # Full deployment guide (Docker, Railway, AWS, K8s)

scripts/
├── setup.sh             # First-time project setup
└── docker-entrypoint.sh # Migrate + start (used in Docker)
```

Each module contains: `repositories/` → `services/` → `controllers/` → `routes/` → `validators/`

---

## Configuration

All environment variables are validated at startup with **Zod**. See:

- [`.env.example`](.env.example) — local development
- [`.env.production.example`](.env.production.example) — production template

### Essential variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `JWT_ACCESS_SECRET` | Access token secret (32+ chars) | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Refresh token secret (32+ chars) | `openssl rand -base64 48` |
| `CORS_ORIGIN` | Allowed frontend origins | `https://app.example.com` |
| `SMTP_USER` / `SMTP_PASSWORD` | Enables real email delivery | Resend, SendGrid, SES |
| `STORAGE_DRIVER` | `local` or `s3` | `s3` in production |

Production blocks startup if default JWT secrets are detected.

---

## Storage (Local / S3)

```env
# Development
STORAGE_DRIVER=local
UPLOAD_DIR=./uploads

# Production
STORAGE_DRIVER=s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

| Driver | When to use |
|--------|-------------|
| `local` | Development, single-node Docker — files served at `/uploads/` |
| `s3` | Production, multi-replica — AWS S3, Cloudflare R2, MinIO |

**Cloudinary:** implement `StorageProvider` in `src/storage/` — see `storage.interface.ts`.

---

## Email Setup

Emails are processed asynchronously via BullMQ. Configure SMTP to enable delivery:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_your_api_key
SMTP_FROM=noreply@yourdomain.com
```

Without SMTP credentials, emails are logged in development mode only.

---

## RBAC

Permissions use `module:action` format: `users:read`, `roles:create`, etc.

| Role | Permissions |
|------|-------------|
| Super Admin | All |
| Admin | users:read, users:update, roles:read, permissions:read |
| User | None (standard user) |

Protect a route:

```typescript
preHandler: [authenticate, requirePermission('users:read')]
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | First-time setup (env, deps, docker, migrate, seed) |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run docker:dev` | Start Postgres + Redis only |
| `npm run docker:prod` | Full stack (app + DB + Redis) |
| `npm run docker:logs` | Tail app container logs |
| `npm run db:migrate` | Dev migrations |
| `npm run db:migrate:prod` | Production migrations |
| `npm run db:seed` | Seed roles, permissions, admin |
| `npm test` | Run test suite |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

---

## Testing

```bash
npm run docker:dev

# Create test database (first time)
docker exec enterprise-postgres-dev psql -U postgres -c \
  "CREATE DATABASE enterprise_db_test;"

DATABASE_URL=postgresql://postgres:postgres@localhost:5433/enterprise_db_test?schema=public \
  npx prisma migrate deploy

npm test
```

---

## Deployment

### Docker (fastest)

```bash
cp .env.production.example .env
# Edit .env with real secrets

npm run docker:prod
```

Docker automatically runs migrations on startup.

### Full deployment guide

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for:

- Docker Compose on VPS
- Railway, Render
- AWS ECS + RDS + ElastiCache
- Kubernetes probes and migration jobs
- Post-deploy verification
- Troubleshooting

---

## Production Checklist

- [ ] Strong JWT secrets (`openssl rand -base64 48`)
- [ ] `NODE_ENV=production`
- [ ] Managed PostgreSQL with connection pooling
- [ ] Managed Redis
- [ ] `STORAGE_DRIVER=s3` for file uploads
- [ ] SMTP configured for transactional email
- [ ] `CORS_ORIGIN` set to real frontend domain(s)
- [ ] Secrets in a vault (not in git)
- [ ] Health check on `/ready`
- [ ] Change default admin password after seed
- [ ] Enable `OTEL_ENABLED=true` if using observability stack

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Environment validation failed` | Compare `.env` with `.env.example` |
| Can't login after register | Verify email first |
| 401 immediately after logout | Expected — sessions are checked on every request |
| Emails not received | Set `SMTP_USER` and `SMTP_PASSWORD` |
| `/ready` returns 503 | Check Postgres and Redis are running |
| 429 on login/register | Auth rate limit — wait or adjust `AUTH_RATE_LIMIT_*` |
| Avatar returns 404 | Use `STORAGE_DRIVER=local`; files at `/uploads/avatars/...` |

---

## Adding a New Module

1. Create `src/modules/<name>/` with `repositories/`, `services/`, `controllers/`, `routes/`, `validators/`
2. Wire up in `src/common/container.ts`
3. Register routes in `src/routes/index.ts`
4. Add permissions to `prisma/seed.ts` if RBAC is needed

---

## License

MIT — use freely for personal and commercial projects.
