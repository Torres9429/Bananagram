# Gestor de Redes Sociales y Puntuación Digital

Stack: Next.js · NestJS · PostgreSQL · Prisma · Turborepo · pnpm · Docker

## Setup local

```bash
cp .env.example .env          # configura variables
pnpm install                  # instala dependencias
docker compose up -d postgres # levanta PostgreSQL
pnpm db:migrate               # aplica migraciones
pnpm seed                     # carga datos de demo
docker compose up             # levanta todos los servicios
```

Acceso: http://localhost:3000 (frontend) · http://localhost:4000 (API Gateway)
Adminer: http://localhost:8080

## Estructura

Ver árbol completo en docs/architecture.md
