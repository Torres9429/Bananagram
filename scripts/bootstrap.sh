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
echo "🚀 Levantando todos los servicios..."
docker compose up -d
echo "✅ Listo. Frontend: http://localhost:3000"
