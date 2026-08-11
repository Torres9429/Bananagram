# Agent Instructions — Gestor de Redes Sociales

## Quick Reference

```bash
# Full setup
cp .env.example .env && pnpm install && docker compose up -d postgres && pnpm db:generate && pnpm db:migrate && pnpm seed

# Run all services
pnpm dev

# Single service (example)
pnpm --filter @repo/auth-service dev

# Tests (requires running DB)
pnpm test

# Lint + format (runs on staged files via husky)
pnpm lint

# Database
pnpm db:generate  # regenerate Prisma client
pnpm db:migrate   # apply migrations
pnpm seed         # load demo data
```

## Architecture

**Monorepo:** pnpm workspaces + Turborepo

| Layer | Location | Port | Tech |
|-------|----------|------|------|
| Web Shell (MFE host) | `apps/frontend/web-shell` | 3000 | Next.js 16 + React 19 + MUI |
| Microfrontends | `apps/frontend/*-front` | 3010-3014 | Next.js (independent) |
| API Gateway | `apps/backend/gateway` | 4000 | NestJS + http-proxy-middleware |
| Auth Service | `apps/backend/services/auth-service` | 3001 | NestJS + Passport + JWT |
| Brands Service | `apps/backend/services/brands-service` | 3002 | NestJS |
| Content Service | `apps/backend/services/content-service` | 3003 | NestJS + @nestjs/schedule |
| Analytics Service | `apps/backend/services/analytics-service` | 3005 | NestJS + @nestjs/schedule |
| Shared Prisma | `apps/backend/commons` | — | Prisma schema lives here |
| Shared UI | `apps/frontend/commons` | — | `@repo/ui` package |

## Critical Rules

1. **Never hard-delete** — always use `deletedAt` (soft delete)
2. **Never hardcode permissions** — they live in `role_permissions` table, fetched via `GET /me/permissions`
3. **Guards on ALL protected endpoints** — `JwtAuthGuard`, `BrandAccessGuard`, `PermissionGuard`
4. **DTOs with class-validator** on every endpoint that accepts a body
5. **Post author cannot approve their own post** (validated backend)
6. **`post_status_history` and `audit_log` are immutable** — never update/delete
7. **Never expose `ANTHROPIC_API_KEY` to frontend**

## Backend Conventions

- One NestJS module per domain within each microservice
- Controllers coordinate only: receive → call service → return
- Services contain business logic
- Repositories abstract Prisma access
- HTTP errors only from controllers or exception filters, never from services
- Use `@RequirePermission('module', 'action')` decorator for dynamic permissions
- Circuit breaker via `oppossum` for inter-service REST calls

## Frontend Conventions

- `web-shell` handles auth, dynamic menu, and global routing
- Each MFE is independent in `apps/frontend/*-front/`
- RTK Query for ALL API calls
- MUI is the component library (required)
- `usePermissions()` hook is the source of truth for UI visibility
- Dynamic menus built from `GET /me/permissions`

## Database Conventions

- All business tables have `brand_id UUID NOT NULL FK → brands`
- UUIDs as primary keys (exception: `audit_log` uses BIGINT)
- Timestamps: `createdAt`, `updatedAt`, `deletedAt?`
- PostgreSQL 16 (AWS RDS in production)

## Testing

- Jest for integration tests per microservice
- Factory helpers for test data generation
- `auth.helper.ts` generates JWTs per role
- `db.helper.ts` cleans tables between tests
- Tests require a running PostgreSQL instance

## Git Hooks

- **pre-commit:** `lint-staged` runs `eslint --fix` + `prettier --write` on staged `*.{ts,tsx}`
- **commit-msg:** `commitlint` enforces conventional commits

## Monorepo Notes

- `pnpm-workspace.yaml` uses `shamefully-hoist=true` and allows native builds for Prisma, bcrypt, sharp
- Turborepo tasks: `build` outputs to `.next/**` and `dist/**`; `dev` is persistent (no cache)
- Shared packages: `@repo/prisma` (backend), `@repo/ui` (frontend)
