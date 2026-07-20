# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Contexto global — Gestor de Redes Sociales y Puntuación Digital

Stack: Next.js (MFE host, Multi-Zones) + NestJS (microservicios) + PostgreSQL + Prisma + Turborepo + pnpm

## Reglas críticas
- NUNCA hardcodear permisos: viven en `role_permissions` (BD)
- NUNCA borrar registros físicamente: usar `deleted_at` (soft delete)
- NUNCA exponer `ANTHROPIC_API_KEY` al frontend
- El creador de una publicación NO puede aprobarla (validar backend, no solo frontend)
- `post_status_history` y `audit_log` son INMUTABLES (solo insert)

## Privilegios dinámicos
- Decorator: `@RequirePermission('módulo', 'acción')` en controllers de NestJS
- Guard: `PermissionGuard` (`apps/backend/commons/guards/permission.guard.ts`) lee `user.permissions[module]` del JWT
- Endpoint: `GET /me/permissions` → fuente de verdad del menú frontend
- Hook: `usePermissions()` (`apps/frontend/commons/src/hooks/usePermissions.ts`) → `can(module, action)` / `canAny(module, actions)`

## Fórmula score digital
Documentada como `Score = (Consistencia×0.30) + (Engagement×0.40) + (Frecuencia×0.30)`, pero el código real
en `apps/backend/services/analytics-service/src/score/score.service.ts` calcula
`Consistencia×0.30 + Engagement×0.40 + Cobertura×0.20 + Frecuencia×0.10` (4 factores, no 3). Confirmar con
el usuario cuál es la vigente antes de tocar el score.

## Estado real del código — léase antes de asumir que algo "ya funciona"

Este repo está en etapa de scaffold: la estructura sigue las convenciones, pero casi nada está conectado
end-to-end todavía.

- **Los 4 microservicios backend (`auth`, `brands`, `content`, `analytics`) tienen `AppModule` con
  `imports: []`** — ningún controller de dominio responde hoy, aunque el código (auth-service completo,
  máquina de estados de posts, score, cron de métricas) es real.
- **El gateway no proxea nada** — `http-proxy-middleware` está instalado pero sin usar; solo expone `/health`.
- `brands-service/campaigns` y `analytics-service/reports` son stubs vacíos (sin métodos).
- **Todo el frontend corre en modo mock**: login/registro/sesión usan JWTs sin firmar generados en
  `@repo/ui/mocks`, guardados en la cookie `bananagram_token`. Ningún microfrontend hace fetch real a un
  backend — los 7 slices RTK Query de `web-shell/src/store/api/*.ts` están vacíos y ni siquiera
  registrados en el store; solo `authApi` (login/register) tiene endpoints definidos, y nada los usa aún.
- Detalle completo (rutas, endpoints, componentes, bugs conocidos, credenciales demo) en
  **`.claude/INVENTORY.md`** — consúltalo antes de tareas puntuales tipo "agrega un endpoint a X",
  "crea un componente para Y", "conecta el front Z con el servicio W".

## Modelo de datos vigente — `modelo.txt` (no el `schema.prisma` actual del backend)

`docs/base/modelo.txt` es el schema de Prisma **estable y definitivo**, preparado para reemplazar
`apps/backend/commons/prisma/schema.prisma` a futuro — introduce cambios de fondo respecto al schema
actual: `Post` deja de ser 1:1 con una red social (ahora `PostSocialAccount` permite fan-out multi-red,
con estados `parcial`/`error`/`cancelado` nuevos en `PostStatus`), `BrandUser` desaparece (ownership de
marca es singular vía `Brand.ownerId`, CM/Diseñador se vinculan a través de `Campaign.cmId`/
`CampaignDesigner`, no de la marca), y aparecen `PasswordResetToken`, `Media`/`PostMedia`, `UserStatus`.

**El 2026-07-19 se realinearon los mocks/tipos de las 6 apps frontend (`apps/frontend/**`) a este modelo**
— el backend real (`apps/backend/**`) **NO se tocó**, sigue usando el schema Prisma viejo, a propósito
(se reescribirá después). Documentación de ese trabajo:
- `docs/frontend-db-alignment.md` — análisis campo por campo + las 12 decisiones de producto que se tomaron.
- `docs/frontend-db-alignment-implementation.md` — registro de la implementación (qué cambió, archivo por archivo).

Si te piden tocar tipos/mocks del frontend relacionados con Post/Brand/Campaign/SocialAccount/Score/User,
consulta esos 2 documentos primero — los shapes ya viven en `@repo/ui/types` siguiendo `modelo.txt`.

---

## Comandos

Todo se orquesta con pnpm + Turborepo desde la raíz.

```bash
pnpm install                  # instala dependencias (workspace completo)
docker compose up -d          # solo postgres (5433) + adminer (8080) — uso diario recomendado
pnpm db:generate               # prisma generate
pnpm db:migrate                 # prisma migrate dev (schema único en apps/backend/commons/prisma)
pnpm seed                      # carga datos demo (packages/seed)

pnpm dev                       # todo (backend + fronts) vía turbo
pnpm dev:infra                  # docker compose up -d (alias)
pnpm dev:backend                # solo los 4 microservicios + gateway
pnpm dev:web                    # solo web-shell
pnpm dev:frontend               # web-shell + los 5 microfrontends

pnpm build                     # turbo run build (respeta grafo de dependencias)
pnpm test                      # turbo run test
pnpm lint                      # turbo run lint
```

- No hay `jest.config.js` ni `.eslintrc` explícitos en el repo — `test`/`lint` corren `jest`/`eslint` con configuración por defecto de cada paquete cuando existan. `apps/frontend/*` no tienen script `lint` propio todavía; no asumas que `pnpm lint` cubre todo.
- Para correr un solo servicio backend: `pnpm --filter @repo/auth-service dev` (o `test`/`build`). Nombres de paquete backend: `@repo/auth-service`, `@repo/brands-service`, `@repo/content-service`, `@repo/analytics-service`, y el gateway (sin nombre `@repo/` explícito, revisar `apps/backend/gateway/package.json`).
- Para un solo frontend: `pnpm --filter @repo/web-shell dev` (equivalentes: `admin-front`, `analytics-front`, `auth-front`, `brands-front`, `posts-front` — cada uno con su propio puerto fijo, ver abajo).
- Tests de integración backend viven en `apps/backend/test/*.spec.ts` (no dentro de cada servicio) y usan `apps/backend/test/helpers/auth.helper.ts` (JWT de prueba por rol) y `db.helper.ts` (limpieza de tablas). Tests e2e cross-servicio en `apps/e2e/src/*.e2e.spec.ts` (paquete `@repo/e2e`, usa `supertest`).
- `docker compose --profile full up -d --build` levanta el stack completo containerizado (todos los servicios + fronts); el modo diario (`docker compose up -d`, sin profile) solo levanta `postgres` + `adminer` y se espera correr el resto con `pnpm dev` en el host.

## Puertos

| App                    | Puerto |
|-------------------------|--------|
| web-shell (host MFE)     | 3000   |
| admin-front              | 3010   |
| analytics-front          | 3011   |
| auth-front                | 3012   |
| brands-front              | 3013   |
| posts-front                | 3014   |
| api-gateway                | 4000   |
| auth-service                | 3001   |
| brands-service               | 3002   |
| content-service               | 3003   |
| analytics-service               | 3005   |
| postgres (host)                   | 5433   |
| adminer                              | 8080   |

---

## Arquitectura

### Backend: microservicios NestJS detrás de un gateway

`apps/backend/`
- `gateway/` — único punto de entrada HTTP externo (puerto 4000). Usa `http-proxy-middleware` para enrutar a cada servicio; también aplica `CorrelationIdMiddleware` (propaga `X-Request-ID`) a todas las rutas.
- `services/{auth,brands,content,analytics}-service/` — un microservicio NestJS por dominio, cada uno con su propio `main.ts`/puerto/Dockerfile/`package.json`, pero **comparten un único schema de Prisma** (no hay DB-per-service).
- `commons/` — código compartido importado por **path relativo** (no es un workspace package con alias corto), p.ej. `../../../../../commons/types/post-status.enum`:
  - `prisma/schema.prisma` — schema único para todos los servicios (18 tablas, ver `.agents/database.md`)
  - `guards/` — `JwtAuthGuard`, `BrandAccessGuard` (valida `brandId` del recurso contra `brandIds[]` del JWT), `PermissionGuard`
  - `decorators/` — `@CurrentUser()`, `@RequirePermission(module, action)`
  - `interceptors/` — `AuditInterceptor` (escribe en `audit_log`), `LoggingInterceptor`
  - `filters/` — `HttpExceptionFilter`
  - `circuit-breaker/` — factory de `opossum` para llamadas REST entre servicios (ADR-0003, sin mensajería async)
  - `types/` — enums compartidos (`PostStatus`, `Roles`, `Modules`, `Actions`) y `JwtPayload`

Convenciones (`.agents/backend.md`, `agents/conventions.md`):
- Un módulo por dominio dentro de cada microservicio; controllers solo coordinan (request → service → response), la lógica vive en services, Prisma se accede vía repositories.
- Guards en TODOS los endpoints protegidos: `JwtAuthGuard` + `BrandAccessGuard` + `PermissionGuard`. DTOs con `class-validator` en endpoints con body.
- Nunca lanzar HTTP exceptions desde services — solo desde controllers/filters.
- Máquina de estados de posts en `content-service/src/posts/state-machine/` (`post-state-machine.ts` + `transitions.map.ts`): transición inválida → 422, rechazo sin comentario → 400, auto-aprobación (creador == aprobador) → 403.

### Base de datos (`.agents/database.md`)
- Multi-tenancy por row-level: toda tabla de negocio tiene `brand_id UUID NOT NULL` FK → `brands` (ADR-0001); los guards validan pertenencia, no hay schema-per-tenant.
- Soft delete universal (`deleted_at`), `created_at`/`updated_at` en todas las tablas.
- UUID como PK excepto `audit_log` y `post_status_history` (BIGINT autoincrement, inmutables — solo INSERT).
- Auth: JWT HS256 stateless, sin Redis/OIDC; access token 15 min, refresh token 7 días de un solo uso con rotación (tabla `refresh_tokens`) (ADR-0002). Payload del JWT: `userId, email, role, brandIds[], permissions{}`.

### Frontend: Next.js Multi-Zones (no monolito, no Module Federation)

`apps/frontend/`
- `web-shell/` — host: maneja sesión, sidebar/menú dinámico (construido desde `GET /me/permissions`), y **enrutamiento vía `rewrites()`** en `next.config.ts` que delega rutas a cada microfrontend por proxy HTTP (no iframes, no federation). P.ej. `/posts/*` → `postsFront`, `/brands/*` → `brandsFront`, `/users` → `adminFront`, `/login` → `authFront`, `/metrics` → `analyticsFront`.
- `{admin,analytics,auth,brands,posts}-front/` — zonas independientes, cada una un app Next.js standalone con su propio puerto; **no importan código entre sí**, solo consumen `@repo/ui` (paquete workspace en `apps/frontend/commons`).
- `commons/` (paquete `@repo/ui`, workspace real con subpath exports) — a diferencia de `commons` del backend, este SÍ se importa como paquete: `@repo/ui`, `@repo/ui/ui`, `@repo/ui/theme`, `@repo/ui/state`, `@repo/ui/types`, `@repo/ui/config`, `@repo/ui/utils`.
  - `config/zone-urls.ts` — única fuente de verdad de `API_BASE_URL` y las URLs de cada zona (`ZONE_URLS`); no repetir estos fallbacks en cada app.
  - `hooks/usePermissions.ts`, `useSession.ts`, `useSessionBootstrap.ts`, `useNotifications.ts`
  - `state/auth.slice.ts` — Redux slice de sesión/permisos, consumido vía `react-redux`
  - `ui/atoms|molecules|organisms/` — componentes MUI compartidos (atomic design)

Convenciones (`.agents/frontend.md`):
- `usePermissions()` es la única fuente de verdad para mostrar/ocultar UI (no duplicar lógica de permisos en componentes).
- RTK Query para TODAS las llamadas a la API (ver `store/api/*.ts` en cada front).
- MUI obligatorio como librería de componentes.
- Rutas protegidas usan `middleware.ts` de Next.js.

### Reglas de negocio (`agents/conventions.md`)
1. Un CM puede estar en múltiples campañas activas sin límite.
2. Un Cliente solo puede seleccionar un CM por campaña.
3. El CM selecciona a los Diseñadores dentro de su campaña.
4. Publicaciones rechazadas regresan a `borrador` (DRAFT) con motivo obligatorio.
5. `audit_log` y `post_status_history` son INMUTABLES.
6. RBAC dinámico: privilegios en BD, no hardcodeados.
7. Soft delete en todas las tablas principales.
8. Matching de categorías es orientativo, no restrictivo.
9. Marca y Perfil son funcionalmente idénticos (campo `type` en `brands`: `brand` | `profile`).
10. El catálogo de redes sociales (`social_networks`) lo gestiona solo el Administrador.

### ADRs (`agents/adrs/`)
- ADR-0001: multi-tenancy por `brand_id` (row-level), no schema/DB-per-tenant.
- ADR-0002: JWT HS256 stateless + refresh rotation, sin Redis/OIDC/JWKS.
- ADR-0003: REST síncrono entre servicios (sin Kafka), circuit breaker `opossum` + `X-Request-ID` propagado.

### Documentación adicional
- `docs/architecture.md` — tabla de servicios y ADRs
- `docs/database.md`, `docs/especificacion-funcional-roles.md`, `docs/frontend-functional-documentation.md` — specs funcionales detalladas
- `docs/swagger/*.yaml` — contratos OpenAPI por servicio
- `.planning/pitches/PITCH-0{1..5}-*.md` — shape-up pitches por feature (auth, posts, brands, metrics, extras) con su Definition of Done
