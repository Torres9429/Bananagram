# Setup local

## Prerrequisitos
- Node.js 20+
- pnpm 9+
- Docker Desktop

## Pasos

```bash
# 1. Clonar e instalar
git clone <repo>
cd Proyecto
cp .env.example .env
pnpm install

# 2. Base de datos
docker compose up -d postgres adminer
sleep 5  # esperar a que PostgreSQL inicie

# 3. Migraciones y generación de cliente Prisma
pnpm db:migrate
pnpm db:generate

# 4. Seed de demo (3 marcas, 5 usuarios, 30 publicaciones)
pnpm seed

# 5. Levantar todos los servicios
docker compose up
```

## URLs
- Frontend:  http://localhost:3000
- API Gateway: http://localhost:4000
- Swagger auth-service: http://localhost:3001/docs
- Adminer: http://localhost:8080

## Credenciales de demo
- Admin: admin@demo.com / password123
- CM: cm@demo.com / password123
- Diseñador: disenador@demo.com / password123
- Cliente: cliente@demo.com / password123
