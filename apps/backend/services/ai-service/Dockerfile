# Build context MUST be the repo root (not this directory), e.g.:
#   docker build -f apps/backend/services/ai-service/Dockerfile -t ai-service .
#
# Reason: this is a pnpm workspace; the build needs to see the whole
# workspace to resolve pnpm dependencies. ai-service has no DB of its own
# (no Prisma step here, unlike the other 3 backend services).

FROM node:20-alpine AS base
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10.34.4 --activate
WORKDIR /app

# ---- deps: install the full workspace (pnpm needs every package.json to resolve) ----
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# ---- build: via turbo (not plain `pnpm --filter`) so @repo/backend-commons
# builds first — turbo.json's "build": {"dependsOn": ["^build"]} resolves
# that from the workspace dependency graph, plain pnpm --filter doesn't. ----
FROM deps AS builder
RUN pnpm exec turbo run build --filter=@repo/ai-service

# ---- runtime: copy the whole built workspace (symlinked node_modules included) ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/backend/services/ai-service
EXPOSE 3005
CMD ["node", "dist/main.js"]
