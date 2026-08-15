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
- Guard: `PermissionGuard` lee `user.permissions[module]` del JWT — **desde 2026-07-27 ya está conectado**
  (antes existía en `commons/guards/permission.guard.ts` sin usarse en ningún endpoint). Cada servicio
  tiene su propia copia local (`auth-service/src/guards/permission.guard.ts`,
  `core-service/src/guards/permission.guard.ts`, mismo criterio que `JwtAuthGuard`/`CurrentUser`) — el de
  `commons/` queda como referencia, no es lo que corre en runtime.
- Módulos del catálogo (`commons/types/modules.enum.ts` + `packages/seed/src/index.js`): `marcas`,
  `publicaciones`, `calendario`, `campanas`, `metricas`, `score`, `reportes`, `usuarios`, `privilegios`,
  y `catalogos` (agregado 2026-07-27 — los 3 catálogos no encajaban en ninguno existente).
- Endpoint: `GET /me/permissions` → fuente de verdad del menú frontend
- Hook: `usePermissions()` (`apps/frontend/commons/src/hooks/usePermissions.ts`) → `can(module, action)` / `canAny(module, actions)`

## Fórmula score digital
Documentada como `Score = (Consistencia×0.30) + (Engagement×0.40) + (Frecuencia×0.30)`, pero el código real
en `apps/backend/services/core-service/src/score/score.service.ts` calcula
`Consistencia×0.30 + Engagement×0.40 + Cobertura×0.20 + Frecuencia×0.10` (4 factores, no 3). Confirmar con
el usuario cuál es la vigente antes de tocar el score.

## Alexa Skill e IA — contrato real (2026-08-13)

`docs/skill/AlexaSkill-Diseno-Final.md` y `docs/skill/lambda-codigo-por-pasos.md` quedaron **descartados**
(diseño anterior, Lambda llamando a Claude directo) — el contrato real y vigente son las 6 funciones
documentadas en `docs/todos/2026-08-10-ayrshare-pipeline-alexa-endpoints-plan.md` (`fetchUserByLinkCode`,
`fetchCampaigns`, `fetchContentIdeas`, `fetchSavedIdeas`, `saveIdeaToBackend`, `deleteIdeaFromBackend`).
La generación de ideas con IA vive del lado del **backend de Bananagram**, no del Lambda — sigue sin
implementarse, pendiente de una `ANTHROPIC_API_KEY` con facturación activa (nunca al frontend, regla de
arriba sin cambios). El pipeline real de Ayrshare (publish + métricas) ya se verificó en vivo, publicando
de verdad en Instagram — detalle de los 5 bugs reales encontrados y arreglados en ese mismo documento,
sección "Fase P1".

## Estado real del código — léase antes de asumir que algo "ya funciona" (actualizado 2026-08-14)

El proyecto dejó de ser un scaffold: los 4 servicios de backend y la mayoría del frontend (login,
publicaciones, campañas, métricas/score, notificaciones en vivo, Alexa Skill) están conectados de punta a
punta. Lo mock/stub es ahora la excepción puntual, no la regla — detalle exhaustivo en
`.claude/INVENTORY.md` §0; resumen abajo.

- **Los 4 servicios de backend tienen dominio real conectado**, incluido `alexa-service`: sus módulos
  `campaigns`/`ideas` **ya no son stubs** — `ideas` es dueño único de ese dominio en todo el sistema
  (se movió de `core-service`), con acceso directo (no HTTP) a la tabla `ContentIdea` de la BD física de
  `core-service` vía su propio `prisma/schema.prisma` (nunca migra desde ahí). `posts` en `core-service`
  tiene controller/service/module completo (13 endpoints, máquina de estados de 11 valores) más un
  scheduler de publicación por temporizadores de evento (ya no sondeo `@Cron`). Score/métricas ya tienen
  controller HTTP (`GET /brands/:id/score[-history]`, `/campaigns/:id/metrics[-history]`, con refresh
  manual). Notificaciones son reales de punta a punta, incluido un stream SSE en vivo
  (`GET me/notifications/stream`).
- **Sigue faltando de verdad**: generación de ideas con IA (`fetchContentIdeas`, bloqueada sin
  `ANTHROPIC_API_KEY` de pago), generación real de reportes (`POST /reports` solo registra la solicitud,
  `fileUrl` queda `null`), y un puñado de rutas/componentes frontend puntuales que siguen mock pese a que
  el backend ya existe (`admin-front` `/users`/`/roles`/`/audit-log`, `auth-front` registro/activación,
  `brands-front` `/profile/calendar` y el árbol legacy `/brands/[id]/{metrics,score,reports,calendar}`,
  y 5 de 15 widgets de `analytics-front` como `EmptyState` honesto por falta de dato nativo) — lista
  completa en `.claude/INVENTORY.md` §0.
- **El gateway ya proxea de verdad**: `/api/auth/*`, `/api/me/*`, `/api/admin/*` → `AUTH_SERVICE_URL`;
  `/api/catalogs/*`, `/api/brands/*`, `/api/campaigns/*`, `/api/cm-team/*`, `/api/posts/*`,
  `/api/reports/*` → `CORE_SERVICE_URL`; **`/api/ideas/*` → `ALEXA_SERVICE_URL`** (no core-service — el
  dominio de ideas se mudó entero ahí, ver arriba). `main.ts` crea la app con `{ bodyParser: false }` —
  necesario para que `http-proxy-middleware` reciba el stream del body sin consumir (si Nest lo parseara
  antes, los POST/PATCH llegarían vacíos al servicio destino). Montado con
  `app.use(createProxyMiddleware(...))` **sin** pasar el path como argumento de `app.use()` — Express
  recorta ese prefijo de `req.url` antes de pasarlo al middleware si se hace así, rompiendo el proxy; se
  usa `pathFilter` en su lugar, que matchea sobre la URL completa sin tocarla. `/api/internal/*` (tráfico
  servicio-a-servicio: auth-service↔core-service) **no** se proxea a propósito. **Sin confirmar en vivo**:
  el override de `docker-compose.yml` para `api-gateway` no incluye `ALEXA_SERVICE_URL`, así que
  `/api/ideas` probablemente no resuelve dentro del perfil `full` containerizado.
- **El frontend ya NO corre 100% en modo mock**: el login es real (`auth-front`'s `LoginForm` llama al
  backend de verdad, con refresh automático de token y 2 cookies de sesión reales). Catálogos en
  `admin-front`, y la mayoría de `brands-front`/`posts-front`/`analytics-front` (campañas, publicaciones
  con flujo de aprobación completo, métricas) son reales. Lo que sigue siendo mock quedó en bolsillos
  específicos, no por zona completa — ver el resumen de arriba y el detalle en `.claude/INVENTORY.md` §0.
- Detalle completo (rutas, endpoints, componentes, bugs conocidos, credenciales demo) en
  **`.claude/INVENTORY.md`** — consúltalo antes de tareas puntuales tipo "agrega un endpoint a X",
  "crea un componente para Y", "conecta el front Z con el servicio W".

## Modelo de datos vigente — `modelo2.txt` (ya implementado en el backend real)

`docs/base/modelo.txt` es el schema de Prisma maestro/de referencia (intacto, no se toca).
`docs/base/modelo2.txt` es el mismo modelo repartido en 2 secciones (auth-service/core-service) y es la
versión **ya implementada** en `apps/backend/services/{auth,core}-service/prisma/schema.prisma` — **el
2026-07-23 se separaron las bases de datos**: `auth-service` y `core-service` dejaron de compartir un
único Postgres/schema.prisma (el viejo `apps/backend/commons/prisma/` se eliminó), y ahora cada uno tiene
su propio `schema.prisma`, su propia base (`gestor_redes_auth` / `gestor_redes_core`, mismo contenedor
Postgres, 2 bases lógicas) y su propio Prisma Client generado con `output` personalizado (necesario:
ambos servicios declaran la misma versión de `@prisma/client`, y pnpm resuelve versiones idénticas al
mismo folder físico en su store — sin `output` propio, el `generate` de un servicio pisa el del otro).
Cambios de fondo respecto al schema viejo: `Post` deja de ser 1:1 con una red social (ahora
`PostSocialAccount` permite fan-out multi-red, con estados `publicando`/`parcial`/`error`/`cancelado`
nuevos en `PostStatus`, 10 valores en total), `BrandUser` desaparece (ownership de marca es singular vía
`Brand.ownerId`, CM/Diseñador se vinculan a través de `Campaign.cmId`/`CampaignDesigner`, no de la marca),
`User.firstName`/`lastName` desaparecen de auth-service (el nombre para mostrar vive en
`UserProfile.name`, en core-service — servicios distintos, sin `@relation` real entre sí, solo
`userId` compartido), y aparecen `PasswordResetToken`, `Media`/`PostMedia`, `UserStatus`.

**`brandIds` del JWT — decisión ya tomada (2026-07-23):** `AuthService.login()` ya no puede resolverlo
con un join local (Brand/Campaign viven en la BD de core-service) y emite `brandIds: []` siempre, a
propósito — nada lo lee. `BrandAccessGuard` se movió a vivir dentro de `core-service`
(`apps/backend/services/core-service/src/guards/brand-access.guard.ts`) y valida acceso con una consulta
LOCAL contra su propia BD (`Brand.ownerId` o `Campaign.cmId`/`CampaignDesigner.userId` para el `brandId`
del request) usando `payload.sub` (userId) — sin llamada HTTP, sin depender del JWT para esto. **Desde
2026-07-27 ya está aplicado** en `brands/:id` (`GET`/`PATCH`/`DELETE`), donde `:id` **es** literalmente un
`brandId`. Importante: **no se pudo reusar tal cual en `campaigns`** — ahí `:id` es un `campaignId`, y el
guard resuelve `request.params.brandId || request.params.id` asumiendo que ese `:id` identifica una
`Brand`; aplicado a una ruta de campaign buscaría un `Brand` con el id de una `Campaign` y negaría el
acceso siempre (falla silenciosa, no un error ruidoso). Para `campaigns` (y cualquier recurso futuro
donde `:id` no sea un `brandId`) la pertenencia se resuelve a mano en el service — ver
`CampaignsService.assertCanManage` en `core-service/src/campaigns/campaigns.service.ts`.

**El 2026-07-19 se habían realineado los mocks/tipos de las 6 apps frontend (`apps/frontend/**`) a este
modelo** — el frontend sigue en modo mock, sin conectar al backend real todavía. Documentación de ese
trabajo:
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
pnpm db:generate               # prisma generate (auth-service + core-service, cada uno su propio schema)
pnpm db:migrate                 # prisma migrate dev (ídem — 2 bases separadas, ver sección Arquitectura)
pnpm seed                      # carga datos demo (packages/seed)

pnpm dev                       # todo (backend + fronts) vía turbo
pnpm dev:infra                  # docker compose up -d (alias)
pnpm dev:backend                # solo los 3 microservicios + gateway
pnpm dev:web                    # solo web-shell
pnpm dev:frontend               # web-shell + los 5 microfrontends

pnpm build                     # turbo run build (respeta grafo de dependencias)
pnpm test                      # turbo run test
pnpm lint                      # turbo run lint
```

- No hay `jest.config.js` ni `.eslintrc` explícitos en el repo — `test`/`lint` corren `jest`/`eslint` con configuración por defecto de cada paquete cuando existan. `apps/frontend/*` no tienen script `lint` propio todavía; no asumas que `pnpm lint` cubre todo.
- Para correr un solo servicio backend: `pnpm --filter @repo/auth-service dev` (o `test`/`build`). Nombres de paquete backend: `@repo/auth-service`, `@repo/core-service`, `@repo/alexa-service`, y el gateway (sin nombre `@repo/` explícito, revisar `apps/backend/gateway/package.json`).
- Para un solo frontend: `pnpm --filter @repo/web-shell dev` (equivalentes: `admin-front`, `analytics-front`, `auth-front`, `brands-front`, `posts-front` — cada uno con su propio puerto fijo, ver abajo).
- Tests de integración backend viven en `apps/backend/test/*.spec.ts` (no dentro de cada servicio) y usan `apps/backend/test/helpers/auth.helper.ts` (JWT de prueba por rol) y `db.helper.ts` (limpieza de tablas). Paquete propio `@repo/backend-integration-tests` (`jest`+`ts-jest`, agregado 2026-07-27 — antes no existía ni `package.json` ahí, los specs no se ejecutaban nunca): `pnpm --filter @repo/backend-integration-tests test` (necesita `docker compose up -d postgres`). Tests e2e cross-servicio en `apps/e2e/src/*.e2e.spec.ts` (paquete `@repo/e2e`, usa `supertest`) siguen siendo placeholder.
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
| core-service               | 3002   |
| alexa-service               | 3004   |
| postgres (host)                   | 5433   |
| adminer                              | 8080   |

---

## Arquitectura

### Backend: microservicios NestJS detrás de un gateway

`apps/backend/`
- `gateway/` — único punto de entrada HTTP externo (puerto 4000). Usa `http-proxy-middleware` para enrutar a cada servicio; también aplica `CorrelationIdMiddleware` (propaga `X-Request-ID`) a todas las rutas.
- `services/{auth,core,alexa}-service/` — un microservicio NestJS por dominio. `core-service` fusiona lo que antes eran brands/content/analytics-service (marcas, campañas, publicaciones, medios, métricas, score, reportes) en un solo servicio; `alexa-service` es el BFF de la Alexa Skill. **Ideas de contenido (`ContentIdea`) se mudó entera a `alexa-service`** (antes vivía en `core-service`) — `alexa-service` no tiene una base de datos propia que migre, pero **sí tiene su propio `prisma/schema.prisma`** (solo el modelo `ContentIdea`) con acceso directo de lectura/escritura a la misma base física de `core-service` (`gestor_redes_core`), nunca corre `prisma migrate` desde ahí (core-service sigue siendo el dueño de esa migración). Para todo lo demás (campañas, marcas, métricas, score, account-linking) `alexa-service` sí es un BFF puro por HTTP contra `core-service`/`auth-service`. `auth-service` y `core-service` cada uno con su propio `main.ts`/puerto/Dockerfile/`package.json`, y **desde 2026-07-23 cada uno con su propio `prisma/schema.prisma` y su propia base de datos** (`gestor_redes_auth`/`gestor_redes_core`, ver `docs/base/modelo2.txt`) — ya no hay schema ni BD compartida entre ellos. Cada uno genera su Prisma Client con `output` propio (`node_modules/.prisma-client`, ver comentario en su `schema.prisma`) para evitar que pnpm resuelva ambos al mismo folder por compartir versión de `@prisma/client`.
- `commons/` — código compartido importado por **path relativo** (no es un workspace package con alias corto), p.ej. `../../../../../commons/types/post-status.enum`. Ya **no** incluye Prisma (el schema único se eliminó junto con la separación de bases; `auth-service`/`core-service`/`alexa-service` además ya duplican localmente en su propio `src/` sus copias de `JwtAuthGuard`/`CurrentUser`/`PostStatus`/`PermissionGuard`/`RequirePermission` en vez de importarlas de aquí — decisión tomada para que cada servicio sea desplegable solo, ver `feat/catalogos-base`; `PermissionGuard` se sumó a esta lista 2026-07-27):
  - `guards/` — `JwtAuthGuard`, `PermissionGuard` (quedan como referencia/histórico — cada servicio corre su propia copia local, ver arriba; `BrandAccessGuard` ya no vive aquí — se movió a `core-service/src/guards/`, ver nota de `brandIds` arriba)
  - `decorators/` — `@CurrentUser()`, `@RequirePermission(module, action)`
  - `interceptors/` — `AuditInterceptor` (escribe en `audit_log`), `LoggingInterceptor`
  - `filters/` — `HttpExceptionFilter`
  - `circuit-breaker/` — factory de `opossum` para llamadas REST entre servicios (ADR-0003, sin mensajería async)
  - `types/` — enums compartidos (`PostStatus`, `Roles`, `Modules`, `Actions`) y `JwtPayload`

Convenciones (`.agents/backend.md`, `agents/conventions.md`):
- Un módulo por dominio dentro de cada microservicio; controllers solo coordinan (request → service → response), la lógica vive en services, Prisma se accede vía repositories.
- Guards en TODOS los endpoints protegidos: `JwtAuthGuard` + `BrandAccessGuard` + `PermissionGuard`. DTOs con `class-validator` en endpoints con body.
- Nunca lanzar HTTP exceptions desde services — solo desde controllers/filters.
- Máquina de estados de posts en `core-service/src/posts/state-machine/` (`post-state-machine.ts` + `transitions.map.ts`): transición inválida → 422, rechazo sin comentario → 400, auto-aprobación (creador == aprobador) → 403.

### Base de datos (`.agents/database.md`)
- Multi-tenancy por row-level: toda tabla de negocio tiene `brand_id UUID NOT NULL` FK → `brands` (ADR-0001); los guards validan pertenencia, no hay schema-per-tenant.
- Soft delete universal (`deleted_at`), `created_at`/`updated_at` en todas las tablas.
- UUID como PK excepto `audit_log` y `post_status_history` (BIGINT autoincrement, inmutables — solo INSERT).
- Auth: JWT RS256/JWKS, multi-rol, denylist de access tokens en Redis (ADR-0004, supera al HS256/rol-único de ADR-0002); access token 15 min, refresh token 7 días de un solo uso con rotación (tabla `refresh_tokens`) (esto sigue vigente de ADR-0002). Payload del JWT: `userId, email, roles[], jti, brandIds[], permissions{}` — `brandIds` hoy siempre `[]` (ver nota en "Modelo de datos vigente": ya no se puede resolver con join local, Brand vive en la BD de core-service).
- **Rotación con detección de reuso (2026-07-27)**: `refresh_tokens` tiene `familyId`/`revokedAt` (ver
  `docs/base/modelo2.txt`). Reusar un token ya consumido/revocado/expirado revoca **toda** la familia,
  incluido el token que ganó la rotación — no solo rechaza el intento inválido. Lógica en
  `AuthRepository.rotateRefreshToken` (transacción: consumir + crear el reemplazo).

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
- ADR-0002: JWT HS256 stateless + refresh rotation, sin Redis/OIDC/JWKS — **superado por ADR-0004**.
- ADR-0003: REST síncrono entre servicios (sin Kafka), circuit breaker `opossum` + `X-Request-ID` propagado.
- ADR-0004: JWT RS256/JWKS + multi-rol + denylist de access tokens en Redis; gateway con rate-limit y
  validación JWT en el edge.

### Documentación adicional
- `docs/architecture.md` — tabla de servicios y ADRs
- `docs/database.md`, `docs/especificacion-funcional-roles.md`, `docs/frontend-functional-documentation.md` — specs funcionales detalladas
- `docs/swagger/*.yaml` — contratos OpenAPI por servicio
- `.planning/pitches/PITCH-0{1..5}-*.md` — shape-up pitches por feature (auth, posts, brands, metrics, extras) con su Definition of Done
