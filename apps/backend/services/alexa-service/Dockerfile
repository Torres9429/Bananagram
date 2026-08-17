# Build context MUST be the repo root (not this directory), e.g.:
#   docker build -f apps/backend/services/alexa-service/Dockerfile -t alexa-service .
#
# Reason: this is a pnpm workspace; even though alexa-service has no DB of its
# own, the build needs to see the whole workspace to resolve pnpm dependencies.

FROM node:20-alpine AS base
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10.34.4 --activate
WORKDIR /app

# ---- deps: install the full workspace (pnpm needs every package.json to resolve) ----
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# ---- build: generate Prisma Client against the shared schema, then compile.
# Via turbo (not plain `pnpm --filter`) so @repo/backend-commons builds
# first — turbo.json's "build": {"dependsOn": ["^build"]} resolves that from
# the workspace dependency graph, plain pnpm --filter doesn't. ----
FROM deps AS builder
RUN pnpm db:generate
RUN pnpm exec turbo run build --filter=@repo/alexa-service

# ---- runtime: copy the whole built workspace (symlinked node_modules included) ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/backend/services/alexa-service
EXPOSE 3004
CMD ["node", "dist/main.js"]
