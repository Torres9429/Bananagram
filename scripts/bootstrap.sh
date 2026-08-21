#!/bin/bash
set -e
echo "🔧 Instalando dependencias..."
pnpm install
echo "🐳 Levantando PostgreSQL..."
docker compose up -d postgres
sleep 8
echo "📦 Generando cliente Prisma y migraciones..."
pnpm db:generate
pnpm db:migrate
echo "🌱 Cargando seed de demo..."
pnpm seed
echo "🚀 Levantando backend y frontends (turbo, en el host)..."
echo "   Para arrancar todo:        pnpm dev"
echo "   Para solo backend:         pnpm dev:backend"
echo "   Para un front específico:  pnpm --filter @repo/<nombre> dev"
echo "✅ Listo. Corre 'pnpm dev' (o los comandos de arriba) para iniciar."
