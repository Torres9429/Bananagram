# Gestor de Redes Sociales y Puntuación Digital

Plataforma para gestionar publicaciones en redes sociales de múltiples marcas, con flujo de
aprobación por roles (Community Manager, Diseñador, Cliente, Administrador), métricas simuladas y
un **Score Digital** calculado por marca. Incluye una skill de Alexa para consultar métricas y dictar
ideas de contenido por voz.

**Stack:** Next.js (Multi-Zones) · NestJS (microservicios) · PostgreSQL · Prisma · Turborepo · pnpm · Docker

> [!NOTE]
> Este repo está en desarrollo activo, migrando de un scaffold a un backend real. No todo lo que
> existe en el código responde por HTTP todavía. Antes de asumir que algo "ya funciona", revisa
> [`.claude/INVENTORY.md`](.claude/INVENTORY.md) — inventario detallado y al día del estado real de
> cada pieza (qué está wireado, qué es stub, qué se verificó en vivo).

## Arquitectura

Backend de microservicios NestJS detrás de un gateway; frontend Next.js en **Multi-Zones** (host +
zonas independientes, sin Module Federation). Cada microservicio con base de datos propia.

| Servicio | Puerto | Rol |
|---|---|---|
| `web-shell` | 3000 | Host del frontend: sesión, menú dinámico, enrutamiento a cada zona |
| `admin-front` / `analytics-front` / `auth-front` / `brands-front` / `posts-front` | 3010–3014 | Zonas independientes, cada una app Next.js standalone |
| `api-gateway` | 4000 | Único punto de entrada HTTP; reenvía a cada microservicio |
| `auth-service` | 3001 | Identidad, login, RBAC dinámico multi-rol. Emite el JWT (RS256) |
| `core-service` | 3002 | Marcas, campañas, publicaciones, catálogos, métricas, score, reportes, ideas |
| `alexa-service` | 3004 | BFF de la Alexa Skill, sin base de datos propia |
| `postgres` | 5433 | Una instancia, dos bases lógicas: `gestor_redes_auth` / `gestor_redes_core` |
| `redis` | 6379 | Denylist de access tokens revocados (logout) + rate-limit del gateway |

Decisiones de arquitectura documentadas como ADRs en [`agents/adrs/`](agents/adrs/): multitenancy por
`brand_id` (row-level, no schema-per-tenant), JWT RS256/JWKS con multi-rol y denylist en Redis
([ADR-0004](agents/adrs/ADR-0004-jwt-rs256-multirol.md), supera al HS256 original de ADR-0002), y REST
síncrono entre servicios (sin mensajería async).

## Requisitos

- Node.js 20+
- pnpm 10 (`packageManager` fijado en `package.json`; usa `corepack enable` si no lo tienes)
- Docker (para Postgres, y opcionalmente para correr el stack completo containerizado)

## Puesta en marcha

```bash
cp .env.example .env      # valores por defecto ya sirven para desarrollo local
pnpm install
pnpm generate-keys        # genera el par RS256 en keys/ (no sobrescribe si ya existe, nunca se commitea)
docker compose up -d      # levanta Postgres + Adminer + Redis
set -a && source .env && set +a   # para cargar las variables de entorno antes de migrate y seed
pnpm db:migrate           # aplica las migraciones (auth-service y core-service)
pnpm seed                 # carga roles, permisos y usuarios de prueba
```

> [!TIP]
> `pnpm seed` imprime al final las cuentas de prueba (mismo email/password que usa el modo mock del
> frontend), incluida `multi@bananagram.mx` (community_manager + disenador, para probar multi-rol). No
> siembra catálogos (categorías/especialidades/redes sociales) a propósito — se crean vía API una vez
> logueado (ver [Flujo esperado de punta a punta](#flujo-esperado-de-punta-a-punta) abajo).

> [!IMPORTANT]
> `auth-service` (y solo él) necesita las llaves RSA de `pnpm generate-keys` para firmar tokens —
> `core-service`, `alexa-service` y el gateway verifican contra `GET /.well-known/jwks.json`, nunca leen
> un `.pem` directo. Si `auth-service` no arranca por no encontrar las llaves, corre `pnpm generate-keys`
> desde la raíz del repo.

> [!IMPORTANT]
> **Ayrshare es obligatorio, no opcional**, para avanzar más allá de crear una marca: `POST /brands`
> llama a Ayrshare para crear el perfil + link de conexión, y falla con 500 sin `AYRSHARE_API_KEY`/
> `AYRSHARE_DOMAIN`/`AYRSHARE_PRIVATE_KEY` configurados (cuenta de prueba gratuita de
> [ayrshare.com](https://www.ayrshare.com) alcanza). Sin esto, todo el flujo se corta en el paso 3 de
> abajo.
>
> **Cada servicio de backend lee su propio `.env` local** (`apps/backend/{gateway,services/*}/.env`), no
> solo el de la raíz — `ConfigModule.forRoot()` de NestJS carga desde el directorio de trabajo del
> proceso. Si cambias una variable (ej. `SOCIAL_PROVIDER` para probar publicación real, ver el paso 9),
> edítala en el `.env` del servicio puntual, no solo en el de la raíz, y reinicia ese servicio. Estos
> `.env` por servicio no están versionados (mismo patrón que el de la raíz) — cópialos de
> `.env.example` la primera vez si no existen todavía.

## Correr el proyecto

Nada carga `.env` automáticamente al usar `pnpm dev` — cárgalo en la terminal antes:

```bash
set -a && source .env && set +a
```

Luego, según qué necesites levantar (para no saturar la máquina corriendo todo a la vez):

```bash
pnpm dev              # todo: backend + frontend completos
pnpm dev:backend       # gateway + auth-service + core-service + alexa-service
pnpm dev:frontend      # web-shell + los 5 microfrontends
pnpm dev:web           # solo web-shell

pnpm --filter @repo/auth-service dev   # un solo servicio backend
pnpm --filter @repo/admin-front dev    # un solo frontend
```

Cualquier combinación de `--filter` funciona con Turborepo:

```bash
pnpm turbo run dev --filter=@repo/api-gateway --filter=@repo/auth-service --filter=@repo/core-service
```

Para levantar el stack completo containerizado (útil antes de un deploy, o para probar el build de
producción de cada servicio):

```bash
docker compose --profile full up -d --build
```

## Flujo esperado de punta a punta

Con `pnpm dev` corriendo (backend + frontend) y `pnpm seed` ya aplicado, así se recorre el sistema
completo por primera vez, en el orden que espera el modelo de negocio (nada de esto está sembrado de
antemano salvo los usuarios — cada paso depende del anterior).

> [!NOTE]
> Las URLs de abajo son directas a cada zona (`brands-front:3013`, `posts-front:3014`, etc.), no vía
> `web-shell:3000` — `web-shell` es el host pensado como único punto de entrada, pero sus rewrites
> (`apps/frontend/web-shell/next.config.ts`) todavía no cubren `/profile` ni `/my-team`, así que por ahora
> hay que entrar directo a esas dos. El resto de rutas (`/login`, `/brands/*`, `/my-campaigns`,
> `/posts/*`, `/catalogs/*`) sí funcionan igual entrando por `localhost:3000`.

Cuentas de prueba (las mismas que imprime `pnpm seed` al final):

| Rol | Email | Password |
|---|---|---|
| Administrador | `20233tn102@utez.edu.mx` | `admin123` |
| Community Manager | `cm@bananagram.mx` | `cm123456` |
| Diseñador | `disenador@bananagram.mx` | `diseno123` |
| Cliente | `cliente@bananagram.mx` | `cliente123` |
| CM + Diseñador (multi-rol) | `multi@bananagram.mx` | `multi12345` |

**1. Administrador — catálogos** (`http://localhost:3010/catalogs`, o `localhost:3000/catalogs/...`)
Sin esto no hay con qué crear una marca ni una campaña:
- `/catalogs/social-networks` → agregar al menos **Instagram** (nombre, código, engagement base) —
  sin ninguna red en el catálogo, Ayrshare no tiene con qué ofrecer conexión.
- `/catalogs/categories` y `/catalogs/specialties` → al menos una de cada una, las usan marcas/campañas
  y los perfiles de CM/Diseñador para las recomendaciones de asignación.

**2. Cliente — crear la marca y conectar Instagram real** (`http://localhost:3013`)
- Login como `cliente@bananagram.mx`, `/brands` → "Nueva marca" (nombre + slug obligatorios, el resto
  opcional). Esto ya llama a Ayrshare de verdad para crear el perfil — ver el `[!IMPORTANT]` de Ayrshare
  arriba si falla con 500.
- Entrar a la marca creada → "Conectar otra red" abre el link real de Ayrshare — conectar una cuenta de
  Instagram de verdad ahí.
- Volver a la app y darle "Sincronizar" para traer la cuenta conectada (seguidores, handle, etc.).

**3. Cliente — crear la campaña** (`/brands/[id]/campaigns` o `/profile`)
Elegir categorías (para las recomendaciones) y un Community Manager — `cm@bananagram.mx` ya existe.
Queda en estado `pendiente`, notificando al CM.

**4. Community Manager — aceptar la campaña** (`/my-campaigns`, login `cm@bananagram.mx`)
Sección "Pendientes de tu aprobación" → Aceptar (o Rechazar con motivo, lo que la regresa al Cliente para
elegir otro CM).

**5. Community Manager — armar equipo** (`/my-team`, y luego dentro de la campaña → "Ver equipo")
- `/my-team`: agregar a `disenador@bananagram.mx` al equipo general (roster) — un Diseñador tiene que
  estar aquí antes de poder asignarlo a una campaña puntual.
- Dentro de la campaña ya aceptada → equipo de la campaña → agregar a ese mismo Diseñador desde el roster.

**6. Diseñador — crear una publicación** (`http://localhost:3014/posts/new`, login `disenador@bananagram.mx`)
Elegir la campaña (ya debe tener al Diseñador asignado, paso 5), redes, contenido, adjuntar media si se
quiere. "Guardar borrador" o "Crear y enviar a revisión →" directo.

**7. Community Manager — revisar** (`/posts/approvals` o el detalle del post, login `cm@bananagram.mx`)
Aprobar (pasa al Cliente) o Rechazar con motivo obligatorio (regresa al Diseñador, que ve el motivo y
puede corregir y reenviar).

**8. Cliente — aprobación final** (detalle del post, login `cliente@bananagram.mx`)
Programar una fecha, o "Publicar ahora" (sin fecha — el cron de `PostSchedulerService` corre cada minuto
y la recoge sola). También puede rechazar con motivo, lo que regresa al CM (quien la edita él mismo y
reenvía, o la reenvía al Diseñador con una nota opcional propia).

**9. (Opcional) Publicación real contra Ayrshare, no simulada**
Por defecto `SOCIAL_PROVIDER=mock` (el cron simula la publicación y las métricas, ver
`decay-simulator.ts`). Para publicar de verdad: parar `core-service`, cambiar `SOCIAL_PROVIDER=ayrshare`
en **su `.env` local** (`apps/backend/services/core-service/.env`, no el de la raíz — ver nota de arriba),
reiniciar. Confirmar en el dashboard de Ayrshare que el post llegó, y que `PostMetric.source` queda en
`'ayrshare'` (no `'simulated'`) en la siguiente corrida del cron de métricas.

## Estructura

```
apps/
  backend/
    gateway/            # api-gateway — proxea a cada microservicio
    services/
      auth-service/      # identidad, RBAC, JWT
      core-service/       # marcas, campañas, posts, catálogos, métricas, score
      alexa-service/        # BFF de la Alexa Skill
    commons/            # código compartido (guards/interceptors/filters sin duplicar aún)
  frontend/
    web-shell/          # host Multi-Zones
    admin-front/ analytics-front/ auth-front/ brands-front/ posts-front/
    commons/            # @repo/ui — componentes, hooks, tipos, mocks compartidos
packages/
  seed/                 # script de datos de prueba
docs/
  base/                 # modelo de datos (modelo.txt maestro, modelo2.txt implementado)
  backend/              # estado real del backend + guía para construir módulos nuevos
  swagger/              # contratos OpenAPI por servicio
  skill/                # diseño de la Alexa Skill
agents/
  adrs/                 # decisiones de arquitectura
  conventions.md         # reglas de negocio críticas
.planning/pitches/      # shape-up pitches por feature, con su Definition of Done
```

## Documentación

- [`.claude/CLAUDE.md`](.claude/CLAUDE.md) — arquitectura, reglas críticas y comandos, la referencia
  más completa del repo.
- [`.claude/INVENTORY.md`](.claude/INVENTORY.md) — inventario exhaustivo de rutas, endpoints y estado
  real de cada paquete.
- [`docs/backend/guia-nuevos-modulos-backend.md`](docs/backend/guia-nuevos-modulos-backend.md) — cómo
  construir un módulo de backend nuevo (estructura, DB, DTOs, auth, checklist de verificación).
- [`docs/base/modelo2.txt`](docs/base/modelo2.txt) — schema de Prisma vigente, repartido por servicio.
- [`docs/swagger/`](docs/swagger/) — contratos OpenAPI de cada microservicio (regenerar con
  `pnpm generate-swagger` mientras los servicios estén corriendo). Cada servicio expone además su propia
  documentación interactiva en vivo: Scalar en `/docs`, Swagger UI clásico + JSON/YAML crudo en `/api`
  (ej. `http://localhost:3001/docs`).
- [`.planning/pitches/`](.planning/pitches/) — shape-up pitches con la Definition of Done de cada feature.

## Testing y lint

```bash
pnpm test    # turbo run test — Jest por microservicio
pnpm lint    # turbo run lint
pnpm build   # build de producción, respeta el grafo de dependencias
```

Tests de integración de backend en `apps/backend/test/`; tests end-to-end cross-servicio en
`apps/e2e/` (usa `supertest`).
