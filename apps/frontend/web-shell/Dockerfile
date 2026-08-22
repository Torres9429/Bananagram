# syntax=docker/dockerfile:1
# Build context MUST be the repo root (not this directory), e.g.:
#   docker build -f apps/frontend/web-shell/Dockerfile -t web-shell .
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
# Bug real encontrado en vivo: a diferencia de NEXT_PUBLIC_API_URL (que solo
# se usa en el bundle de cliente), estas 5 las lee next.config.ts's
# rewrites() — y Next.js RESUELVE y serializa rewrites()/redirects()/headers()
# una sola vez durante `next build` (queda "horneado" en .next/routes-manifest.json),
# no las vuelve a evaluar en `next start`. Ponerlas solo en el `environment:`
# de docker-compose (runtime) no alcanza — el rewrite ya quedó fijo apuntando
# al fallback de ZONE_URLS (localhost:PUERTO) desde el build, y el contenedor
# terminaba con "ECONNREFUSED 127.0.0.1:3012" al intentar proxear /login pese
# a tener la env var correcta en runtime.
ARG NEXT_PUBLIC_ADMIN_FRONT_URL
ARG NEXT_PUBLIC_ANALYTICS_FRONT_URL
ARG NEXT_PUBLIC_AUTH_FRONT_URL
ARG NEXT_PUBLIC_BRANDS_FRONT_URL
ARG NEXT_PUBLIC_POSTS_FRONT_URL
ENV NEXT_PUBLIC_ADMIN_FRONT_URL=$NEXT_PUBLIC_ADMIN_FRONT_URL
ENV NEXT_PUBLIC_ANALYTICS_FRONT_URL=$NEXT_PUBLIC_ANALYTICS_FRONT_URL
ENV NEXT_PUBLIC_AUTH_FRONT_URL=$NEXT_PUBLIC_AUTH_FRONT_URL
ENV NEXT_PUBLIC_BRANDS_FRONT_URL=$NEXT_PUBLIC_BRANDS_FRONT_URL
ENV NEXT_PUBLIC_POSTS_FRONT_URL=$NEXT_PUBLIC_POSTS_FRONT_URL
RUN --mount=type=cache,id=bananagram-turbo-cache,target=/app/.turbo/cache \
    pnpm exec turbo run build --filter=@repo/web-shell

# ---- runtime: copy the whole built workspace (symlinked node_modules included) ----
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/apps/frontend/web-shell
EXPOSE 3000
CMD ["pnpm", "start"]
