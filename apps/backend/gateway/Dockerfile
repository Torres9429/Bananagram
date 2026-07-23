# Build context MUST be the repo root (not this directory), e.g.:
#   docker build -f apps/backend/gateway/Dockerfile -t api-gateway .
#
# Reason: this is a pnpm workspace and this service imports Prisma types
# generated from apps/backend/commons/prisma/schema.prisma, so the build
# needs to see the whole workspace, not just this service's folder.

FROM node:20-alpine AS base
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10.34.4 --activate
WORKDIR /app

# ---- deps: install the full workspace (pnpm needs every package.json to resolve) ----
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# ---- build: generate Prisma Client against the shared schema, then compile ----
FROM deps AS builder
RUN pnpm db:generate
RUN pnpm --filter @repo/api-gateway run build

# ---- runtime: copy the whole built workspace (symlinked node_modules included) ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/backend/gateway
EXPOSE 4000
CMD ["node", "dist/main.js"]
