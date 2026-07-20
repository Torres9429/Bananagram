# INVENTORY.md — Mapa detallado del código (para Claude)

Este archivo es un inventario exhaustivo de rutas, endpoints, componentes, tipos y estado real de cada
paquete del monorepo. Se generó leyendo el código fuente completo (no se infiere nada). Complementa a
`.claude/CLAUDE.md` (que da la arquitectura general y las reglas críticas) con el detalle fino que
`CLAUDE.md` no incluye para no inflar el contexto de cada sesión.

**Cuándo leer este archivo**: antes de tareas puntuales tipo "agrega un endpoint a X", "crea un componente
para Y", "consume tal servicio desde tal front", "elimina/cambia el flujo de Z" — así no hay que re-explorar
el árbol de archivos correspondiente.

**Última actualización**: 2026-07-18. Si el código diverge de lo aquí descrito, confía en el código y
actualiza este archivo.

---

## 0. Estado real de implementación (léase primero — es la sorpresa más grande del repo)

Este proyecto está en etapa de **scaffold**: la estructura de carpetas/módulos/DTOs está creada según las
convenciones (`agents/conventions.md`), pero la mayoría de las piezas todavía no están conectadas entre sí.
Antes de asumir que algo "ya funciona", verifica contra esta lista:

### Backend — nada expone rutas de negocio todavía
- **Los 4 microservicios (`auth`, `brands`, `content`, `analytics`) tienen `AppModule` con `imports: []`**
  y un comentario `// TODO: importar módulos de dominio`. Es decir: `AuthModule`, `PermissionsModule`,
  `CampaignsModule`, `ReportsModule` existen como clases pero **no están registrados** — al levantar
  cualquiera de estos servicios hoy, no responden en ninguna ruta de negocio (solo Swagger vacío en
  `/docs` y el prefijo global `api`).
- **El gateway no proxea nada.** `http-proxy-middleware` está en `package.json` pero no se usa en ningún
  archivo. `apps/backend/gateway/src/app.module.ts` solo registra `HealthController` (`GET /health`) +
  `CorrelationIdMiddleware`. No hay ruta que reenvíe a los microservicios.
- **`brands-service/campaigns`** (controller/service/module/DTOs) son clases completamente vacías —
  `@Controller('campaigns') export class CampaignsController {}`, sin métodos, sin lógica.
- **`analytics-service/reports`** — mismo caso: `ReportsController`/`ReportsService`/`ReportsModule`
  vacíos, `CreateReportDto` vacío.
- **`content-service` no tiene ningún controller** — solo existe la lógica de dominio sin exponer:
  `post-state-machine.ts` + `transitions.map.ts` (válido, real), `char-limits.map.ts` (real),
  `PostSchedulerService` (cron real, `@Cron('* * * * *')`, publica posts `programado`→`publicado`, pero
  no es alcanzable por HTTP).
- **Lo que SÍ es lógica de negocio real y completa** (aunque inalcanzable por HTTP hoy):
  - `content-service`: máquina de estados de posts, límites de caracteres por red.
  - `analytics-service/score/score.service.ts`: `ScoreService.calculate(brandId)` — **calcula y persiste**
    en `brand_scores`. Fórmula real: `score = consistency×0.30 + engagement×0.40 + coverage×0.20 + frequency×0.10`
    — **esto difiere del texto en `CLAUDE.md`** (`Consistencia×0.30 + Engagement×0.40 + Frecuencia×0.30`,
    sin término de cobertura). Si te piden tocar el score, confirma con el usuario cuál fórmula es la
    vigente antes de asumir.
  - `analytics-service/cron/metrics-cron.service.ts` (`@Cron('0 */6 * * *')`) + `metrics/decay-simulator.ts`
    — generan métricas simuladas con decaimiento exponencial, real y funcional.
  - `auth-service`: `AuthController`/`AuthService`/`AuthRepository` completos (login, refresh, logout, me),
    `PermissionsController` (`GET /me/permissions`) — todos con código real, solo falta el `imports` en
    `AppModule` para quedar accesibles.
  - **Bug conocido**: `AuthService.refresh()` re-llama `this.login({ email, password: '' })` con contraseña
    vacía (`// TODO: refactor` en el propio código) — el `bcrypt.compare` fallará siempre. No es apto para
    producción tal cual está.
- Ningún controller usa `PermissionGuard` ni `BrandAccessGuard` todavía (solo `JwtAuthGuard` en
  `auth-service`). Los guards existen y son correctos, pero no están aplicados con `@UseGuards(...)`.
- `AuditInterceptor` tiene un `// TODO: escribir en audit_log con before/after, actor, requestId` — el
  interceptor detecta requests mutantes pero no escribe nada aún.

### Frontend — todo corre en modo mock, cero llamadas HTTP reales
- **Ningún microfrontend hace fetch/axios a un backend real.** Todos renderizan sobre arrays/objetos
  mock en memoria (`src/lib/mock-data.ts` de cada app), mutados con `useState` local (se pierde al
  refrescar).
- **Autenticación real (para el usuario final) es 100% client-side mock**: `apps/frontend/commons/src/mocks/`
  (`mock-users.ts`, `findUserByEmail`/`findUserByCredentials`, `mock-tokens.ts`, `build-user-token.ts`)
  generan un JWT **sin firmar** (`buildTokenFromUser`, sufijo `.mock-signature`) y lo guardan en una
  cookie compartida `bananagram_token` (`session/cookieSession.ts`) — no HttpOnly, pensada para
  reemplazarse por una cookie real cuando exista backend (comentado explícitamente en el código).
- **7 RTK Query slices en `web-shell/src/store/api/`** (`ai`, `brands`, `campaigns`, `metrics`,
  `notifications`, `posts`, `reports`) están creadas con `createApi(...)` pero **`endpoints: () => ({})`**
  — sin endpoints, y **ni siquiera están registradas en el store** (`web-shell/src/store/index.ts` solo
  registra `authReducer`/`authApi`, ambos de `@repo/ui/state`). Son el andamiaje obvio para conectar el
  backend real más adelante.
- El único slice de API con endpoints reales es `authApi` (`apps/frontend/commons/src/api/auth.api.ts`,
  exportado desde `@repo/ui/state`): `POST auth/login`, `POST auth/register` contra `API_BASE_URL`
  (`http://localhost:4000/api` por defecto) — pero nada en el frontend los usa hoy (el login usa el mock).
- `middleware.ts` de `web-shell` es un passthrough total (comentario: guard por cookie desactivado hasta
  conectar backend real). Ningún otro front tiene `middleware.ts`. Toda protección de rutas es client-side
  vía `usePermissions()`/`ProtectedAction` (de `@repo/ui/ui`), no hay enforcement de servidor.
- **Bug conocido**: `apps/frontend/brands-front/src/app/profile/campaigns/[campaignId]/page.tsx` referencia
  `POSTS_FRONT_URL` sin importarlo (solo `ZONE_URLS` está importado) — lanza `ReferenceError` si se hace
  click en ese botón. El fix correcto es usar `ZONE_URLS.postsFront`.
- Los datos mock **no están sincronizados entre zonas**: `brands-front` y `posts-front` tienen cada uno su
  propio `MOCK_CAMPAIGNS`/`SocialAccount` con IDs parecidos (`c1`, `bp1`...) pero formas distintas — no hay
  una fuente única. Documentado explícitamente en comentarios del código.
- Rutas marcadas como legacy/deprecadas (redirigen a `/profile`): `brands-front` → `/my-brand`,
  `/onboarding`, y el árbol `/brands/[id]/*` (se mantiene solo por compat/nav de Admin).

**Implicación práctica**: si te piden "conectar X con el backend" o "hacer que Y llame al servicio real",
el trabajo típico es (a) registrar el módulo de dominio correspondiente en el `AppModule` del
microservicio, (b) si falta lógica de controller, escribirla siguiendo el patrón de `auth-service`,
(c) en el gateway, añadir el proxy real con `http-proxy-middleware` (aún no existe ningún ejemplo de esto
en el repo — habría que crearlo desde cero), (d) en el front, rellenar el slice `store/api/*.ts`
correspondiente con endpoints reales y reemplazar el `useState`/mock-data por hooks generados de RTK Query.

---

## 1. Backend

### 1.1 Gateway (`apps/backend/gateway/`, puerto 4000, paquete `@repo/api-gateway`)
- `src/main.ts` — `NestFactory.create(AppModule)`, `app.enableCors()`, `listen(4000)`. Sin Swagger, sin prefix global.
- `src/app.module.ts` — `controllers: [HealthController]`, aplica `CorrelationIdMiddleware` a `'*'`.
- `src/health/health.controller.ts` — `GET /health` → `{ status: 'ok', timestamp }`.
- `src/middleware/correlation-id.middleware.ts` — genera/propaga `X-Request-Id` (uuid) en cada request.
- Dependencia `http-proxy-middleware` presente pero **sin uso** (ver §0).

### 1.2 `commons` compartido por los 4 microservicios (`apps/backend/commons/`, paquete `@repo/prisma`, se importa por **ruta relativa**, no por nombre de paquete)
- `prisma/schema.prisma` — schema único, 18 tablas (ver `.agents/database.md` y sección 1.7 abajo).
- `prisma/client.ts` — instancia compartida de `PrismaClient` (`export const prisma = new PrismaClient()`), usada directamente en repositories/services (no hay capa repository formal en todos los servicios — `auth-service` sí tiene `AuthRepository`, el resto llama `prisma.*` directo en el service).
- `guards/jwt-auth.guard.ts` — `JwtAuthGuard extends AuthGuard('jwt')`.
- `guards/permission.guard.ts` — lee metadata `@RequirePermission(module, action)`, valida `user.permissions[module].includes(action)`, si no `ForbiddenException`.
- `guards/brand-access.guard.ts` — valida `request.params.brandId ?? request.params.id` contra `user.brandIds[]`.
- `decorators/current-user.decorator.ts` — `@CurrentUser()` → `request.user`.
- `decorators/require-permission.decorator.ts` — `@RequirePermission(module, action)` (SetMetadata).
- `interceptors/audit.interceptor.ts` — detecta POST/PUT/PATCH/DELETE, **TODO sin implementar** (no escribe en `audit_log` aún).
- `interceptors/logging.interceptor.ts` — loguea `METHOD url — Nms` con `Logger('HTTP')`.
- `filters/http-exception.filter.ts` — formatea `HttpException` a `{statusCode, timestamp, path, message}`.
- `circuit-breaker/opossum.factory.ts` — `createCircuitBreaker(fn, options)` con defaults `timeout:5000, errorThresholdPercentage:50, resetTimeout:30000`. No hay ningún caller todavía (REST síncrono entre servicios aún no implementado, ADR-0003).
- `types/jwt-payload.type.ts` — `JwtPayload { sub, email, role, brandIds: string[], permissions: Record<string,string[]> }`.
- `types/roles.enum.ts` — `Role { ADMINISTRADOR='administrador', COMMUNITY_MANAGER='community_manager', DISENADOR='disenador', CLIENTE='cliente' }`.
- `types/modules.enum.ts` — `AppModule { MARCAS, PUBLICACIONES, CALENDARIO, CAMPANAS, METRICAS, SCORE, REPORTES, USUARIOS, PRIVILEGIOS }` (slugs en español, distinto del enum de módulos del frontend que usa slugs en inglés — ver §2.1).
- `types/actions.enum.ts` — `AppAction { VER, CREAR, EDITAR, ELIMINAR, APROBAR, RECHAZAR, EXPORTAR, CONFIGURAR, ASIGNAR }` (también en español, distinto del frontend).
- `types/post-status.enum.ts` — `PostStatus { BORRADOR, EN_REVISION, APROBADO, RECHAZADO, PROGRAMADO, PUBLICADO }`.

### 1.3 `auth-service` (puerto 3001, paquete `@repo/auth-service`)
**Módulo NO registrado en `AppModule`** (ver §0), pero el código es real y completo:
- `POST auth/login` — `LoginDto { email (IsEmail), password (IsString, MinLength(6)) }` → `{accessToken, refreshToken}`. Valida contra `prisma.user` (bcrypt), arma `permissions` desde `role_permissions`, `brandIds` desde `brand_users`.
- `POST auth/refresh` — `RefreshDto { refreshToken: string }` → **bug**: re-llama login con password vacía (ver §0).
- `POST auth/logout` — requiere `JwtAuthGuard`, revoca todos los refresh tokens del usuario.
- `GET auth/me` — requiere `JwtAuthGuard`, devuelve el payload del JWT tal cual.
- `GET me/permissions` (`PermissionsController`) — requiere `JwtAuthGuard`, devuelve `{ permissions, brandIds }` del JWT. **Esta es la ruta que el frontend consulta como fuente de verdad del menú** (`GET /me/permissions`, documentado en `CLAUDE.md`).
- `PermissionsService.updateRolePermission(roleId, moduleId, actionId, allowed)` — lógica de upsert en `role_permissions` lista, pero **sin controller/endpoint que la exponga** todavía (no hay `PATCH /roles/privileges` ni similar — el frontend `admin-front/roles` ya tiene el UI mock listo para consumir algo así, ver §2.4).
- Refresh tokens: 7 días, single-use, `usedAt` marca consumo (`AuthRepository.markTokenUsed`).
- `JwtStrategy` — extrae Bearer token, secret `JWT_SECRET` env (fallback `'supersecret'`), `validate(payload) { return payload }` (sin verificación adicional de usuario existente).

### 1.4 `brands-service` (puerto 3002, paquete `@repo/brands-service`)
- **Único módulo de dominio scaffoldeado**: `campaigns/` — controller/service/module/DTOs **totalmente vacíos** (ver §0). No hay nada más en este servicio (no hay módulo de `brands`/`brand-profiles`/`brand-users` pese a que el schema Prisma sí los define).

### 1.5 `content-service` (puerto 3003, paquete `@repo/content-service`)
- **Sin ningún controller.** Solo lógica de dominio pura:
  - `posts/state-machine/transitions.map.ts` — `VALID_TRANSITIONS`: `borrador→en_revision→{aprobado|rechazado}`, `aprobado→programado→publicado`, `rechazado→borrador`, `publicado→[]` (terminal).
  - `posts/state-machine/post-state-machine.ts` — `validateTransition(from, to, comment?, createdBy?, userId?)`: transición inválida → `422`; `to=rechazado` sin `comment` → `400`; `to=aprobado` con `createdBy===userId` → `403` (regla "el creador no puede aprobar", ver `CLAUDE.md`).
  - `char-limits/char-limits.map.ts` — `CHAR_LIMITS`: x=280, instagram=2200, linkedin=3000, facebook=63206, tiktok=2200, youtube=5000.
  - `scheduler/post-scheduler.service.ts` — `@Cron('* * * * *')`, cada minuto publica posts `programado` cuyo `scheduledAt<=now` → `publicado` + `publishedAt`. Real y funcional en cron, pero sin HTTP.

### 1.6 `analytics-service` (puerto 3005, paquete `@repo/analytics-service`)
- `reports/` — controller/service/module/DTO **totalmente vacíos** (ver §0).
- `score/score.service.ts` — `ScoreService.calculate(brandId)`: real, calcula y persiste en `brand_scores`. Componentes: `consistency` (% posts en horario pico 9/12/18/20h), `engagement` (curva por tramos sobre `engagementRate` promedio), `coverage` (% redes activas con ≥1 post), `frequency` (100 − desviación estándar de días entre posts ×10). **Fórmula: `score = consistency×0.30 + engagement×0.40 + coverage×0.20 + frequency×0.10`** — ver discrepancia con `CLAUDE.md` en §0. `classification`: ≤40 'bajo', ≤70 'medio', si no 'alto'.
- `cron/metrics-cron.service.ts` — `@Cron('0 */6 * * *')`, genera `post_metrics` simuladas para posts publicados en los últimos 7 días.
- `metrics/decay-simulator.ts` — `simulateMetrics(followers, baseEngagementRate, publishedAt)`: `likes = followers × baseEngagementRate × e^(-horasDesdePublicado/48) × random[0.8,1.2]`, deriva `comments`/`shares`/`reach`/`engagementRate`.

### 1.7 Modelo de datos (`apps/backend/commons/prisma/schema.prisma`) — resumen de tablas
Identidad/acceso: `Role`, `Module`, `Action`, `RolePermission` (RBAC dinámico), `User`, `RefreshToken`.
Catálogos: `Category`, `Specialty`, `SocialNetwork`, `UserCategory`, `UserSpecialty`.
Marcas: `Brand` (`type: brand|profile`), `BrandProfile` (una fila por red social de una marca), `BrandUser`.
Contenido: `Campaign`, `CampaignTeam`, `CampaignCategory`, `Post`, `PostStatusHistory` (BIGINT, inmutable).
Analítica: `PostMetric`, `BrandScore`, `Report`.
Auditoría: `AuditLog` (BIGINT, inmutable), `Notification`.
Todas las tablas de negocio: `deletedAt` (soft delete), `createdAt`/`updatedAt`, UUID PK excepto `AuditLog`/`PostStatusHistory` (BIGINT autoincrement).

### 1.8 Seed / credenciales demo (`packages/seed/src/index.js`)
Corre con `pnpm seed`. Crea (idempotente, `upsert`):
- 9 módulos / 9 acciones (mismos slugs que `commons/types/modules.enum.ts` / `actions.enum.ts`).
- 4 roles con matriz de permisos: `administrador` (acceso total a todo), `community_manager`
  (`publicaciones: ver/crear/editar`, `calendario: ver/crear/editar`, `campanas: ver/crear/editar/asignar`,
  `metricas/score/reportes: ver`), `disenador` (`publicaciones: ver/crear`, `calendario: ver`, `campanas: ver`),
  `cliente` (`publicaciones: ver/aprobar/rechazar`, `calendario: ver`, `campanas: ver/crear`,
  `metricas/score: ver`, `reportes: ver/exportar`).
- **5 usuarios demo** (mismas credenciales que el modo mock del frontend — ver §2.1):
  | Email | Password | Rol |
  |---|---|---|
  | admin@bananagram.mx | admin123 | administrador |
  | cm@bananagram.mx | cm123456 | community_manager |
  | disenador@bananagram.mx | diseno123 | disenador |
  | cliente@bananagram.mx | cliente123 | cliente |
  | alex@bananagram.mx | alex12345 | cliente |
- Catálogos: 8 categorías, 7 especialidades, 6 redes sociales (IG/TK/FB/X/LI/YT con `baseEngagementRate`).

---

## 2. Frontend

### 2.1 `@repo/ui` (`apps/frontend/commons/`) — paquete workspace compartido por las 6 apps
Exports map (`package.json`): `.` (barrel completo, legacy pero válido), `./ui`, `./theme`, `./state`,
`./types`, `./config`, `./utils`.

**`config/`**
- `zone-urls.ts` — `API_BASE_URL` (env `NEXT_PUBLIC_API_URL` o `http://localhost:4000/api`); `ZONE_URLS`
  (`webShell:3000, adminFront:3010, analyticsFront:3011, authFront:3012, brandsFront:3013, postsFront:3014`,
  cada uno overrideable por env `NEXT_PUBLIC_*_URL`).

**`api/auth.api.ts`** — `authApi` (`reducerPath: 'authApi'`, `fetchBaseQuery({baseUrl: API_BASE_URL, credentials:'include'})`):
| Endpoint | Método | Path | Request | Response |
|---|---|---|---|---|
| `login` | POST | `auth/login` | `{email,password}` | `{accessToken,refreshToken}` |
| `register` | POST | `auth/register` | `{name,email,password}` | `void` |

Sin `tagTypes`. Exporta `useLoginMutation`, `useRegisterMutation`. **Nada en el frontend los usa hoy** (login real usa el mock, ver §0).

**`hooks/`**
- `usePermissions()` → `{ can(module,action), canAny(module,actions[]), permissions }` — lee `selectPermissions` de Redux.
- `useSessionBootstrap()` — al montar, lee cookie `bananagram_token` (`getCookieToken`); si existe `dispatch(setCredentials(...))`, si no `dispatch(logout())`. **El único inicializador de sesión**, usado en `providers.tsx` de las 6 apps.
- `useSession()` — wrapper de `useSelector(selectUser)`.
- `useNotifications()` — **stub**, siempre devuelve `[]` (comentario: reemplazar por `useGetNotificationsQuery` cuando exista backend).

**`session/cookieSession.ts`** — `getCookieToken()`/`setCookieToken(token)`/`deleteCookieToken()`. Cookie
`bananagram_token`, no HttpOnly, `path=/; SameSite=Lax` — deliberado para compartir sesión entre puertos
distintos de `localhost` (cookies son per-host, no per-origin como `localStorage`). Comentario documenta
migrar a cookie HttpOnly real cuando exista backend.

**`state/auth.slice.ts`** (slice `'auth'`) — `AuthState { user, accessToken, permissions, brandIds, isAuthenticated }`.
Actions: `setCredentials({accessToken})` (decodifica JWT vía `decodeJwt`, popula todo el estado),
`logout()` (reset a `initialState`). Selectors: `selectUser`, `selectPermissions`, `selectBrandIds`,
`selectIsAuthenticated`. `state/index.ts` re-exporta esto + `authApi` + `cookieSession` juntos.

**`ui/atoms/`** (7): `CharCounter` (contador de caracteres por red), `LabeledField`/`LabeledSelect`
(inputs con label fijo 44px), `PrimaryButton` (botón dorado `#E0A800`), `ScoreGauge` (gauge circular
Recharts `RadialBarChart`, colorea por `classification`), `SkeletonLoader` (rows/card), `StatusChip`
(chip coloreado por `PostStatus`, exporta `STATUS_COLORS`/`STATUS_LABELS`).

**`ui/molecules/`** (12): `AvailabilityToggle`, `ConfirmDialog` (con variante `destructive`), `EmptyState`,
`FormDialog` (modal genérico header dorado), `InsightCard` (callout por severidad), `MetricCard` (wrapper
de `WidgetCard` con formato numérico), `NotificationBell` (usa `useNotifications`), `PostPreviewDialog`,
`ProfileCompletenessBadge`, `ProtectedAction` (gate por permiso, con delay post-hydration para evitar
mismatch SSR), `TrendCard` (`WidgetCard` + indicador de delta up/down/flat), `WidgetCard` (base KPI card).

**`ui/organisms/`** (4): `DataTable<T>` (tabla genérica con paginación opcional), `RoleSwitcher`
(widget dev para cambiar de rol mock — **actualmente deshabilitado/no importado** en ningún front),
`SidebarNav` (nav colapsable 76↔220px, exporta interface `SidebarNavItem`), `TopBar` (AppBar compartido:
título + `NotificationBell` + logout, usado en las 6 apps).

**`theme/theme.ts`** — tema MUI: paleta dorada (`primary #E0A800`, `secondary #C08E06`), `borderRadius:8`,
tipografía via CSS var `--font-poppins`, overrides de `MuiButton/Paper/AppBar/Dialog/OutlinedInput/
Checkbox/Radio/Switch/Tab/Chip`. `EmotionCacheProvider.tsx` — cache SSR-safe de Emotion para MUI.

**`utils/`** — `downloadBlob(blob,filename)`, `formatDate(date)` (`Intl.DateTimeFormat('es-MX')`),
`getInitials(name)`, `getPostAuthDestination(role)` (**resolver central de redirect post-login**:
ADMINISTRADOR→`webShell/dashboard`, CLIENTE→`brandsFront/profile`, CM/DISENADOR/default→`brandsFront/my-campaigns`).

**`mocks/`** (motor de todo el login actual, ver §0): `mock-users.ts` (`MOCK_USERS`, 5 usuarios —
mismos emails/passwords que el seed backend, ver §1.8 — + `findUserByEmail`/`findUserByCredentials`),
`mock-tokens.ts` (`MOCK_TOKENS` por rol, para `RoleSwitcher`), `build-user-token.ts`
(`buildTokenFromUser(user)` → JWT sin firmar).

**`types/`** — `roles.enum.ts` (`AppRole`: ADMINISTRADOR/COMMUNITY_MANAGER/DISENADOR/CLIENTE — mismos
valores que el backend), `modules.enum.ts` (`AppModule`: USERS, BRANDS *(legacy)*, CATALOGS, POST,
CAMPAIGNS, METRICS, SCORE, REPORTS — **slugs en inglés, distintos de los del backend que están en
español** — ojo si conectas permisos reales, hay que mapear), `actions.enum.ts` (`AppAction`: MANAGE,
CREATE, SCHEDULE, APPROVE, REJECT, PUBLISH, VIEW, VIEW_OWN, EXPORT — también distinto del backend),
`post.types.ts` (`PostStatus`, `Post`, `PostStatusHistory`), `score.types.ts` (`BrandScore`),
`auth.types.ts` (`AuthUser`, `AuthState`, `JwtPayload`, `MockUser`).

### 2.2 `web-shell` (puerto 3000, host MFE, paquete `@repo/web-shell`)
- `next.config.ts` — define todos los `rewrites()` que hacen de web-shell el "gateway" de rutas para las
  5 zonas (ver `.claude/CLAUDE.md` para la tabla completa). `middleware.ts` es passthrough total hoy.
- `/` (`app/page.tsx`, server component) — lee cookie `bananagram_token`, si hay sesión redirige server-side
  a `getPostAuthDestination(role)`; si no, renderiza `LandingTemplate` (landing pública completa: Header,
  Hero, Campaigns, Publications timeline, Calendar mini, Metrics + Score explicativo, Collaboration flow,
  Contact, Footer — todo en `components/landing/{atoms,molecules,organisms,templates}/`, atomic design).
- `/dashboard` (`app/(app)/dashboard/page.tsx`) — **exclusivo de `AppRole.ADMINISTRADOR`**; no-admins son
  redirigidos client-side. Renderiza `DashboardAdmin` únicamente.
- `components/dashboard/`: `DashboardAdmin` (el único wireado a una ruta), `DashboardCliente`,
  `DashboardCM`, `DashboardDisenador` — estos 3 últimos **existen pero no están referenciados por ninguna
  página de este slice del repo** (probablemente pensados para otras zonas o para conectar después).
- `store/api/*.ts` — 7 slices vacíos sin registrar (`ai`, `brands`, `campaigns`, `metrics`,
  `notifications`, `posts`, `reports` — ver §0). `store/index.ts` solo registra `authReducer`/`authApi`.
- `lib/mock-data.ts` — datos para los 4 dashboards (`MOCK_DASHBOARD`, `MOCK_ADMIN_DASHBOARD`,
  `MOCK_CLIENTE_DASHBOARD`, `MOCK_DISENADOR_DASHBOARD`, `MOCK_POSTS_BY_STATUS`, `getMockPostsByNetwork`).
- `components/layout/Sidebar.tsx` — nav con items gateados por `usePermissions().can()`, admin ve solo
  Dashboard+Admin, resto de roles ve todo excepto Dashboard.

### 2.3 `admin-front` (puerto 3010, sirve `/users`, `/roles`, `/audit-log`, `/catalogs/*`)
- `/` → redirect a `/users`.
- `/users` — `DataTable` de `MOCK_USERS`, botón "+ Nuevo usuario" (gate `users:manage`) abre
  `CreateUserDialog` (crea usuario mock, genera URL de activación `${authFront}/activate?email=...` —
  comentario: en producción esto se envía por email).
- `/roles` — editor de matriz de privilegios (gate `users:manage`): tabs por rol, `Accordion` por módulo con
  `Switch` por acción, "Restaurar rol" (`ConfirmDialog`), "Guardar cambios" es mock (comentario: futuro
  `PATCH /roles/privileges {roleKey, module, actions[]}` — nota: `PermissionsService.updateRolePermission`
  en el backend ya tiene la lógica lista para esto, solo falta el controller, ver §1.3).
- `/audit-log` — `DataTable` read-only de `MOCK_AUDIT_LOG`.
- `/catalogs/{categories,social-networks,specialties}` — cada uno usa el componente genérico
  `CatalogList` (nombre + `Switch` activo + "+ Agregar" con `FormDialog`).
- Componentes propios: `AdminTabs` (nav horizontal de las 6 sub-secciones), `AppShell`, `CatalogList`,
  `CreateUserDialog`, `layout/Sidebar`.
- Sin RTK Query local, sin `middleware.ts`, sin slice Redux local — solo `authApi`/`authReducer` de `@repo/ui`.
- `interfaces/interface.ts` local: `MODULES`/`ACTIONS` (comentario: mirror de los enums del backend, pero
  usados aquí solo como datos mock de UI) + `MockUser`/`MockRole`/`MockAuditEntry`/`MockCatalogItem`/etc.

### 2.4 `auth-front` (puerto 3012, sirve `/login`, `/register`, `/forgot-password`, `/reset-password`, `/activate`)
- Todas las páginas comparten `AuthLayout` (panel izquierdo decorativo `BrandPanel` + panel derecho con el form).
- `LoginForm` — usa `findUserByCredentials`/`buildTokenFromUser`/`setCookieToken` de `@repo/ui` (mock real,
  no llama backend), redirige vía `getPostAuthDestination(role)`.
- `RegisterForm` — wizard 2 pasos (cuenta → perfil); al final usa el usuario demo fijo `cliente@bananagram.mx`
  (comentario: futuro `POST /auth/register {name,email,password,type,profileName,category}`).
- `ForgotPasswordForm`/`ResetPasswordForm` — **totalmente mock**, solo cambian estado local, sin request
  (comentarios documentan las mutations futuras: `useForgotPasswordMutation`/`useResetPasswordMutation`
  desde `@repo/ui`, que **no existen todavía** en `auth.api.ts` — habría que agregarlas).
- `ActivateForm` — flujo de activación de cuenta para usuarios creados por Admin (llega desde el link que
  genera `CreateUserDialog` en admin-front); busca el usuario mock por email (query param), pide nueva
  contraseña, activa sesión.
- Sin RTK Query local, sin `middleware.ts`, sin slice Redux local, sin `globals.css` (única app sin Tailwind
  configurado en devDeps).

### 2.5 `brands-front` (puerto 3013, sirve `/brands/*`, `/my-campaigns`, `/team`, y también `/profile/*`)
Este es el front más grande (36 archivos). Dominio: marcas/perfiles, campañas, equipo, calendario, métricas
de marca, score, reportes.
- `/profile` es la página central hoy (unificada por rol): `cliente` ve `ClientSection` (hero + perfil +
  cuentas sociales conectadas + campañas + `CreateCampaignDialog`), `community_manager`/`disenador` ven
  `StaffProfileSection` (bio, categorías, especialidades, `AvailabilityToggle`, `ProfileCompletenessBadge`,
  "Guardar cambios" mock — comentario: futuro `PATCH /users/me`).
- `/brands`, `/brands/[id]`, `/brands/[id]/{campaigns,campaigns/[campaignId],campaigns/[campaignId]/{posts,team},metrics,reports,score,calendar}`
  — árbol **legacy**, mantenido por compat/nav de Admin, superado por `/profile/*` para el flujo
  centrado en Cliente.
- `/my-campaigns` — grid de campañas del CM/Diseñador actual (`getMyCampaigns()`).
- `/profile/campaigns`, `/profile/campaigns/[campaignId]`, `/profile/campaigns/[campaignId]/team` —
  equivalentes sin `BrandTabs`, usados desde `/profile` y `/my-campaigns`. **Bug**: en
  `/profile/campaigns/[campaignId]/page.tsx` hay una referencia a `POSTS_FRONT_URL` no importada (ver §0).
- `/profile/calendar` — calendario rico (`react-big-calendar`) con KPIs, filtros, `PostPreviewDialog` con
  Aprobar/Rechazar (gate `post:approve`/`post:reject`).
- `/team` — lista plana de todo el equipo across campañas activas (`getTeamAggregate()`).
- `/my-brand`, `/onboarding` — **deprecados**, solo `redirect('/profile')`.
- `lib/mock-data.ts` (307 líneas) — el "backend" completo de esta app: `MOCK_PROFILES` (4 marcas: Zara MX,
  Nike MX, Spotify MX, Alex Rivera-personal), `MOCK_SOCIAL_ACCOUNTS`, `MOCK_CAMPAIGNS` (c1-c5),
  `getCurrentClientProfile(email)` (mapea `alex@bananagram.mx`→perfil personal, default Zara),
  `MOCK_AVAILABLE_CMS`/`MOCK_AVAILABLE_DESIGNERS` + `assignTeamToCampaign`, `MOCK_CALENDAR_EVENTS`.
- Sin RTK Query local, sin `middleware.ts`, sin slice Redux local.

### 2.6 `posts-front` (puerto 3014, sirve `/posts/*`, `/approvals`)
- `/posts` — lista principal, filtros por status + campaña, `DataTable`, acción "Publicar" (gate
  `post:publish`, solo visible para `aprobado`/`programado`), "+ Nueva publicación" (gate `post:create`) →
  `/posts/new`.
- `/posts/[id]` — detalle: metadata, contenido, acciones gateadas (`Editar`/`Enviar a revisión`→`post:create`,
  `Programar`→`post:schedule` **sin handler real todavía**, `Rechazar`→`post:reject` abre `RejectPostDialog`,
  `Aprobar`→`post:approve`, muta status local), timeline de `MOCK_STATUS_HISTORY`.
- `/posts/new` — form de creación: campaña, cuenta social (chips), contenido (con `CHAR_LIMITS` por red),
  fecha opcional, panel "IA" estático (`MOCK_AI_SUGGESTIONS`/`MOCK_TIME_SLOTS`, no hay IA real), preview
  en vivo. **No persiste el post** — solo navega a `/posts` o `/posts/approvals`.
- `/posts/approvals` — tablero kanban de 3 columnas (Borradores por enviar / Esperando aprobación /
  Rechazados), cada una gateada por permiso distinto.
- `lib/mock-data.ts` (187 líneas): `MOCK_SOCIAL_ACCOUNTS` (5, distinto shape del de brands-front — no
  compartido), `MOCK_CAMPAIGNS` (c1-c3, shape distinto del de brands-front), `MOCK_POSTS` (5 posts, uno
  por cada status), `MOCK_STATUS_HISTORY` + `addStatusHistoryEntry`, `CHAR_LIMITS`.
- Sin RTK Query local, sin `middleware.ts`, sin slice Redux local.
- `Sidebar.tsx` propio (no en `components/layout/` como los demás) — enlaces cross-zone a `brandsFront`
  para `my-campaigns`/`my-brand`/`brands`/`calendar`/`team`/`profile`.

### 2.7 `analytics-front` (puerto 3011, sirve `/metrics`)
Dominio: score digital / analítica de redes. Única app con **Recharts** usado activamente en varios
componentes (`EngagementChart` LineChart, `CampaignBreakdown` BarChart, `NetworkComparison` BarChart);
el resto de widgets "visuales" son hand-rolled con MUI (heatmap, barras de audiencia) o primitivos
compartidos (`ScoreGauge`, `MetricCard`, `TrendCard`).
- `/metrics` — única página real (`/` solo redirige aquí). Gate `metrics:view`. Tabs por red
  (General + IG/FB/TK/LI/X/YT, estado en Redux `selectedNetwork`). Botón "Exportar" **deshabilitado**
  (tooltip "Exportación pendiente"). Composición según tab:
  - **General**: `NetworkOverview`, `EngagementChart`, `GeneralMetricCards`, `CampaignBreakdown`,
    `TopContent`, `InsightsPanel`, `ScoreExplanationPanel` (explica el `BrandScore` existente con barras
    de consistencia/engagement/coverage/frequency), `NetworkComparison`, `CampaignComparison`,
    `TrendAnalysis` (ventanas 7/30/90 días), `PostingHeatMap` (día×hora, CSS grid custom), `AudienceOverview`.
  - **Por red**: mismo set base con `NetworkMetricCards` (config-driven por `NETWORK_METRIC_FIELDS`) en
    vez de `GeneralMetricCards`.
  - `SelectedPostDetail` reemplaza todo lo anterior cuando hay un `postId` seleccionado (drill-down nivel 4).
- **Toda la data es mock + derivación pura** (`lib/analytics/engine.ts`, funciones puras sobre
  `SocialMetricFact[]` desde `lib/mock-data.ts`) — cero llamadas HTTP para métricas. Si se conecta un
  backend real, el reemplazo natural es sustituir `mock-data.ts`/agregar un slice RTK Query real,
  `engine.ts`/`analytics.selectors.ts` quedan casi igual (son puros).
- `store/analyticsFilters.slice.ts` (único slice Redux **local** de todo el frontend fuera de `@repo/ui`)
  — guarda solo filtros/selección (`networks`, `selectedNetwork`, `campaignId`, `postId`, `dateRange`,
  `drillLevel` derivado, + 4 campos preparados pero deshabilitados en UI: `cmName`/`designerName`/
  `category`/`specialty`, ya que `SocialMetricFact` no tiene esos datos aún).
- `components/dashboard/ActivityTimeline.tsx` existe pero **no está importado/usado** en `/metrics`.
- Sin `middleware.ts`. Sin RTK Query local aparte de `authApi` compartido.

---

## 3. Patrones transversales a recordar

- **Gate de permisos en frontend**: siempre `usePermissions().can(module, action)` /
  `<ProtectedAction module="..." action="...">` (de `@repo/ui/ui`) — nunca lógica de permisos duplicada
  a mano. Los slugs de módulo/acción usados en frontend (`AppModule`/`AppAction` de `@repo/ui/types`)
  **no coinciden textualmente** con los del backend (`commons/types/modules.enum.ts`/`actions.enum.ts`,
  en español) — cualquier integración real de permisos necesita mapear entre ambos o unificarlos.
- **Navegación cross-zone**: siempre vía `ZONE_URLS` (`@repo/ui/config`) + `window.location.href` (full
  page nav, porque son apps Next.js independientes) — nunca `router.push` para cruzar de zona.
  Navegación dentro de la misma zona sí usa `router.push`.
- **Sesión compartida**: cookie `bananagram_token` (no `localStorage`, por ser per-origin/puerto) +
  `useSessionBootstrap()` en cada `providers.tsx`. Un solo punto de verdad: `@repo/ui/state`.
- **Mock data está fragmentado por zona a propósito** (documentado en comentarios) — no hay un mock store
  compartido entre `brands-front`/`posts-front`/`analytics-front`/`web-shell`, cada uno tiene el suyo con
  IDs que coinciden por convención pero shapes distintas. Ten cuidado al asumir que "el mismo post" se ve
  igual en dos zonas.
- **Todas las 6 apps siguen el mismo esqueleto**: `app/layout.tsx` (fuente Poppins, metadata, favicon
  `/LogoMonkey.png`) → `app/providers.tsx` (`EmotionCacheProvider` → `ReduxProvider` → MUI `ThemeProvider`
  + `CssBaseline` → `SessionBootstrap` → `AppShell`/children) → `components/AppShell.tsx`
  (`Sidebar` + `TopBar` + contenido) → `components/layout/Sidebar.tsx` (o `Sidebar.tsx` en posts-front).
