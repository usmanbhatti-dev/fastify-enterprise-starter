# Deployment Guide

Step-by-step instructions for deploying **fastify-enterprise-starter** to production.

## Table of Contents

1. [Pre-deployment checklist](#pre-deployment-checklist)
2. [Docker Compose (single server)](#docker-compose-single-server)
3. [Manual deployment (VPS)](#manual-deployment-vps)
4. [Railway](#railway)
5. [Render](#render)
6. [AWS (ECS + RDS + ElastiCache)](#aws-ecs--rds--elasticache)
7. [Kubernetes](#kubernetes)
8. [Database migrations](#database-migrations)
9. [Post-deploy verification](#post-deploy-verification)
10. [Troubleshooting](#troubleshooting)

---

## Pre-deployment checklist

Before deploying to any platform:

- [ ] Copy `.env.production.example` → `.env` and fill all values
- [ ] Generate JWT secrets: `openssl rand -base64 48` (use different values for access and refresh)
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGIN` to your real frontend URL(s)
- [ ] Configure SMTP (`SMTP_USER` + `SMTP_PASSWORD`) for email verification
- [ ] Set `STORAGE_DRIVER=s3` and configure S3/R2 for file uploads
- [ ] Use managed PostgreSQL (not SQLite, not container-only DB in prod)
- [ ] Use managed Redis for rate limiting, queues, and caching
- [ ] Never commit `.env` to git
- [ ] Change default seed admin password after first deploy

---

## Docker Compose (single server)

Best for: small teams, staging, single VPS (DigitalOcean, Hetzner, Linode).

### 1. Prepare environment

```bash
cp .env.production.example .env
# Edit .env — set JWT secrets, CORS, SMTP, etc.
```

### 2. Deploy

```bash
npm run docker:prod
# or
docker compose up -d --build
```

The Docker entrypoint automatically runs `prisma migrate deploy` before starting the app.

### 3. Seed (first deploy only)

```bash
docker compose exec app npx prisma db seed
```

### 4. Verify

```bash
curl http://localhost:3000/ready
curl http://localhost:3000/health
```

### 5. View logs

```bash
npm run docker:logs
```

### 6. Stop

```bash
npm run docker:down
```

---

## Manual deployment (VPS)

Best for: Ubuntu/Debian VPS with Node.js 24+.

```bash
# On server
git clone <your-repo-url>
cd fastify-enterprise-starter

cp .env.production.example .env
# Edit .env with production values

npm ci
npx prisma generate
npm run build

# Run migrations
npm run db:migrate:prod

# Seed (first time)
npm run db:seed

# Start with process manager
npm install -g pm2
pm2 start dist/server.js --name api
pm2 save
pm2 startup
```

Use **nginx** as reverse proxy:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add TLS with Certbot: `certbot --nginx -d api.yourdomain.com`

---

## Railway

Best for: fast deploys with managed Postgres and Redis.

1. Create a new **Railway** project
2. Add **PostgreSQL** and **Redis** plugins
3. Connect your GitHub repo
4. Set environment variables from `.env.production.example`
5. Map Railway Postgres `DATABASE_URL` and Redis host/password
6. Set build command: `npm run build`
7. Set start command: `npx prisma migrate deploy && node dist/server.js`
8. Deploy

**Health check path:** `/ready`

---

## Render

Best for: simple PaaS with Docker or native Node.

### Web Service (Docker)

1. Connect repo
2. Environment: **Docker**
3. Add env vars from `.env.production.example`
4. Add managed PostgreSQL and Redis (or Upstash Redis)
5. Health check path: `/ready`

### Web Service (Node)

- Build: `npm ci && npx prisma generate && npm run build`
- Start: `npx prisma migrate deploy && npm run start:prod`

---

## AWS (ECS + RDS + ElastiCache)

Best for: enterprise production workloads.

| Component | AWS Service |
|-----------|-------------|
| API       | ECS Fargate |
| Database  | RDS PostgreSQL 16 |
| Cache/Queue | ElastiCache Redis 7 |
| Files     | S3 |
| Email     | SES (SMTP) |
| Secrets   | Secrets Manager |
| Load balancer | ALB |

### High-level steps

1. Push Docker image to **ECR**
2. Create RDS PostgreSQL instance
3. Create ElastiCache Redis cluster
4. Store secrets in **Secrets Manager**
5. Create ECS task definition with env vars
6. Run migration as one-off ECS task: `npx prisma migrate deploy`
7. Deploy ECS service behind ALB
8. Configure ALB health check on `/ready`

### S3 storage

```env
STORAGE_DRIVER=s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

For **Cloudflare R2**:

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=https://your-cdn-domain.com
```

---

## Kubernetes

Example probe configuration:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
```

Run migrations as a **Job** before rolling out new deployments:

```yaml
# migration-job.yaml
command: ["npx", "prisma", "migrate", "deploy"]
```

---

## Database migrations

| Environment | Command |
|-------------|---------|
| Local dev   | `npm run db:migrate` |
| CI / prod   | `npm run db:migrate:prod` |
| Docker      | Automatic via `scripts/docker-entrypoint.sh` |

Never use `db:push` in production — always use migrations.

---

## Post-deploy verification

```bash
# 1. Readiness
curl https://api.yourdomain.com/ready

# 2. Register a test user
curl -X POST https://api.yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123456"}'

# 3. Check email for verification token (or check logs if SMTP not configured)

# 4. Verify email
curl -X POST https://api.yourdomain.com/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<token-from-email>"}'

# 5. Login
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123456"}'
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Environment validation failed` | Check `.env` against `.env.example` — all required vars must be set |
| `Production startup blocked` | Replace default JWT secrets with random 32+ char strings |
| `/ready` returns 503 | Database or Redis unreachable — check `DATABASE_URL` and `REDIS_HOST` |
| Emails not sending | Set `SMTP_USER` and `SMTP_PASSWORD`; check worker logs |
| 401 after logout | Expected — sessions are validated on every request |
| Can't login after register | Verify email first via `/auth/verify-email` |
| Avatar 404 locally | Ensure `STORAGE_DRIVER=local` — files served at `/uploads/` |
| Migrations fail in Docker | Ensure Postgres is healthy before app starts (`depends_on`) |
| Rate limit 429 on auth | Wait 15 min or adjust `AUTH_RATE_LIMIT_*` in `.env` |

---

## Scaling notes

- **API replicas:** Scale horizontally behind a load balancer
- **BullMQ workers:** For high job volume, run workers in a separate process/container
- **Sessions:** Stored in PostgreSQL — no sticky sessions required
- **File uploads:** Use `STORAGE_DRIVER=s3` when running multiple API replicas
