# Build context MUST be the repo root (not this directory), e.g.:
#   docker build -f apps/frontend/posts-front/Dockerfile -t posts-front .
#
# Reason: this is a pnpm workspace and this app depends on @repo/ui
# (apps/frontend/commons), so the build needs to see the whole workspace,
# not just this app's folder — same convention as the backend Dockerfiles
# (apps/backend/services/*/Dockerfile).

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate
WORKDIR /app

# ---- deps: install the full workspace (pnpm needs every package.json to resolve) ----
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# ---- build: via turbo (not plain `pnpm --filter`) so @repo/ui builds first —
# turbo.json's "build": {"dependsOn": ["^build"]} resolves that from the
# workspace dependency graph, plain pnpm --filter doesn't. ----
FROM deps AS builder
RUN pnpm exec turbo run build --filter=@repo/posts-front

# ---- runtime: copy the whole built workspace (symlinked node_modules included) ----
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/frontend/posts-front
EXPOSE 3014
CMD ["pnpm", "start"]
