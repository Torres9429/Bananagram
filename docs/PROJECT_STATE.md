# PROJECT_STATE — Estado técnico actual

> **Fecha:** 2026-08-11
> **Rama de trabajo:** `feat/front-back-consumo` (creada desde `origin/develop` @ `1721330` = merge del PR #21 `feat/menus-dinamicos-permisos-reales`)
> **Actualización P0 (2026-08-11):** la fase P0 infra (§18) quedó **implementada en el working tree, sin commitear** (aún no hay commit en la rama): llaves RS256, `.env` completo, fix de CWD de llaves, carga de `.env` en scripts dev/migrate y tests 24/24. Queda pendiente verificar login end-to-end en el navegador y commitear.
> **Propósito:** Fuente de contexto principal para trabajar por fases sin repetir análisis completos. Refleja el estado **actual y verificado en código**, no el deseado.
> **Notas de seguridad:** No se imprimen secretos (solo nombres de variables). Lo no confirmado se marca `pendiente de verificar`.

---

## 1. Estado general del monorepo

- Monorepo pnpm + Turborepo: frontend Next.js 16 (MFE multi-zona), backend NestJS (microservicios), 2 bases PostgreSQL separadas, Redis.
- **IMPORTANTE (historial):** `main` solo contiene el commit inicial (scaffold, 2026-06-29). Todo el avance real vivía en ramas de feature que se fusionaron en `origin/develop`. El trabajo se hace sobre `feat/front-back-consumo` (base `origin/develop`).
- **Respaldo de cambios previos:** los cambios sin commitear que había en `main` (auth.controller, schema.prisma, `commons.zip`, etc.) quedaron respaldados en `git stash` → `stash@{0}: On main: wip-main-scaffold` (recuperables con `git stash pop`).
- `AGENTS.md` existe en la raíz pero **describe la arquitectura vieja (scaffold)**: lista gateway/auth/brands/content/analytics, `JWT_SECRET` HS256, base única, etc. **Debe actualizarse** a la arquitectura real (auth/core/alexa, RS256/JWKS, 2 DBs, Redis, Ayrshare).
- Fuentes de verdad ya existentes en el repo: `docs/base/modelo2.txt`, `docs/swagger/core-service.yaml`, `docs/swagger/auth-service.yaml`, `.claude/INVENTORY.md`, `docs/backend/guia-nuevos-modulos-backend.md`.

## 2. Estructura y servicios existentes

**Backend** (`apps/backend/`):

| Carpeta | Estado |
|---|---|
| `gateway` | Vivo, funcional (proxy real + rate-limit + JWT edge) |
| `services/auth-service` | Vivo, funcional, **bien cableado** |
| `services/core-service` | Vivo, funcional (fusión de brands/content/analytics) |
| `services/alexa-service` | Vivo pero **solo stubs** (sin endpoints reales) |
| `services/brands-service` | **MUERTO/resto** — solo `dist/` + `node_modules`, sin package.json/tsconfig/src. No lo toma turbo. |
| `services/content-service` | **MUERTO/resto** — igual |
| `services/analytics-service` | **MUERTO/resto** — igual |
| `commons` | Guard/decorator legacy sin package.json; **nada se importa en runtime** |

**Frontend** (`apps/frontend/`): `web-shell` (host, 3200 hoy, ver §3), `auth-front` (3012), `admin-front` (3010), `brands-front` (3013), `posts-front` (3014), `analytics-front` (3011), `commons` (`@repo/ui`).

## 3. Puertos

| Servicio | Puerto |
|---|---|
| web-shell (front) | 3200 |
| auth-service | 3001 |
| core-service | 3002 |
| alexa-service | 3004 |
| api-gateway | 4000 |
| postgres (host) | 5433 (2 DBs: `gestor_redes_auth`, `gestor_redes_core`) |
| redis | 6379 |
| adminer | 8080 |
| MFEs front | 3010–3014 |

- El puerto **3000 lo ocupa grafana (proceso local)** en esta máquina, por eso web-shell corre en **3200** (`PORT=3200` en `apps/frontend/web-shell/.env.local` y `NEXT_PUBLIC_WEB_SHELL_URL=http://localhost:3200` en los `.env.local` de las zonas). ⚠️ **Decisión pendiente:** apagar grafana y volver web-shell a 3000 (y ajustar `NEXT_PUBLIC_WEB_SHELL_URL`) antes de subir los cambios.

## 4. Estado actual del Gateway (`apps/backend/gateway`)

- `main.ts`: NestJS con `http-proxy-middleware`, `bodyParser:false`, `enableCors()`, opción `TRUST_PROXY`.
- Cadena de middlewares en orden manual: `RateLimitMiddleware` → `JwtEdgeMiddleware` → `CorrelationIdMiddleware` → proxies → router Nest.
- `JwtEdgeMiddleware` valida JWT en el edge; rutas **públicas** (`PUBLIC_EXACT`): `/health`, `/favicon.ico`, `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/password-reset/request`, `/api/auth/password-reset/confirm`. `logout` NO es pública.
- Proxies (`/api/*` → servicio):
  - `/api/auth`, `/api/me`, `/api/admin` → auth-service (3001)
  - `/api/catalogs`, `/api/brands`, `/api/campaigns`, `/api/posts`, `/api/reports`, `/api/ideas` → core-service (3002)
  - alexa-service configurado en compose (3004) pero sin rutas.
- `GET /health` → `{ status:'ok', timestamp }` (único controller propio del gateway).
- CORS: `enableCors()` sin opciones → `origin:*`. ⚠️ A verificar si conviene restringir para el flujo con cookies.

## 5. Estado actual de auth-service (`apps/backend/services/auth-service`)

- AppModule **cableado**: `AuthModule`, `PermissionsModule`, `AdminModule`, `ProfileModule`.
- `main.ts`: prefijo global `/api` **excluyendo** `/.well-known/jwks.json` (queda en raíz del origen). Swagger en `/api` y `/docs` (Scalar).
- **No usa ConfigModule**: lee `process.env` directo (relevante para cargar `.env`).
- Firma JWT: **RS256** (jose `SignJWT`) — auth-service es el único que tiene la llave privada. Publica JWKS en `/.well-known/jwks.json`.
- Denylist de tokens revocados vía Redis (`revoked:access:{jti}`) + tabla `RevokedAccessToken` en Postgres.
- Refresh token: rotación con detección de reuso (`NOT_FOUND` / `REUSED` / `ROTATED`), TTL 7d.
- **No hay endpoint de activación** (register auto-activa).

## 6. Estado actual de core-service y alexa-service

**core-service** (`apps/backend/services/core-service`):
- AppModule cableado; `ConfigModule.forRoot()` (isGlobal). Prefijo `/api`, Swagger `/api` + `/docs`.
- Domains: brands, campaigns, catalogs, posts, reports, ideas, social-accounts, internal (user-profiles).
- **NO existe controller de metrics/score.** `ScoreService`, `MetricsCronService`, `PostSchedulerService` **no están registrados** en ningún módulo (no se computa ni expone score; el cron de métricas y el scheduler de posts no corren).
- Ayrshare requerido en `POST /brands` y `POST /brands/:id/social-accounts/sync` (si faltan `AYRSHARE_*` → 500 "Falta configurar AYRSHARE_*").

**alexa-service** (`apps/backend/services/alexa-service`):
- AppModule existe, pero `CampaignsController` e `IdeasController` son **stubs vacíos** (solo `@UseGuards(JwtAuthGuard)` a nivel clase, sin endpoints). Traducción de intents no implementada.

**Brands-service / content-service / analytics-service:** restos muertos (ver §2), **no ejecutables**.

## 7-8. Endpoints

### 7. Endpoints definidos (código)

**auth-service** (rutas con prefijo global `/api`):

| Método | Ruta | Guards | Permiso | Público |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | — | ✅ |
| POST | `/api/auth/login` | — | — | ✅ |
| POST | `/api/auth/refresh` | — | — | ✅ |
| POST | `/api/auth/password-reset/request` | — | — | ✅ |
| POST | `/api/auth/password-reset/confirm` | — | — | ✅ |
| POST | `/api/auth/logout` | JwtAuthGuard | — | ❌ |
| GET | `/api/auth/me` | JwtAuthGuard | — | ❌ |
| GET | `/.well-known/jwks.json` | — | — | ✅ (raíz, fuera de `/api`) |
| GET | `/api/admin/roles` | JwtAuthGuard + PermissionGuard | `privilegios:ver` | ❌ |
| GET | `/api/admin/roles/:id` | JwtAuthGuard + PermissionGuard | `privilegios:ver` | ❌ |
| GET | `/api/admin/modules` | JwtAuthGuard + PermissionGuard | `privilegios:ver` | ❌ |
| GET | `/api/admin/actions` | JwtAuthGuard + PermissionGuard | `privilegios:ver` | ❌ |
| PATCH | `/api/admin/roles/:id/permissions` | JwtAuthGuard + PermissionGuard | `privilegios:editar` | ❌ |
| GET | `/api/admin/users` | JwtAuthGuard + PermissionGuard | `usuarios:ver` | ❌ |
| GET | `/api/admin/users/:id` | JwtAuthGuard + PermissionGuard | `usuarios:ver` | ❌ |
| POST | `/api/admin/users` | JwtAuthGuard + PermissionGuard | `usuarios:crear` | ❌ |
| PATCH | `/api/admin/users/:id` | JwtAuthGuard + PermissionGuard | `usuarios:editar` | ❌ |
| DELETE | `/api/admin/users/:id` | JwtAuthGuard + PermissionGuard | `usuarios:eliminar` | ❌ |
| POST | `/api/admin/users/:id/roles` | JwtAuthGuard + PermissionGuard | `usuarios:editar` | ❌ |
| DELETE | `/api/admin/users/:id/roles` | JwtAuthGuard + PermissionGuard | `usuarios:editar` | ❌ |
| GET | `/api/me/permissions` | JwtAuthGuard | — | ❌ |
| PATCH | `/api/me/profile` | JwtAuthGuard | — | ❌ |

DTOs clave: `LoginDto{email,password}` · `RegisterDto{email,password,name,avatarUrl?,roleName('cliente'|'cm'|'disenador'),categoryIds?,specialtyIds?}` · `RefreshDto{refreshToken}`.

**core-service** (rutas con prefijo global `/api`):

| Método | Ruta | Guards | Permiso |
|---|---|---|---|
| GET | `/api/brands` | JwtAuthGuard + PermissionGuard | `marcas:ver` |
| GET | `/api/brands/:id` | + BrandAccessGuard | `marcas:ver` |
| POST | `/api/brands` | JwtAuthGuard + PermissionGuard | `marcas:crear` (Ayrshare) |
| PATCH | `/api/brands/:id` | + BrandAccessGuard | `marcas:editar` |
| DELETE | `/api/brands/:id` | + BrandAccessGuard | `marcas:eliminar` |
| GET | `/api/brands/:brandId/social-accounts` | + BrandAccessGuard | `marcas:ver` |
| POST | `/api/brands/:brandId/social-accounts/sync` | + BrandAccessGuard | `marcas:editar` (Ayrshare) |
| GET | `/api/campaigns` | JwtAuthGuard + PermissionGuard | `campanas:ver` |
| GET | `/api/campaigns/eligible-community-managers` | JwtAuthGuard + PermissionGuard | `campanas:ver` |
| GET | `/api/campaigns/eligible-designers` | JwtAuthGuard + PermissionGuard | `campanas:ver` |
| GET | `/api/campaigns/:id` | JwtAuthGuard + PermissionGuard | `campanas:ver` |
| PATCH | `/api/campaigns/:id` | JwtAuthGuard + PermissionGuard | `campanas:editar` |
| PATCH | `/api/campaigns/:id/assign-designer` | JwtAuthGuard + PermissionGuard | `campanas:editar` |
| DELETE | `/api/campaigns/:id` | JwtAuthGuard + PermissionGuard | `campanas:eliminar` |
| GET/POST/PATCH/DELETE | `/api/catalogs/categories[/:id]` | JwtAuthGuard + PermissionGuard | `catalogos:ver/crear/editar/eliminar` |
| GET/POST/PATCH/DELETE | `/api/catalogs/social-networks[/:id]` | JwtAuthGuard + PermissionGuard | `catalogos:ver/crear/editar/eliminar` |
| GET/POST/PATCH/DELETE | `/api/catalogs/specialties[/:id]` | JwtAuthGuard + PermissionGuard | `catalogos:ver/crear/editar/eliminar` |
| POST | `/api/posts` | JwtAuthGuard + PermissionGuard | `publicaciones:crear` |
| POST | `/api/posts/:id/submit-for-review` | JwtAuthGuard + PermissionGuard | `publicaciones:editar` |
| POST | `/api/posts/:id/media` | JwtAuthGuard + PermissionGuard | `publicaciones:editar` (multipart → Cloudinary) |
| GET | `/api/reports` | JwtAuthGuard + PermissionGuard | `reportes:ver` |
| GET | `/api/reports/:id` | JwtAuthGuard + PermissionGuard | `reportes:ver` (solo owner) |
| POST | `/api/reports` | JwtAuthGuard + PermissionGuard | `reportes:exportar` |
| GET | `/api/ideas?campaignId=` | JwtAuthGuard + PermissionGuard | `campanas:ver` |
| GET | `/api/ideas/:id` | JwtAuthGuard + PermissionGuard | `campanas:ver` |
| POST | `/api/ideas` | JwtAuthGuard + PermissionGuard | `campanas:crear` |
| PATCH | `/api/ideas/:id` | JwtAuthGuard + PermissionGuard | `campanas:editar` |
| DELETE | `/api/ideas/:id` | JwtAuthGuard + PermissionGuard | `campanas:eliminar` |
| POST | `/api/internal/user-profiles` | **sin guard** (service-to-service, no vía gateway) | — |

**alexa-service:** sin endpoints (stubs).

### 8. Endpoints realmente registrados/activos

- **Solo los de arriba** de auth-service y core-service están registrados en sus AppModules → son los que responden vía gateway.
- El gateway solo expone `/health` propio + los proxies `/api/*`.
- Los cascarones `web-shell/src/store/api/{metrics,posts,reports,notifications,ai}.api.ts` **no están registrados en ningún store ni importados** → código muerto.
- Score/métricas/scheduler: **no expuestos** (clases sin registrar).

## 9-10. Guards

### 9. Guards existentes y USADOS

| Guard | Ubicación | Verifica | Aplicado en |
|---|---|---|---|
| `JwtAuthGuard` | auth-service `src/guards` | RS256 local + denylist (Redis + Postgres) | logout/me, admin, me/permissions, me/profile |
| `PermissionGuard` | auth-service `src/guards` | `@RequirePermission` vía Reflector | RolesController, UsersController |
| `JwtAuthGuard` | core-service `src/guards` | JWKS remoto (`AUTH_JWKS_URL`) + denylist fail-open | todos salvo `internal` |
| `PermissionGuard` | core-service `src/guards` | `user.permissions[module]` del JWT | todos salvo `internal` |
| `BrandAccessGuard` | core-service `src/guards` | ownerId/cmId/campaignDesigner en DB; bypass admin | brands `:id` (GET/PATCH/DELETE), social-accounts |
| `JwtAuthGuard` | alexa-service `src/guards` | JWKS remoto | controllers stub (sin endpoints) |

### 10. Guards existentes pero NO usados

| Guard/Decorator/Interceptor | Ubicación | Nota |
|---|---|---|
| `JwtAuthGuard` legacy | `commons/guards/jwt-auth.guard.ts` | extiende `AuthGuard('jwt')` (HS256 legacy); **no importado** |
| `PermissionGuard` copia | `commons/guards/permission.guard.ts` | **no importado** |
| `audit.interceptor` | `commons/interceptors/audit.interceptor.ts` | TODO línea 13 (escribir `audit_log`); **no importado** |
| `opossum.factory` | `commons/circuit-breaker/` | **no importado** |

## 11. Roles y permisos

- Roles en BD (`role`/`role_permissions`): `administrador`, `community_manager`, `disenador`, `cliente`.
- Permisos dinámicos en tabla `role_permissions` (rol × módulo × acción), resueltos al login en el JWT como `permissions: Record<modulo, acciones[]>`.
- Slugs de módulo/acción (backend + seed + frontend ya alineados): módulos `catalogos, marcas, publicaciones, calendario, campanas, metricas, score, reportes, usuarios, privilegios`; acciones `ver, crear, editar, eliminar, aprobar, rechazar, exportar, configurar, asignar`.
- `GET /api/me/permissions` → `{ permissions, brandIds }` es la fuente de verdad; **el frontend hoy NO la llama** (lee el claim del JWT).

## 12. Variables de entorno relevantes

`.env.example` ya define el set completo (ver `docker-compose.yml` para overrides por red):

| Variable | Uso |
|---|---|
| `DATABASE_URL_AUTH` / `DATABASE_URL_CORE` | 2 Postgres separadas (host: 5433) |
| `JWT_EXPIRES_IN` | TTL access token (15m) |
| `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` | Llaves RS256 (`./keys/jwt_*.pem`) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | `bananagram-auth` / `bananagram-api` |
| `AUTH_JWKS_URL` | JWKS remoto para core/alexa/gateway (`http://localhost:3001/.well-known/jwks.json`) |
| `REDIS_URL` | Denylist + rate-limit |
| `RATE_LIMIT_WINDOW_SECONDS` / `RATE_LIMIT_MAX` / `TRUST_PROXY` | Rate-limit gateway |
| `AUTH_SERVICE_URL` / `CORE_SERVICE_URL` | Targets del proxy gateway |
| `NEXT_PUBLIC_API_URL` | Base API del frontend (`http://localhost:4000/api`) |
| `PORT` / `NEXT_PUBLIC_WEB_SHELL_URL` | Puerto de web-shell (`3200` hoy, ver §3) y su URL pública. Están en el `.env` raíz y en los `.env.local` de las zonas; **aún no en `.env.example`** (a agregar). |
| `AYRSHARE_API_KEY` / `AYRSHARE_DOMAIN` / `AYRSHARE_PRIVATE_KEY` / `AYRSHARE_API_BASE_URL` | Integración Ayrshare (marcas/social-accounts) |

- El `.env` raíz **ya está actualizado con el set completo** (2026-08-11); ya no es stale.

## 13. Flujo de autenticación frontend → gateway → auth-service

1. `POST /api/auth/login` (público, vía gateway 4000) → `{ accessToken, refreshToken }` donde `refreshToken` es la **fila completa** de `refresh_tokens` (enviar `refreshToken.token` a `/auth/refresh`).
2. Frontend guarda sesión en cookies `bananagram_token` + `bananagram_refresh_token` (`commons/src/session/cookieSession.ts`).
3. Access token: RS256 (jose), claims `sub, email, roles[], brandIds[], permissions, jti`, issuer `bananagram-auth`, audience `bananagram-api`, TTL 15m. Verificado por core/alexa/gateway vía JWKS.
4. Middlewares de sesión (web-shell + admin/brands/posts/analytics; **auth-front no tiene**): validan presencia/expiro del JWT + refresh silencioso en 401 (single-flight, `authenticated-base-query.ts`). Es comodidad de UX, **no** verificación de firma (el enforcement real es por servicio vía JWKS).
5. Logout: revoca `jti` (denylist Redis + Postgres) y borra cookies.
6. `GET /api/auth/me` y `GET /api/me/permissions` protegidos por JwtAuthGuard.

## 14. Diferencias / incompatibilidades detectadas (front ↔ back)

- ~~**`.env` raíz desactualizado**~~ **RESUELTO (2026-08-11):** el `.env` ya trae el set completo (§12); `JWT_SECRET` sigue sin usarse (RS256).
- ~~**Llaves JWT no generadas:** `keys/` solo contiene `.gitkeep`.~~ **RESUELTO (2026-08-11):** `keys/jwt_private.pem` + `keys/jwt_public.pem` generados.
- **Bug campañas (frontend):** `profile/campaigns/[campaignId]/page.tsx` busca los UUID reales en `MOCK_CAMPAIGNS` y cae a `MOCK_CAMPAIGNS[0]` → muestra datos falsos con IDs reales. Lo mismo afecta team/calendar.
- **Menú dinámico:** el frontend filtra items hardcodeados con `usePermissions()` (claims del JWT) y **no llama** `GET /me/permissions` (AGENTS.md lo pide).
- **`auth-front` sin middleware de sesión** (a diferencia de las otras 4 zonas).
- **Register/activate/forgot/reset:** siguen 100% mock en el frontend, aunque el backend ya expone `POST /api/auth/register`, `password-reset/request`, `password-reset/confirm`. El backend NO tiene endpoint de activación (register auto-activa).
- **Score/métricas:** el frontend (analytics-front + dashboard) consume `MOCK_*`; el backend no expone endpoint de score/métricas (servicios sin registrar).
- **Tipos frontend ↔ DTOs backend:** alineados (CampaignStatus, CatalogItem soft-delete, AuthResponse, roles.enum). JWT real trae `brandIds` (mock usaba `ownedBrandIds`) — ya manejado en `auth.slice.ts`.
- **CORS gateway:** `enableCors()` sin opciones (`origin:*`) — pendiente de verificar si conviene ajustarlo para el flujo de cookies.
- **Refresh (frontend authApi):** `authApi` usa baseQuery plano sin refresh-on-401 (el de refresh está en `createAuthenticatedBaseQuery`, usado por catalogs/campaigns/brands).

## 15. Problemas conocidos

1. ~~**CRÍTICO — Llaves RS256 no existen**~~ **RESUELTO (2026-08-11):** `pnpm generate-keys` ejecutado; `keys/jwt_private.pem` + `keys/jwt_public.pem` existen y auth-service bootea.
2. ~~**CWD mismatch de llaves:**~~ **RESUELTO (2026-08-11):** `resolveKeyPath()` en `token-signer.service.ts` sube de directorio hasta encontrar `keys/*.pem`, válido para turbo (CWD=paquete), tests (`apps/backend/test`) y `pnpm dev` (raíz). En Docker la ruta configurada existe y no cambia nada.
3. ~~**`.env` raíz stale:**~~ **RESUELTO (2026-08-11):** actualizado con el set completo §12.
4. **auth-service sin ConfigModule/dotenv:** lee solo `process.env`. **Mitigado (2026-08-11)** haciendo que los scripts `dev` y `db:migrate` de gateway/auth/core/alexa carguen el `.env` raíz vía `node --env-file-if-exists=../../../.env` (o `../../../../` según profundidad). No usa ConfigModule.
5. **Register/activate incompleto:** no hay endpoint de activación en backend; el frontend sigue con flujo mock.
6. **Score/métricas/scheduler sin registrar** en core-service → no corren ni se exponen.
7. **`commons/` backend muerto:** guards legacy + `audit.interceptor` con TODO → no usados.
8. ~~**Tests bloqueados**~~ **RESUELTO (2026-08-11): 24/24 passing** (`auth.integration`, `campaigns-flow`, `posts-flow`). Fixes: `moduleRef.init()` (dispara `onModuleInit` y carga las llaves), `moduleRef.close()` (cierra Redis/ioredis y deja terminar a jest), y verificación de orden de media vía `order` de `post_media` (evita el `orderBy createdAt` ambiguo). Nota vigente: `auth.helper.ts` sigue con HS256 legacy (`generateTestToken`); los guards nuevos no lo usan.
9. **Bug visual campañas** (§14) — IDs reales + datos mock.
10. **`authApi` sin refresh-on-401** en el slice de auth (solo los slices con `createAuthenticatedBaseQuery`).

## 16. Piezas que deben conectarse

- Frontend ↔ backend ya conectado: **login** (cookies + refresh), **catálogos** (CRUD list/create/delete), **campañas** (list/get/create/assign), **marcas** (list/detail read-only).
- Falta conectar: **posts** (backend existe), **métricas/score/dashboard** (requiere exponer backend), **reportes** (backend existe), **register/activate/forgot/reset** (mutations ya existen en `authApi`), **notificaciones**, **ideas**.
- **Catálogos/campañas parciales:** mutations de update/delete definidas pero sin UI (editar categoría/especialidad/red social, eliminar red social; update/delete/remove-designer de campaña).
- **Menú dinámico** desde `/me/permissions`.
- **auth-front** middleware de sesión.
- Wire-up de los 5 cascarones `web-shell/src/store/api/*` (hoy vacíos) o eliminarlos.
- Score: registrar `ScoreService` + controller, `MetricsCronService`, `PostSchedulerService`.

## 17. Trabajo pendiente

- ~~Generar llaves + corregir `.env`~~ **✅ hecho (2026-08-11)**. Queda **verificar login end-to-end** en navegador y commitear la P0 (requisito para seguir).
- ~~Corregir CWD de llaves (dev + tests)~~ **✅ hecho (2026-08-11):** `resolveKeyPath()` en `token-signer.service.ts` + `--env-file-if-exists` en scripts dev/migrate. Tests 24/24.
- Corregir bug de detalle de campaña (quitar fallback `MOCK_CAMPAIGNS[0]`).
- Conectar my-campaigns, calendar, team, marcas anidadas (score/metrics/calendar/reports).
- Conectar posts (list/detail/approvals/new) a core-service.
- Exponer y consumir métricas/score.
- Migrar register/activate/forgot/reset a API real.
- Decidir y documentar uso de `/me/permissions` para el menú.
- Actualizar `AGENTS.md` a la arquitectura real.
- (Limpieza opcional) borrar servicios muertos y `commons.zip`; borrar o implementar cascarones RTK.

## 18. Prioridad recomendada

| Prioridad | Tarea | Por qué |
|---|---|---|
| ~~P0~~ ✅ | ~~`pnpm generate-keys` + arreglar `.env`~~ | **Hecho (2026-08-11):** llaves y `.env` completos. |
| ~~P0~~ ✅ | ~~Corregir CWD de llaves (dev + tests)~~ | **Hecho (2026-08-11):** `resolveKeyPath()` + `--env-file-if-exists`; tests 24/24. |
| **P0** | Verificar login end-to-end en el navegador (web-shell → auth-front → gateway → auth-service → cookies) | Es el habilitador de todos los módulos. **Pendiente** (requiere `pnpm dev` + navegador). |
| **P1** | Corregir bug detalle de campaña + conectar team/calendar/my-campaigns | Bug visible con datos falsos; cierra el módulo campañas. |
| **P1** | UI de editar/eliminar catálogos (mutations ya existen) | Cierra el módulo catálogos. |
| **P1** | Conectar posts (backend ya listo) | Módulo principal del producto. |
| **P1** | Register/forgot/reset reales | Cierra el ciclo de auth (la activación requiere decisión de backend). |
| **P2** | Exponer score/métricas en core-service + conectar analytics/dashboard | Requiere trabajo backend + frontend. |
| **P2** | Reportes, notificaciones, ideas | Menos crítico. |
| **P2** | Menú dinámico con `/me/permissions`, middleware en auth-front, limpieza de mocks/muertos | Refinamiento y alineación con AGENTS.md. |

## 19. Progreso por módulo

Leyenda: ⬜ Pendiente · 🟡 En progreso · 🟢 Implementado · 🔵 Probado end-to-end · 🔴 Bloqueado

| Módulo | Estado | Notas |
|---|---|---|
| Login real (front↔back) | 🟡 En progreso | Llaves + `.env` + CWD resueltos (2026-08-11); falta verificar login end-to-end en navegador |
| Sesión / cookies / refresh | 🟡 En progreso | Implementado en commons y 4 zonas; falta middleware en auth-front |
| Menú dinámico (`/me/permissions`) | 🟡 En progreso | Usa claims del JWT; no llama el endpoint |
| Catálogos (admin-front) | 🟡 En progreso | List/create/delete ✅; falta UI de update/delete red social |
| Campañas (brands-front) | 🟡 En progreso | List/get/create/assign ✅; bug detalle; falta update/delete/team/calendar/my-campaigns |
| Marcas (brands-front) | 🟡 En progreso | List/detail ✅ read-only; anidados (score/metrics/calendar/reports) en mock |
| Posts (posts-front) | ⬜ Pendiente | Backend listo; frontend 100% mock |
| Métricas / Score / Dashboard | ⬜ Pendiente | Backend sin exponer + frontend mock |
| Reportes | ⬜ Pendiente | Backend listo; frontend mock (export cliente) |
| Ideas | ⬜ Pendiente | Solo backend; sin páginas frontend |
| Notificaciones | ⬜ Pendiente | Hook devuelve `[]` |
| Register / activate / forgot / reset | 🟡 En progreso | Register/reset existen en backend; frontend mock |
| Infra backend (llaves, `.env`, tests, servicios muertos) | 🟡 En progreso | P0 llaves/`.env`/CWD/tests ✅ (24/24, 2026-08-11); falta limpiar servicios muertos + commitear |
| Alexia (alexa-service) | ⬜ Pendiente | Solo stubs |

---

## 20. Cómo arrancar (referencia rápida)

```bash
pnpm install
docker compose up -d            # postgres(5433) + adminer + redis
pnpm generate-keys              # crea keys/jwt_private.pem + jwt_public.pem
cp .env.example .env            # y ajustar valores (ver §12)
pnpm db:generate && pnpm db:migrate && pnpm seed
pnpm dev                        # o: pnpm dev:backend + pnpm dev:frontend
```

Acceso: frontend http://localhost:3000 · Gateway http://localhost:4000 · Swagger auth/core: `http://localhost:3001/docs`, `http://localhost:3002/docs`.
