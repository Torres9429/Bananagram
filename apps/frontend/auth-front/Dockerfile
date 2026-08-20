# syntax=docker/dockerfile:1
# Build context MUST be the repo root (not this directory), e.g.:
#   docker build -f apps/frontend/auth-front/Dockerfile -t auth-front .
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
RUN --mount=type=cache,id=bananagram-pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir=/pnpm-store

# ---- build: via turbo (not plain `pnpm --filter`) so @repo/ui builds first —
# turbo.json's "build": {"dependsOn": ["^build"]} resolves that from the
# workspace dependency graph, plain pnpm --filter doesn't. ----
FROM deps AS builder
# Baked into the browser bundle at build time (Next.js inlines NEXT_PUBLIC_*
# vars during `next build`, not at container runtime) — must be the
# public-facing gateway URL, not a Docker-network hostname. See
# apps/frontend/commons/src/config/zone-urls.ts.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN --mount=type=cache,id=bananagram-turbo-cache,target=/app/.turbo/cache \
    pnpm exec turbo run build --filter=@repo/auth-front

# ---- runtime: copy the whole built workspace (symlinked node_modules included) ----
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/frontend/auth-front
EXPOSE 3012
CMD ["pnpm", "start"]
