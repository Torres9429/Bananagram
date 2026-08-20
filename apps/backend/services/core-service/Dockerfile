# Build context MUST be the repo root (not this directory), e.g.:
#   docker build -f apps/backend/services/core-service/Dockerfile -t core-service .
#
# Reason: this is a pnpm workspace and this service needs its own Prisma
# Client (apps/backend/services/core-service/prisma/schema.prisma, own
# database — see docs/base/modelo2.txt), so the build needs to see the
# whole workspace, not just this service's folder.

FROM node:20-alpine AS base
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10.34.4 --activate
WORKDIR /app

# ---- deps: install the full workspace (pnpm needs every package.json to resolve) ----
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# ---- build: prebuild hook runs `prisma generate` for this service's own
# schema (apps/backend/services/core-service/prisma/schema.prisma) before
# compiling. Via turbo (not plain `pnpm --filter`) so @repo/backend-commons
# builds first — turbo.json's "build": {"dependsOn": ["^build"]} resolves
# that from the workspace dependency graph, plain pnpm --filter doesn't. ----
FROM deps AS builder
RUN pnpm exec turbo run build --filter=@repo/core-service

# ---- runtime: copy the whole built workspace (symlinked node_modules included) ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/backend/services/core-service
EXPOSE 3002
CMD ["node", "dist/main.js"]
