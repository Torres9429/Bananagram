# INVENTORY.md — Mapa detallado del código (para Claude)

Este archivo es un inventario exhaustivo de rutas, endpoints, componentes, tipos y estado real de cada
paquete del monorepo. Se generó leyendo el código fuente completo (no se infiere nada). Complementa a
`.claude/CLAUDE.md` (que da la arquitectura general y las reglas críticas) con el detalle fino que
`CLAUDE.md` no incluye para no inflar el contexto de cada sesión.

**Cuándo leer este archivo**: antes de tareas puntuales tipo "agrega un endpoint a X", "crea un componente
para Y", "consume tal servicio desde tal front", "elimina/cambia el flujo de Z" — así no hay que re-explorar
el árbol de archivos correspondiente.

**Última actualización**: **2026-08-14, reescritura completa** (la versión anterior estaba fechada
2026-07-19/08-07 y ya no reflejaba el código — casi todo lo que decía "sigue en mock/stub" ya es real). Si
el código diverge de lo aquí descrito, confía en el código y actualiza este archivo.

---

## 0. Estado real de implementación (léase primero)

**Cambio de fondo respecto a versiones anteriores de este documento**: el proyecto dejó de ser un scaffold.
La mayoría del dominio de negocio (marcas, campañas, publicaciones con flujo de aprobación completo,
métricas/score reales contra Ayrshare, notificaciones en vivo, Alexa Skill, login real) está conectada de
punta a punta, backend y frontend. Lo que sigue siendo mock o stub es ahora la EXCEPCIÓN, no la regla —
listado exhaustivo abajo para no tener que asumir nada.

### Backend — los 4 servicios responden, con gaps puntuales documentados

- **Los 4 servicios** (`auth-service`, `core-service`, `alexa-service`, gateway) cargan su propio `.env`
  vía `ConfigModule.forRoot({isGlobal:true})` (agregado a `auth-service`/gateway en la sesión que quitó el
  `.env` de la raíz — antes dependían por completo de que Turborepo lo inyectara implícito, algo que solo
  pasa corriendo vía `turbo run`, no en producción). No hay `.env` en la raíz del repo — uno por servicio,
  con su `.env.example` correspondiente.
- **`alexa-service` ya NO es un BFF vacío** — `campaigns/` e `ideas/` tienen lógica real completa (ver
  §1.5). Es dueño único del dominio de ideas de contenido en todo el sistema (se movió de `core-service`).
- **`posts` en `core-service` ya tiene controller/service/module completos** (13 endpoints) + el
  scheduler de publicación pasó de sondeo (`@Cron` cada 6h) a temporizadores por evento (`setTimeout` por
  post vía `SchedulerRegistry`, ver §1.4).
- **Métricas/score sí tienen controller HTTP** (`GET /brands/:id/score`, `/score-history`,
  `/campaigns/:id/metrics`, `/metrics-history`, con endpoints de refresh manual) — dejó de ser solo
  lógica interna sin exponer.
- **Notificaciones son reales de punta a punta**: modelo + controller + servicio en `auth-service`, con un
  **stream SSE en vivo** (`GET me/notifications/stream`) además del CRUD normal.
- **Gaps que siguen siendo reales** (no implementado, no una omisión de este documento):
  - **Generación de ideas con IA (`fetchContentIdeas`)** — bloqueada, sin `ANTHROPIC_API_KEY` de pago
    configurada. Documentado en `docs/skill/backend-api-reference.md` §3.
  - **`reports/` en `core-service`** — `POST /reports` solo registra la solicitud, `fileUrl` queda `null`
    siempre; no hay generación real de CSV/PDF en el backend.
  - **`score/` no tiene endpoint de recálculo bajo demanda distinto del cron** — `calculateIfStare` cachea
    5h; el único "refresh manual" real es el de campañas/cuenta (`POST .../metrics/refresh`), no existe un
    equivalente para score.
  - **`core-service/src/char-limits/char-limits.map.ts`** — definido, **sin ningún importador en todo el
    repo** (dead code, nunca se conectó a la validación de `CreatePostDto`/`UpdatePostDto`).
  - **`AuditInterceptor`** (histórico en `apps/backend/commons/`) — el TODO de escribir en `audit_log`
    sigue sin implementarse **en cualquier parte del sistema**, no solo en `commons/` (nadie construyó un
    reemplazo tampoco).
  - **Discrepancia de la fórmula del Score** — sigue viva, y ahora confirmada en 2 lugares (no solo
    `CLAUDE.md`): el código real (`score.service.ts`) usa 4 factores
    (`consistencia×0.30 + engagement×0.40 + cobertura×0.20 + frecuencia×0.10`), pero el comentario en el
    propio `schema.prisma` de `core-service` (sobre `BrandScore`) sigue describiendo 3 factores y dice que
    `coverage` es "informativa, no pondera" — **falso en el código actual**, que sí la pondera al 20%.
    Confirma con el usuario cuál es la vigente antes de tocar esto.
- **`apps/backend/commons/`** — **ya no está huérfano.** Hasta el 2026-08-15 la migración había sido "cada
  servicio duplica localmente sus guards/decorators, `commons/` queda de referencia sin importadores" — el
  `c867e24` (16-ago-2026) revirtió ese criterio: `commons/` se reconstruyó como paquete workspace real
  (`@repo/backend-commons`) y los 3 servicios lo importan de verdad. Su `JwtAuthGuard` también se reescribió
  en el proceso: ya no es la vieja versión passport-jwt, ahora verifica RS256 contra el JWKS remoto de
  `auth-service` vía `jose`, igual que las copias locales que reemplaza. Detalle completo en §1.2.

### Frontend — la mayoría es real; mock queda en bolsillos específicos, no por zona completa

**Ya no es correcto describir ninguna de las 6 apps como "100% mock"** — todas tienen al menos una porción
real conectada al backend. Mapa preciso de qué sigue siendo mock, exhaustivo:

- **`auth-front`**: `LoginForm` **ya es real** (llama a `POST auth/login`, con refresh automático y cookies
  de sesión reales). `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm` (el submit; sí lee `?token=`
  de verdad) y `ActivateForm` **siguen 100% mock** (JWT sin firmar vía `buildTokenFromUser`/mock-users).
- **`admin-front`**: `/catalogs/*` (categorías, especialidades, redes sociales) **ya es real** (RTK Query
  contra `core-service`). `/users`, `/roles`, `/audit-log` **siguen 100% mock** — ninguno llama al
  `AdminModule` real de `auth-service` que ya existe (`GET/POST/PATCH/DELETE admin/users`,
  `admin/roles`, ver §1.3); es un hueco de conexión pendiente, no un hueco de backend.
- **`web-shell`**: dashboards de Cliente/CM/Diseñador **se eliminaron** (solo queda `DashboardAdmin`, real
  para el admin). Sus 5 slices `store/api/*.ts` (`ai`, `metrics`, `notifications`, `posts`, `reports`) 
  siguen vacíos y sin registrar (antes eran 7 — `brands`/`campaigns` se borraron directamente).
- **`brands-front`**: `/profile`, `/profile/alexa`, `/profile/campaigns`, `/my-campaigns`, `/my-team`,
  `/brands`, `/brands/[id]`, `/brands/[id]/campaigns[/:campaignId[/team]]` son **reales**. `/profile/calendar`,
  `/team` (agregado de solo lectura), y todo el árbol legacy `/brands/[id]/{metrics,score,reports,calendar}`
  **siguen 100% mock**. `StaffProfileSection` (perfil de CM/Diseñador) también sigue mock.
- **`posts-front`**: todas las rutas (`/posts`, `/posts/new`, `/posts/[id]`, `/posts/approvals`) son
  **reales**. `lib/mock-data.ts` quedó huérfano salvo constantes de presentación (`NETWORK_LABELS` y
  similares) — nada de negocio lo usa ya.
- **`analytics-front`**: `/metrics` es real en su mayoría — 10 de 15 widgets están conectados a datos
  reales; 5 (`NetworkMetricCards`, `TopContent`, `InsightsPanel`, `AudienceOverview`, `SelectedPostDetail`)
  son `EmptyState` estáticos por limitación real de backend (sin dato nativo por red, sin ranking de posts,
  sin histórico semanal, sin demografía, sin endpoint de detalle por post). El motor mock viejo
  (`lib/analytics/engine.ts` + `MOCK_METRIC_FACTS`) sigue importado por `analytics.selectors.ts` pero
  **prácticamente todos sus selectores están muertos** (solo 4 de ~20 se consumen, y esos 4 no dependen del
  dataset mock). "Filtros avanzados" (Estado/CM/Diseñador/Categoría/Especialidad) está oculto tras un flag
  (`SHOW_ADVANCED_FILTERS=false`), a propósito, no por bug.

**Ya no aplica** (contradicho directamente por el código, no reescribir con esta idea): "ningún
microfrontend hace fetch real", "solo `authApi` tiene endpoints reales", "los slugs de permisos no
coinciden entre frontend y backend" (**ahora SÍ coinciden** — `@repo/ui/types`'s `AppModule`/`AppAction`
están en español, idénticos a los del backend, ver §2.1 y §3).

---

## 1. Backend

### 1.1 Gateway (`apps/backend/gateway/`, puerto 4000, paquete `@repo/api-gateway`)

- `src/main.ts` — `NestFactory.create(AppModule, {bodyParser:false})` (necesario para que
  `http-proxy-middleware` reciba el stream del body sin consumir). `app.enableCors()`.
  `TRUST_PROXY=true` activa `app.set('trust proxy', 1)` (debe seguir en `false` en dev local, sin proxy
  propio delante). Sin Swagger, sin prefix global propio (es un proxy puro).
- `src/app.module.ts` — `ConfigModule.forRoot({isGlobal:true})` (agregado esta sesión, antes el gateway no
  cargaba env por su cuenta en absoluto — dependía 100% de que Turborepo lo inyectara implícito, algo que
  solo aplica corriendo vía `turbo run dev`, no en `node dist/main` de producción) + `RedisModule`.
  `controllers:[HealthController]`, `providers:[RateLimitMiddleware, JwtEdgeMiddleware,
  CorrelationIdMiddleware]`.
- **Los 3 middlewares se montan a mano en `main.ts` con `app.use()`, ANTES de los proxies** (nunca vía
  `configure()`/`MiddlewareConsumer`) — bug real encontrado y corregido en vivo (si se dejaba que Nest los
  registrara vía `configure()`, quedaban después de los proxies Y después del catch-all 404 interno de
  Nest en la cadena real de Express; ninguna ruta de negocio pasaba por rate-limit/JWT-edge). Se resuelven
  vía `app.get(...)` del contenedor de DI.
- **Tabla completa de proxies** (`app.use(createProxyMiddleware({pathFilter, target, changeOrigin:true}))`,
  sin pasar el path como argumento de `app.use()` — si se hiciera, Express recortaría ese prefijo de
  `req.url` antes de pasarlo al middleware):

  | `pathFilter` | Destino |
  |---|---|
  | `/api/auth`, `/api/me`, `/api/admin` | `AUTH_SERVICE_URL` |
  | `/api/catalogs`, `/api/brands`, `/api/campaigns`, `/api/cm-team`, `/api/posts`, `/api/reports` | `CORE_SERVICE_URL` |
  | **`/api/ideas`** | **`ALEXA_SERVICE_URL`** — NO va a core-service (el dominio de ideas se mudó entero a alexa-service, acceso directo a la misma BD física — ver §1.5). No hay `/api/alexa` porque `/api/campaigns` ya está tomado por core-service; el Lambda de la skill llama a `alexa-service` directo en el puerto 3004 (sin proxiar) para campañas/métricas. |

  `GET /health` lo resuelve el propio `HealthController` de Nest, no un proxy.
  **Deliberadamente sin proxiar**: `/api/internal/*` (tráfico servicio-a-servicio: `auth-service↔core-service`
  para `/internal/user-profiles` y `/internal/notifications`).
- `RateLimitMiddleware` (`src/rate-limit/`) — ventana fija por IP en Redis (`SET NX EX` + `INCR` en un
  pipeline `multi()`, evita un contador sin TTL si los 2 comandos separados fallaran entre medio).
  `RATE_LIMIT_WINDOW_SECONDS`/`RATE_LIMIT_MAX` (defaults 60/100). `/health` excluido. Headers
  `X-RateLimit-Limit`/`X-RateLimit-Remaining`. **Falla abierto** si Redis está caído (verificado en vivo).
- `JwtEdgeMiddleware` (`src/auth/`) — verifica RS256 vía `jose.createRemoteJWKSet(AUTH_JWKS_URL)` +
  consulta la misma denylist de Redis que los backends. `PUBLIC_EXACT` (allowlist exacta): `/health`,
  `/favicon.ico`, `auth/register`, `auth/login`, `auth/refresh`, `auth/password-reset/request`,
  `auth/password-reset/confirm`, `auth/link-code/redeem`. **`auth/link-code` (generar código) y
  `auth/logout` NO son públicas** a propósito. Sin `jti` en el token → rechazo (fail-**closed** para esto
  específicamente). En la consulta de denylist **falla abierto** (comentario explícito: mismo criterio que
  el rate-limit) — distinto de `auth-service`, cuyo propio `TokenDenylistService.isRevoked()` cae a
  Postgres en vez de fallar abierto si Redis falla. Reenvía el `Authorization` original sin tocar (defensa
  en profundidad: cada backend re-verifica).
- `RedisModule`/`RedisService` — wrapper delgado de `ioredis`, compartido por los 2 middlewares de arriba.
- `CorrelationIdMiddleware` — genera/propaga `X-Request-Id`.
- **Bug real posible, sin confirmar en vivo (no se ha probado el perfil `full` de Docker completo)**: el
  override de `docker-compose.yml` para `api-gateway` fija `AUTH_SERVICE_URL`/`CORE_SERVICE_URL` a los
  nombres de servicio de la red de compose, pero **no** override-ea `ALEXA_SERVICE_URL` — dentro de un
  contenedor, `/api/ideas` probablemente falla al no poder resolver `localhost:3004`.

### 1.2 `apps/backend/commons/` — paquete workspace real desde el 2026-08-16 (`c867e24`)

**Histórico (hasta 2026-08-15)**: había quedado huérfano — cero imports relativos desde `auth-service`,
`core-service`, `alexa-service` o el gateway, todos duplicaban localmente lo que necesitaban
(`src/guards/`, `src/decorators/`, según el servicio). El `c867e24` ("refactor(backend): revivir commons
como paquete real @repo/backend-commons", 16-ago-2026) revirtió ese criterio: `commons/` se reconstruyó
como paquete workspace compilado (`package.json`+`tsconfig.json`, barrel único `src/index.ts` — sin
subpaths, la resolución de módulos clásica que usa `tsconfig.base.json` de backend no resuelve de forma
confiable un `exports` map con subpaths). Confirmado por grep: los 3 servicios lo declaran como dependencia
(`workspace:*`) y lo importan de verdad (`import { X } from '@repo/backend-commons'`) — 3 archivos en
`alexa-service`, 5 en `auth-service`, 13 en `core-service`. Los 3 `Dockerfile` cambiaron su build de
`pnpm --filter` a `turbo run build` para que `@repo/backend-commons` compile antes que el servicio que lo
consume.

Qué exporta `src/index.ts` y quién lo usa de verdad:

- `guards/jwt-auth.guard.ts` — **reescrito al revivir el paquete: ya no es la versión passport-jwt**
  (`extends AuthGuard('jwt')`). Ahora `implements CanActivate` y verifica RS256 contra el JWKS remoto de
  `auth-service` vía `jose` (`createRemoteJWKSet` + `jwtVerify`), con chequeo de `jti` contra
  `TokenDenylistService`. **Compartido entre `core-service` y `alexa-service`** (verificadores idénticos,
  nunca firman). `auth-service` **mantiene su propia copia local** en
  `src/guards/jwt-auth.guard.ts` (no importa esta) porque es el emisor del JWT, verificación genuinamente
  distinta (firma con llave privada, no consulta JWKS por HTTP) — no se comparte a propósito, ver §1.3.
- `guards/token-denylist.service.ts` — de solo lectura (consulta Redis), compartido por el mismo par
  `core-service`/`alexa-service` que usa `JwtAuthGuard` de aquí.
- `guards/permission.guard.ts` — **ahora sí se importa** en los 3 servicios (antes: "lógica idéntica a las
  copias locales, solo sin uso" — las copias locales de `auth-service`/`core-service` se borraron en este
  commit, ver §1.3/§1.4). Usado por ejemplo en `admin/users.controller.ts`/`admin/roles.controller.ts`
  (`auth-service`) y `brands.controller.ts`/`campaigns.controller.ts` (`core-service`), entre otros.
- `decorators/current-user.decorator.ts`, `decorators/require-permission.decorator.ts` — ídem, ahora
  importados en los 3 servicios en vez de duplicados.
- `filters/http-exception.filter.ts` — migrado, pero **sigue sin importadores reales**: ningún `main.ts` lo
  registra como filtro global. Exportado, no usado — mismo estado funcional que antes de la migración,
  solo que ahora vive en el paquete real en vez de en el directorio huérfano.
- `interceptors/logging.interceptor.ts` — ídem: migrado a `src/`, **sigue sin uso** en ningún `main.ts`.
- `interceptors/audit.interceptor.ts` — **no se migró**. El archivo original con el
  `// TODO: escribir en audit_log` se quedó atrás en `apps/backend/commons/interceptors/audit.interceptor.ts`
  (fuera de `src/`, no cubierto por el `tsconfig.json` del paquete, no exportado desde `index.ts`) —
  literalmente huérfano ahora, ni siquiera compila como parte de `@repo/backend-commons`. El TODO en sí
  sigue sin implementarse en ningún lado del sistema, no solo aquí.
- `circuit-breaker/opossum.factory.ts` — migrado con el fix de import CommonJS que antes solo tenía la
  copia local de `core-service` (`import CircuitBreaker = require('opossum')`, porque `opossum` es CJS
  puro y `import ... from 'opossum'` compila con `tsc --noEmit` pero crashea en runtime). La copia local
  de `core-service/src/circuit-breaker/` **se borró** en este commit — ya no existe, `AyrshareService`/
  `NotificationsClient` importan `createCircuitBreaker` de aquí.
- `types/jwt-payload.type.ts`, `types/modules.enum.ts`, `types/actions.enum.ts`, `types/roles.enum.ts` —
  contenido al día, ahora con importadores reales además de servir de referencia de tipos.
- `types/post-status.enum.ts` — **no se migró, se dio de baja** (ya no existe ni siquiera huérfano en el
  paquete nuevo). `core-service` sigue siendo dueño único de `PostStatus` con sus 11 valores reales, en su
  propia copia local (ver §1.6) — la vieja versión de 6 valores en `commons/` ya no existe en ningún lado.

### 1.3 `auth-service` (puerto 3001, paquete `@repo/auth-service`)

`src/app.module.ts`: `ConfigModule.forRoot({isGlobal:true})` (agregado esta sesión) + `AuthModule` +
`PermissionsModule` + **`AdminModule`** + **`ProfileModule`** + **`NotificationsModule`** (los últimos 3 no
estaban en versiones anteriores de este documento). `main.ts`: prefix global `api` (excepto
`.well-known/jwks.json`, consumida directo por los otros servicios sin pasar por el gateway), Swagger
clásico en `/api`, Scalar en `/docs`.

**`auth/` — `AuthController` (`@Controller('auth')`)**

| Método | Ruta | Guard | DTO | Notas |
|---|---|---|---|---|
| POST | `auth/register` | público | `RegisterDto{email,password,name,avatarUrl?,roleName:'cliente'\|'cm'\|'disenador',categoryIds?,specialtyIds?}` | mapea `roleName`→`Role` real, argon2, crea 1 `UserRole`, llama `POST /internal/user-profiles` de core-service best-effort (loguea si falla, no revienta el registro) |
| POST | `auth/login` | público | `LoginDto{email,password}` | argon2 verify → `issueTokens()` |
| POST | `auth/refresh` | público | `RefreshDto{refreshToken}` | rotación con **detección de reuso**: token ya usado/revocado/expirado revoca toda la `familyId`, incluido el que "ganó" la carrera — mensaje deliberadamente vago (no delatar a un atacante con un token robado) |
| POST | `auth/logout` | `JwtAuthGuard` | — | revoca `jti` actual en la denylist de Redis + todos los refresh tokens del usuario |
| GET | `auth/me` | `JwtAuthGuard` | — | payload del JWT tal cual |
| POST | `auth/password-reset/request` | público | `{email}` | siempre responde `{requested:true}` (sin enumeración de usuarios); fuera de producción también devuelve `devToken` (no hay envío de email real) |
| POST | `auth/password-reset/confirm` | público | `{token,newPassword}` | revoca todos los refresh tokens activos del usuario en la misma transacción |
| POST | `auth/link-code` | `JwtAuthGuard` | — | genera PIN de 4 dígitos (Alexa Skill), 10 min TTL, primer dígito 1-9 (evita ambigüedad con el slot `AMAZON.FOUR_DIGIT_NUMBER`). Roles permitidos: `cliente`/`disenador`/`administrador` — **CM excluido a propósito** |
| POST | `auth/link-code/redeem` | público a propósito | `{code}` | da el primer JWT del Lambda; `name` resuelto best-effort contra `GET /internal/user-profiles/:userId` de core-service |
| GET | `.well-known/jwks.json` | público, fuera del prefix `api` | — | `TokenSignerService.getJwks()` |

`TokenSignerService` (RS256 vía `jose`): `kid` = thumbprint RFC 7638 (estable aunque cambie el formato del
PEM). `TokenDenylistService`: Redis primero, Postgres (`RevokedAccessToken`) como respaldo escrito primero
(durable aunque Redis falle al escribir); en `isRevoked()` cae a Postgres si Redis falla (no falla abierto
acá, a diferencia del gateway). `TokenModule` es `@Global()`.

`JwtAuthGuard` (`implements CanActivate`, sin passport) — **copia local propia** en
`src/guards/jwt-auth.guard.ts`, no viene de `@repo/backend-commons` (auth-service es el emisor del JWT,
verifica con su llave privada directo, no contra un JWKS remoto — ver §1.2). `PermissionGuard` sí viene de
`@repo/backend-commons` desde el `c867e24` (antes era una copia local propia) — **SÍ está en uso**
(contradice versiones previas de este doc): en `admin/users.controller.ts` y `admin/roles.controller.ts`.

**`admin/` (módulo nuevo, no documentado antes)**

`UsersController` (`@Controller('admin/users')`, `JwtAuthGuard+PermissionGuard`):
- `GET admin/users?roleName=` — `usuarios:ver`
- `GET admin/users/:id` — `usuarios:ver`
- `POST admin/users` — `usuarios:crear`, `CreateUserDto{email,password,roleName}`
- `PATCH admin/users/:id` — `usuarios:editar`, `UpdateUserDto{email?,status?}`
- `DELETE admin/users/:id` — `usuarios:eliminar` (soft delete + revoca refresh tokens)
- `POST admin/users/:id/roles` — `usuarios:editar`, `{roleId}`
- `DELETE admin/users/:id/roles/:roleId` — `usuarios:editar` (bloquea dejar a alguien con 0 roles)

`RolesController` (`@Controller('admin')`): `GET admin/roles[/:id]` (`privilegios:ver`), `GET admin/modules`,
`GET admin/actions`, `PATCH admin/roles/:id/permissions` (`privilegios:editar`,
`{moduleSlug,actionSlug,allowed}` → `PermissionsService.updateRolePermission`, **ya expuesto**, contradice
versiones previas de este doc que decían "sin controller que lo exponga").

**`permissions/`**: `GET me/permissions` (`PermissionsController`) — sin cambios, sigue siendo la fuente de
verdad del menú frontend.

**`profile/`**: `PATCH me/profile` (`CompleteProfileDto{name,avatarUrl?,categoryIds?,specialtyIds?}`) — 400
si ninguno de los roles del usuario mapea a un perfil completable (admin puro).

**`notifications/` (módulo nuevo, no documentado antes)** — 2 controllers:
- `NotificationsController` (`@Controller('me/notifications')`, `JwtAuthGuard`): `GET me/notifications`,
  `PATCH me/notifications/:id/read`, y **`GET me/notifications/stream`** (SSE real, "Fase L"): headers
  `text/event-stream`, escribe `: connected\n\n` inicial, `NotificationsStreamService.subscribe(userId,res)`,
  ping cada 20s (`PING_INTERVAL_MS`), limpia en `res.on('close')`.
- `InternalNotificationsController` (`@Controller('internal/notifications')`, **sin guard**, no proxiado por
  el gateway) — `POST internal/notifications`, llamado por `core-service`.

`NotificationsStreamService` — mapa en memoria `userId → Set<Response>` (single-process a propósito, sin
Redis pub/sub, comentario: "no hace falta a esta escala"). `push()` escribe a cada conexión abierta,
atrapando errores por conexión sin tirar la creación de la notificación.

**BD propia**: `gestor_redes_auth`. Modelos confirmados en el schema: `Role`, `UserRole`, `Module`,
`Action`, `RolePermission`, `RefreshToken`, `RevokedAccessToken`, `Notification`, `UserStatus` (enum),
`User`, `PasswordResetToken`, `AccountLinkCode`, `AuditLog`.

### 1.4 `core-service` (puerto 3002, paquete `@repo/core-service`) — el servicio más grande

`src/app.module.ts` importa: `JwtAuthModule`, `CatalogsModule`, `CloudinaryModule`, `InternalModule`,
`BrandsModule`, `SocialAccountsModule`, `CampaignsModule`, `CmTeamModule`, `PostsModule`, `ReportsModule`,
`SchedulerModule`, `CronModule`, `ScoreModule`. **Ya no incluye `IdeasModule`** — el dominio de ideas se
mudó entero a `alexa-service` (ver §1.5). `ScheduleModule.forRoot()` también importado — lo siguen
necesitando `MetricsCronService`/`AccountMetricsCronService` (`@Cron`) y también `PostSchedulerService`,
que aunque ya no usa `@Cron`, sí necesita `SchedulerRegistry`, que provee el mismo módulo.

**`brands/`** (`@Controller('brands')`, `JwtAuthGuard+PermissionGuard`, `BrandAccessGuard` por ruta puntual):
- `GET brands` — sin `BrandAccessGuard` (lista el propio scope: admin ve todas, el resto las suyas por
  `ownerId` o por campaña como CM/diseñador)
- `GET/PATCH/DELETE brands/:id` — **con** `BrandAccessGuard`
- `POST brands` — `CreateBrandDto{name,slug,profileType?,categoryId?,logoUrl?,primaryColor?,
  allowedSocial:string[] (mín 1)}`. Solo `cliente`/`administrador`. **Llama a Ayrshare de verdad**:
  crea el perfil (`POST /profiles`) y el connect URL (`POST /profiles/generateJWT`). Si falla después de
  crear el perfil, compensa borrando el perfil de Ayrshare huérfano y soft-deletea la marca local.
- `POST brands/:id/connect-url` — con guard, regenera el connect URL
- `POST brands/:id/reprovision-ayrshare` — con guard; cubre el caso de que el perfil se haya borrado desde
  el dashboard de Ayrshare (no hay webhook); reutiliza el mismo `Brand.id` local (recrearlo rompería FKs
  desde Campaign/Post)
- `GET brands/:id/metrics-history?from&to` — **sin** `BrandAccessGuard` (criterio más estricto:
  dueño-o-admin únicamente, vía `SocialAccountsService.assertIsBrandOwnerOrAdmin`, mismo patrón que Score)
- `POST brands/:id/metrics-history/refresh` — mismo guard, atajo manual del cron de 6h

**`campaigns/`** (`@Controller('campaigns')`, **sin `BrandAccessGuard` en ningún lado** — `:id` acá es un
`campaignId`, no un `brandId`; ownership se resuelve a mano en `CampaignsService.assertCanManage`/
`assertCanView`):
- `GET campaigns` — scope: admin todas; resto por `OR[cmId, createdBy, brand.ownerId, designers.some]`
- `GET campaigns/eligible-community-managers?categoryIds=` / `eligible-designers` — declaradas **antes** de
  `:id` (el orden de rutas importa); nunca excluyen a nadie, solo rankean por `matchScore` (categorías en
  común)
- `GET campaigns/metrics-summary` — batch de métricas de todas las campañas visibles (usado por
  `analytics-front`)
- `GET campaigns/:id[/metrics][/metrics-history]`
- `POST campaigns/:id/metrics/refresh` — atajo manual
- `POST campaigns` — `CreateCampaignDto{brandId,name,description?,objective?,cmId,startDate?,endDate?,
  categoryIds?}`. Solo dueño de marca o admin; valida `cmId` tiene rol CM real. Notifica al CM
  (`campaign_pending_cm_approval`)
- `PATCH campaigns/:id` — si `cmId` cambia y `cmStatus==='aceptada'` → 400 (CM ya no se puede reasignar tras
  aceptar). Reasignar resetea `cmStatus:'pendiente'` y notifica al nuevo CM
- `DELETE campaigns/:id`
- `POST campaigns/:id/accept` / `reject` — solo el CM asignado; `reject` con `{reason?}`, deja la campaña
  disponible para que el Cliente reasigne vía `PATCH`
- `POST/DELETE campaigns/:id/designers[/:userId]` — requiere `cmStatus==='aceptada'` Y que el diseñador ya
  esté en el roster general del CM (`CmTeamMember`, ver abajo) antes de poder staffearlo en una campaña
  puntual

`CampaignMetricsService` — agregación real sobre `PostSocialAccount` ("Capa 2"): `summary` (sin
`engagementRate` combinado — nunca promediar tasas con denominador distinto entre redes), `byNetwork[]`,
`topPost`, `dataStatus{lastSyncedAt,partial,missingNetworks,coveragePercentage}`. Usa
`$queryRaw DISTINCT ON` contra `post_metrics` para "última métrica por entrega" (único lugar del proyecto
que lo justifica).

**`cm-team/`** (`@Controller('cm-team')`, prefix propio a propósito — un sub-path bajo `/me` quedaría
inalcanzable porque el gateway ya proxea todo `/api/me/*` a auth-service): `GET/POST cm-team`,
`DELETE cm-team/:designerUserId`. Roster **general** de diseñadores del CM (`CmTeamMember`, PK compuesta,
sin soft-delete — relación viva, no histórica), distinto de `CampaignDesigner` (por campaña puntual).

**`posts/`** — el módulo más grande.

DTOs: `CreatePostDto{brandId,campaignId,socialNetworkIds:UUID[] (únicos),content,instructions?,
scheduledAt?}`, `UpdatePostDto{content?,instructions?}`, `RejectPostDto{comment (requerido)}`,
`SchedulePostDto{scheduledAt?}`, `ForwardToDesignerDto{comment?}`.

`PostStatus` (11 valores): `borrador, en_revision, aprobado, rechazado, rechazado_cliente, programado,
publicando, publicado, parcial, error, cancelado`.

Máquina de estados (`state-machine/transitions.map.ts`):
```
borrador          → en_revision
en_revision       → aprobado | rechazado
rechazado         → en_revision
aprobado          → programado | rechazado_cliente
rechazado_cliente → aprobado | borrador
programado        → publicando | cancelado
publicando        → publicado | parcial | error | cancelado
(los últimos 4 son terminales)
```
2 tramos de aprobación: Diseñador→CM (`en_revision`→`aprobado`/`rechazado`), luego CM→Cliente (`aprobado`→
`rechazado_cliente`, el CM decide corregir-y-reenviar `→aprobado` o regresarlo al diseñador `→borrador`).
`validateTransition()`: transición inválida → 422; `rechazado`/`rechazado_cliente` sin `comment` → 400;
`to===aprobado && createdBy===userId` → 403 (el creador no puede autoaprobarse).

`PostsController` (`@Controller('posts')`, **sin `BrandAccessGuard` en ningún endpoint** — todo el
ownership se resuelve a mano en `PostsService` contra dueño de marca/CM/diseñadores asignados/admin):

| Método | Ruta | Permiso |
|---|---|---|
| GET | `posts?campaignId&brandId&status` | `ver` |
| GET | `posts/:id` | `ver` |
| POST | `posts` | `crear` |
| POST | `posts/:id/submit-for-review` | `editar` |
| POST | `posts/:id/approve` | `aprobar` |
| POST | `posts/:id/reject` | `rechazar` |
| POST | `posts/:id/client-reject` | `rechazar` |
| POST | `posts/:id/forward-to-designer` | `editar` |
| PATCH | `posts/:id` | `editar` |
| POST | `posts/:id/schedule` | `editar` |
| POST | `posts/:id/cancel` | `editar` |
| POST | `posts/:id/media` (multipart, máx 20 archivos) | `editar` |
| DELETE | `posts/:id/media/:mediaId` | `editar` |
| DELETE | `posts/:id` | `editar` |

Bugs reales encontrados y corregidos en vivo, documentados en comentarios de `posts.service.ts`:
- `createPost` nunca incluía a diseñadores asignados en el chequeo de permiso, aunque el seed ya les daba
  `publicaciones:crear` — nadie lo había ejercitado como diseñador real hasta que se probó.
- `submitPostForReview` solo lo permitía el CM — se amplió a diseñador creador/CM/dueño/admin.
- `schedulePost` ("Publicar ahora" sin fecha) daba 400 por no caer a "ahora" — arreglado
  (`scheduledAt = dto.scheduledAt ?? post.scheduledAt ?? new Date()`).
- `attachMediaToPost` solo permitía adjuntar en `borrador` — bloqueaba a un diseñador corrigiendo una
  imagen tras un rechazo del CM (estado `rechazado`) — ampliado a `borrador`+`rechazado`.
- `getPost` no serializaba `PostStatusHistory.id` (BigInt) — `JSON.stringify` fallaba en runtime, nunca
  detectado por los tests porque llaman al service directo, sin pasar por la serialización HTTP real.
- `removeMediaFromPost` hard-borra `PostMedia`+`Media` (no son "tabla principal", sin `deletedAt`) y borra
  el archivo real en Cloudinary.

`listPosts`/`getPost`: `CLIENT_VISIBLE_STATUSES = [aprobado, rechazado_cliente, programado, publicando,
publicado, parcial, error, cancelado]` — el Cliente no ve `borrador`/`en_revision`/`rechazado` (trabajo
interno de diseñador/CM); CM/diseñador/admin ven todo.

**Scheduler de publicación — reescrito esta sesión, de sondeo a timers por evento**
(`src/scheduler/post-scheduler.service.ts`, `PostSchedulerService implements OnModuleInit`):
- **Ya no hay `@Cron`**. Cada post arma su propio `setTimeout` exacto al momento de programarse
  (`schedulePost()` llama `scheduleTimer`), registrado en `SchedulerRegistry` con nombre `post-{postId}`.
- `onModuleInit()`: re-arma un timer para todo post en `PROGRAMADO` al arrancar — es la única "red de
  seguridad" que hace falta (los timers en memoria se pierden en un reinicio; esto los reconstruye).
- `armTimer` maneja el límite de 32 bits de `setTimeout` de Node (~24.8 días): para posts programados más
  lejos, encadena timeouts del máximo permitido hasta agotar el delay real.
- `publishById` re-consulta el post fresco al momento de disparar (una red pudo desconectarse entre
  programar y publicar). Si `publishOne` ya transicionó a `PUBLICANDO` y luego `provider.publish()` tira,
  recupera el post a `ERROR` en vez de dejarlo trabado para siempre (bug real de Fase P1, corregido).
- `publishOne`: una sola llamada a `provider.publish()` cubre todas las redes (así funciona la API de
  Ayrshare); agrega resultado por `PostSocialAccount`; transiciona al estado agregado vía
  `computeAggregateStatus()` (todas publicado→`PUBLICADO`, todas error→`ERROR`, mixto→`PARCIAL`).

`PostsModule` importa `JwtAuthModule, CloudinaryModule, NotificationsClientModule, SchedulerModule`.

**`catalogs/`** — sin cambios: `CategoriesController`/`SpecialtiesController`/`SocialNetworksController`
bajo `catalogs/*`, CRUD completo, `JwtAuthGuard+PermissionGuard`, DTOs con `class-validator`.

**`cron/`** (`cron.module.ts` importa `AyrshareModule, ScoreModule`) — 2 servicios, ambos `@Cron('0 */6 * * *')`:
- `MetricsCronService.generateMetrics(options?)` — métricas **por post**: `PostSocialAccount{status:
  'publicado', publishedAt≥now-7d}`, escribe `PostMetric` nuevo cada corrida (append-only). Ventana de
  dedup `SYNC_WINDOW_HOURS=5`.
- `AccountMetricsCronService.generateAccountMetrics(options?)` — métricas **por cuenta**, cubre TODAS las
  `SocialAccount` conectadas sin importar campañas (permite gráficos de crecimiento desde el día 1). Escribe
  `SocialAccountMetricSnapshot{followers, likes?, comments?, shares?, views?, reach?, source}`. Después
  también llama `scoreService.calculateIfStale(brandId)` una vez por marca tocada (mismo ciclo, evita un
  scheduler duplicado).

**`integrations/ayrshare/`**:
- `social-provider.interface.ts` — contrato `publish/getAnalytics/getAccountMetrics`, token DI
  `SOCIAL_PROVIDER`.
- `ayrshare.module.ts` — factory: `AyrshareService` si `process.env.SOCIAL_PROVIDER==='ayrshare'`, si no
  `MockSocialProvider` (default).
- `ayrshare.service.ts` — cliente HTTP real envuelto en `createCircuitBreaker`. Bugs reales de Fase P1,
  verificados en vivo contra Instagram real:
  - `publish()`: los resultados vienen anidados en `payload.posts[0]`, no en la raíz — con la forma vieja
    el parseo siempre fallaba aunque Ayrshare sí publicara. Timeout del breaker subido a 60s (30s y 5s
    resultaron insuficientes publicando media real).
  - `getAnalytics()`: los campos vienen un nivel más adentro (`payload[code].analytics`, no `payload[code]`
    directo) — con la forma vieja el mapper siempre devolvía `{}` aunque `raw` sí tuviera el payload real.
  - `getAccountMetrics()`: nunca tira, devuelve `AccountMetrics` con todo `null` ante cualquier falla.
- `mock-social-provider.ts` — `getAnalytics` usa `metrics/decay-simulator.ts`; `getAccountMetrics` produce
  crecimiento pseudo-determinista desde un hash de `profileKey:networkCode`, anclado en `2026-01-01` (no
  epoch Unix, para no dar seguidores absurdos).
- `mappers/mapper.registry.ts` — solo `instagram, facebook, tiktok, x`. **`linkedin`/`youtube` sin soporte a
  propósito** (tira error explícito en vez de simular ceros).

**`internal/`** (`@Controller('internal/user-profiles')`, **sin guard**, no proxiado por el gateway):
`GET internal/user-profiles/:userId` (usado por auth-service al redimir un LinkCode), `POST
internal/user-profiles` (upsert, usado por `register`/`ProfileModule` de auth-service).

**`reports/`** (`reportes:{ver|exportar}`) — `GET reports[/:id]`, `POST reports {brandId,
format:'csv'|'pdf'}` (solo dueño/admin). **Generación no implementada** — `fileUrl` queda `null` siempre,
solo registra la solicitud.

**`score/`** (`@Controller('brands')`, montado bajo brands): `GET brands/:id/score` (sin
`BrandAccessGuard`, mismo criterio estricto dueño-o-admin que metrics-history), `GET
brands/:id/score-history?from&to`.
- `calculateIfStale(brandId)` — cachea 5h (`SCORE_SYNC_WINDOW_HOURS`), si no hay snapshot reciente llama
  `calculate()`. Reemplaza el viejo "recalcular en cada GET" (ensuciaba `BrandScore` con una fila por cada
  vista de página) — el cron de cuenta es ahora quien mantiene el histórico cada 6h; el GET es solo
  fallback para marcas nuevas.
- `calculate(brandId)` — fórmula confirmada: `score = consistencia×0.30 + engagement×0.40 +
  cobertura×0.20 + frecuencia×0.10` (4 factores — sigue divergiendo del comentario en el propio
  `schema.prisma`, que describe 3 y dice que cobertura no pondera; **el código sí la pondera**).
  Clasificación: `≤40 bajo`, `≤70 medio`, `>70 alto`. Escribe una fila nueva cada vez (append-only).

**`social-accounts/`** (`@Controller('brands/:brandId/social-accounts')`, **con** `BrandAccessGuard` a nivel
de clase — funciona porque la ruta tiene `:brandId`): `GET`, `POST .../sync` (llama Ayrshare `GET /user`,
marca inactivas las que ya no aparecen — nunca las borra, "desconectar es cambio de estado, no borrado"),
`POST .../:id/disconnect` (Ayrshare `DELETE /profiles/social` + `active:false, disconnectedAt`).

**Notificaciones — solo cliente saliente, sin modelo propio**: `notifications-client.service.ts` /
`NotificationsClient.notify(userId,type,payload?)` — hace `POST {AUTH_SERVICE_URL}/api/internal/notifications`
(circuit breaker, best-effort, nunca bloquea una mutación de campaña/post). El modelo `Notification` y su
controller viven enteros en `auth-service` (ver §1.3).

**`ideas/` — ya NO existe en `core-service`**: se movió entero a `alexa-service` (ver §1.5).
`ContentIdea`/`ContentIdeaSource` siguen declarados en el schema de `core-service` (sigue siendo dueño de
la migración), pero nada en `src/` de `core-service` los referencia ya.

**`BrandAccessGuard` — uso real confirmado** (contradice versiones previas: "existe, compila, aplicado a
cero endpoints"): aplicado en `brands.controller.ts` (`GET/PATCH/DELETE :id`, `connect-url`,
`reprovision-ayrshare`) y a nivel de clase en `social-accounts.controller.ts`. **No aplicado**, por diseño,
en `campaigns.controller.ts` (`:id` no es un `brandId`), `score.controller.ts`/las rutas de
metrics-history de `brands.controller.ts` (criterio más estricto que el guard, resuelto a mano vía
`assertIsBrandOwnerOrAdmin`), y `posts.controller.ts` (todo el ownership resuelto a mano en el service).
Tiene bypass de `administrador` (bug real corregido: un admin con el permiso correcto quedaba bloqueado por
no ser dueño/CM/diseñador).

**`cloudinary/`** — `CloudinaryService`, SDK real (`uploadFile`→stream a `bananagram/posts`, `deleteFile`),
usado solo por `posts/`.

**`char-limits/char-limits.map.ts`** — límites por red definidos, **cero importadores en todo el
repo** (dead code, nunca se conectó a la validación de posts).

**`circuit-breaker/opossum.factory.ts`** — **ya no es una copia local**: desde el `c867e24` (16-ago-2026)
`core-service` importa `createCircuitBreaker` de `@repo/backend-commons`, la copia local en
`core-service/src/circuit-breaker/` se borró. Bug real corregido acá primero ("Fase K"), y el que motivó
llevarlo a `commons/` con el fix incluido: `opossum` es CJS puro, `import CircuitBreaker from 'opossum'`
compilaba con `tsc --noEmit` pero crasheaba en runtime bajo `nest start --watch` (`opossum_1.default is not
a constructor`) — arreglado con `import CircuitBreaker = require('opossum')`. Usado por
`AyrshareService` (3 call sites) y `NotificationsClient` (1 call site). Ver §1.2 para el resto de lo que
`core-service` ahora importa de `commons/` en vez de duplicar.

**BD propia**: `gestor_redes_core`. Ver §1.6 para el listado completo de modelos.

### 1.5 `alexa-service` (puerto 3004, paquete `@repo/alexa-service`) — BFF real, ya no un stub

`src/app.module.ts`: `ConfigModule.forRoot({isGlobal:true})` + `JwtAuthModule` + `CampaignsModule` +
`IdeasModule` — **ya no `imports: []`**.

**`campaigns/`** — puro BFF HTTP sobre `core-service` (`CORE_SERVICE_URL`), sin Prisma acá:
- `GET campaigns[?name=]` — sin `name`: lista enriquecida (`fetchCampaigns`); con `name`: match
  exacto y si no, parcial case-insensitive (`fetchCampaignByName`)
- `GET campaigns/:id` — passthrough sin enriquecer
- `GET campaigns/:id/metrics` — passthrough

`EnrichedCampaign{id,name,totalPosts,score:number|null,reach,engagement:number|null,followers,
topNetwork:string|null,topPost}` — `enrichCampaign()` hace 3 llamadas HTTP paralelas por campaña
(`metrics`, `brands/:id/score`, `brands/:id/social-accounts`). **`getJsonOrNullOn403<T>`** (fix real de
esta sesión): idéntico a `getJson` salvo que un 403 devuelve `null` en vez de tirar — usado solo para la
llamada de Score (restringida a Cliente/Admin desde Fase P2); sin esto, un CM/Diseñador usando la skill
recibía un 403 que rompía `fetchCampaigns()` entero. Cualquier otro error no-2xx sigue tirando normal.

**`ideas/`** — CRUD real, y **dueño único del dominio de ideas en todo el sistema** (`core-service` ya no
tiene ninguna lógica de esto, solo sigue siendo dueño de la migración del modelo `ContentIdea`):
- `GET ideas?campaignId=` (`campanas:ver`), `GET ideas/:id` (`campanas:ver`)
- `POST ideas` (`campanas:crear`, `CreateIdeaDto{campaignId,text,title?,source?:'sugerida'|'propia'}`)
- `PATCH ideas/:id` (`campanas:crear`, `UpdateIdeaDto{text?,title?}`)
- `DELETE ideas/:id` (`campanas:crear`, soft delete)
- `DELETE ideas?campaignId=&title=` (`campanas:crear`) — borra por título (lo que necesita
  `deleteIdeaFromBackend` del Lambda, que no tiene un id que darle a la skill); si hay varias ideas con el
  mismo título, se borra la más reciente (`orderBy createdAt desc`). Coexiste sin colisión con
  `DELETE ideas/:id` porque son formas de URL distintas (una con segmento de path, otra solo query params).

`IdeasService` habla **directo con Prisma** (`prisma.contentIdea.*`) para todo el CRUD — no vía HTTP a
core-service para el dato en sí. `assertCampaignAccess()` sí llama por HTTP a `GET
{CORE_SERVICE_URL}/api/campaigns` (reenviando el Bearer del caller) para reusar el filtrado de pertenencia
que ya hace core-service, en vez de reimplementarlo.

**Base de datos — matiz importante, no es "sin BD propia" a secas**: `alexa-service` tiene su propio
`prisma/schema.prisma`, **pero declara solo el modelo `ContentIdea`**, apuntando a la misma base física de
`core-service` (`DATABASE_URL_CORE`, `gestor_redes_core`). Tiene acceso directo de lectura/escritura a esa
tabla, con una regla dura en el propio schema: **nunca se corre `prisma migrate` desde acá** — `core-service`
sigue siendo el único dueño de la migración; si el shape de `ContentIdea` cambia ahí, esta copia hay que
sincronizarla a mano. Para todo lo demás (campañas, marcas, métricas, score) es HTTP puro. Es decir: dos
patrones de integración distintos conviviendo en el mismo servicio, ambos reales.

**Account-linking del Lambda vive en `auth-service`, no acá** — `alexa-service` no tiene ningún endpoint
propio de linking; ver §1.3 (`POST auth/link-code`/`redeem`).

**Generación de ideas con IA (`fetchContentIdeas`) — sigue sin implementar**, bloqueada por no tener
`ANTHROPIC_API_KEY` de pago configurada. Confirmado: cero referencias a Anthropic en todo `apps/backend`
fuera de docs. `docs/skill/backend-api-reference.md` (fecha de última verificación en vivo: 2026-08-14) es
el contrato autoritativo y actual, cruzado contra el código sin encontrar divergencias —
`AlexaSkill-Diseno-Final.md`/`lambda-codigo-por-pasos.md` siguen deprecados/superados.

**BD**: sin base propia que migre; acceso directo (no HTTP) solo a `ContentIdea` en `gestor_redes_core`.

### 1.6 Modelo de datos — 2 schemas separados (`docs/base/modelo2.txt` es la fuente de verdad)

**`auth-service`** (`gestor_redes_auth`): `Role`, `Module`, `Action`, `RolePermission` (RBAC dinámico),
`User`, `UserRole` (multi-rol), `RevokedAccessToken` (respaldo Postgres de la denylist), `RefreshToken`
(rotación con `familyId`/`revokedAt`), `PasswordResetToken`, `AccountLinkCode` (Alexa Skill), `Notification`,
`AuditLog` (BIGINT, inmutable). `UserStatus` enum (`pending`/`active`/`suspended`).

**`core-service`** (`gestor_redes_core`): `Category`/`Specialty`/`SocialNetwork` (catálogos),
`UserProfile` (vinculado a `User` por `userId`, sin `@relation` real — bases distintas) +
`UserProfileCategory`/`UserProfileSpecialty`, `Brand` (`profileType`, `ownerId` singular, `refId`/
`profileKey` de Ayrshare), `SocialAccount`, **`SocialAccountMetricSnapshot`** (nuevo — histórico de cuenta,
`followers` requerido, `likes/comments/shares/views/reach` opcionales nunca-0), `Campaign` (`cmId` único,
`cmStatus: CmAssignmentStatus` + `cmRespondedAt?/cmRejectionReason?`), `CampaignDesigner`, **`CmTeamMember`**
(nuevo — roster general del CM, PK compuesta, sin soft-delete), `CampaignCategory`, `Post` (Capa 1, agnóstica
de red), `PostStatusHistory` (BIGINT, inmutable), `PostSocialAccount` (Capa 2, entrega física por red, con
`providerStatus/errorCode/retryCount/lastSyncedAt/submittedAt/providerScheduledAt`), `PostSocialNetwork`
(redes solicitadas antes de resolver `SocialAccount`), `Media`/`PostMedia` (sin `deletedAt` en `PostMedia`,
no es "tabla principal"), `ContentIdea` (schema aquí, lógica en `alexa-service`), `PostMetric` (Capa 3, con
`raw: Json?` porque algunos payloads nativos expiran — TikTok 7 días, X 30 días), `BrandScore` (append-only),
`Report` (sin `deletedAt`, es un log de solicitud), **`ProviderRequestLog`** (nuevo — traza de cada llamada
a Ayrshare, nunca guarda body completo ni la API key), **`MetricSyncRun`** (nuevo — una fila por corrida de
cron), `AuditLog` (BIGINT, inmutable, copia local).

`PostStatus` — **11 valores** (antes 10; se agregó `rechazado_cliente` en Fase O para el segundo tramo de
aprobación Cliente): `borrador, en_revision, aprobado, rechazado, rechazado_cliente, programado,
publicando, publicado, parcial, error, cancelado`. `PostSocialAccountStatus` (5, sin cambios):
`pendiente/publicando/publicado/error/cancelado`. `CmAssignmentStatus` (nuevo):
`pendiente/aceptada/rechazada`.

**`alexa-service`** tiene su propio `prisma/schema.prisma` con **solo** `ContentIdea`/`ContentIdeaSource`,
apuntando a la misma base física que `core-service` (`gestor_redes_core`) — nunca migra desde ahí.

Todas las tablas de negocio: `deletedAt` (soft delete) salvo las ya señaladas como excepción (`PostMedia`,
`Report`, `CmTeamMember`, `CampaignDesigner`), `createdAt`/`updatedAt`, UUID PK excepto `AuditLog`/
`PostStatusHistory` (BIGINT autoincrement).

### 1.7 Seed / credenciales demo (`packages/seed/src/index.js`)

`pnpm seed` → `pnpm --filter seed run start` → `node --env-file-if-exists=.../auth-service/.env
--env-file-if-exists=.../core-service/.env src/index.js` (carga los 2 `.env` de servicio que necesita —
ya no hay `.env` en la raíz, ver Contexto de `README.md`). Todo `upsert`/idempotente, **nunca borra datos
de negocio** (marcas, campañas, posts, cuentas conectadas quedan intactos en cada corrida) — la única
operación de borrado es `userRole.deleteMany`+`createMany`, acotada al `userId` de cada uno de los 6
usuarios demo, para reconciliar sus roles.

Siembra en `authPrisma`: 10 módulos (`catalogos, marcas, publicaciones, calendario, campanas, metricas,
score, reportes, usuarios, privilegios`), 9 acciones (`ver, crear, editar, eliminar, aprobar, rechazar,
exportar, configurar, asignar`), 4 roles. `administrador` recibe todo. Matriz real de los otros 3 (con las
adiciones de Fase O/L ya incluidas):
- `community_manager`: catalogos:[ver], marcas:[ver], publicaciones:[ver,crear,editar,aprobar,rechazar],
  calendario:[ver,crear,editar], campanas:[ver,crear,editar,asignar,aprobar,rechazar], metricas:[ver],
  score:[ver], reportes:[ver]
- `disenador`: catalogos:[ver], marcas:[ver], publicaciones:[ver,crear,editar], calendario:[ver],
  campanas:[ver]
- `cliente`: catalogos:[ver], marcas:[ver,crear,editar], publicaciones:[ver,aprobar,rechazar,editar],
  calendario:[ver], campanas:[ver,crear,editar], metricas:[ver], score:[ver], reportes:[ver,exportar]

6 usuarios demo (`authPrisma.user` + `corePrisma.userProfile`, vinculados por `userId`):

| Email | Password | Roles |
|---|---|---|
| 20233tn102@utez.edu.mx | admin123 | administrador |
| cm@bananagram.mx | cm123456 | community_manager |
| disenador@bananagram.mx | diseno123 | disenador |
| cliente@bananagram.mx | cliente123 | cliente |
| alex@bananagram.mx | alex12345 | cliente |
| multi@bananagram.mx | multi12345 | community_manager **+** disenador |

**No siembra catálogos** (categorías/especialidades/redes sociales) a propósito — se crean vía API una vez
logueado (ver README §Flujo esperado de punta a punta).

---

## 2. Frontend

### 2.1 `@repo/ui` (`apps/frontend/commons/`) — paquete workspace compartido por las 6 apps

Exports map (`package.json`): `.`, `./ui`, `./theme`, `./state`, `./types`, `./config`, `./utils`, y **2
nuevos**: `./jwt` (`decodeJwt`/`encodeMockJwt`, separado para no arrastrar RTK Query al bundle de Edge
Middleware) y `./session-middleware` (`resolveSessionAction`, mismo motivo).

**`api/` — 3 slices reales (antes solo `authApi`)**:
- **`auth.api.ts`** (`authApi`) — `login: POST auth/login`, `register: POST auth/register`,
  `forgotPassword: POST auth/password-reset/request`, `resetPassword: POST auth/password-reset/confirm`
  (traduce `{token,password}`→`{token,newPassword}`), **`createLinkCode: POST auth/link-code`** (nuevo,
  Alexa Skill). Nota: las rutas reales de forgot/reset son `auth/password-reset/*`, no
  `auth/forgot-password`/`auth/reset-password` como decían versiones previas de este doc.
- **`catalogs.api.ts`** (`catalogsApi`, nuevo) — CRUD completo de categorías/especialidades/redes sociales,
  consumido de verdad por `admin-front` (gestión) y `brands-front`/`posts-front` (lectura, selectores).
- **`notifications.api.ts`** (`notificationsApi`, nuevo) — `getMyNotifications: GET me/notifications`,
  `markNotificationRead: PATCH me/notifications/:id/read`. Registrado en las **6** zonas, respalda
  `NotificationBell`.
- **`authenticated-base-query.ts`** (`createAuthenticatedBaseQuery()`, nuevo) — factory compartida: Bearer
  header, y en un 401 hace **un solo** `POST auth/refresh` coordinado (promesa a nivel de módulo dedupe
  401s concurrentes), reintenta una vez, si el refresh también falla hace `logout()` + redirect duro a
  `authFront/login`. La usan `catalogsApi`/`notificationsApi` y también los slices locales de
  brands-front/posts-front/analytics-front.

**`hooks/`**:
- `usePermissions()`, `useSession()`, `useSessionBootstrap()` — sin cambios.
- **`useNotifications()` — ya NO es un stub**: `useGetMyNotificationsQuery()` sin `pollingInterval` (se
  quitó el poll de 30s esta sesión — redundante, ver siguiente punto).
- **`useNotificationStream()` (nuevo)** — mecanismo real de push. No usa `EventSource` nativo (no soporta
  headers custom); hace `fetch(.../me/notifications/stream, {headers:{Authorization}})` y parsea el stream
  a mano (`response.body.getReader()`, frames `data: {...}\n\n`, ignora `: ping`/`: connected`). Por cada
  notificación: `dispatch(notificationsApi.util.updateQueryData('getMyNotifications', undefined, draft =>
  draft.unshift(...)))` (mutación directa del cache de RTK Query) + `window.dispatchEvent(new
  CustomEvent('bananagram:notification', {detail}))` (para listeners locales, ej.
  `useCampaignsLiveRefresh` en brands-front). Reconecta con backoff exponencial (1s→30s). Montado en
  `providers.tsx` de las 5 zonas no-auth. **Es el único disparador de actualizaciones tras el montaje** —
  `useNotifications()` ya no hace polling.

**`session/`**:
- `cookieSession.ts` — ahora maneja **2 cookies**: `bananagram_token` (access) y **`bananagram_refresh_token`**
  (nuevo). Ninguna HttpOnly, `SameSite=Lax`.
- **`resolve-session-action.ts` (nuevo)** — `resolveSessionAction(accessToken?, refreshToken?) →
  {type:'allow'} | {type:'refresh', accessToken, refreshToken} | {type:'redirect'}`. Sin dependencia de
  `next/server`, para poder compartirse entre los `middleware.ts` de las 5 zonas. **`admin-front`,
  `analytics-front`, `brands-front`, `posts-front`, `web-shell` ya tienen `middleware.ts` real**
  (verifica expiración, intenta refresh silencioso, redirige a login si falla) — contradice versiones
  previas de este doc, que decían que solo `web-shell` tenía uno y era passthrough total. Solo valida
  presencia/expiración del payload, no la firma (eso lo hacen los microservicios vía JWKS).

**`state/auth.slice.ts`** — `AuthState{user,accessToken,permissions,ownedBrandIds,isAuthenticated}` sin
cambios de forma. `setCredentials` lee `payload.brandIds ?? payload.ownedBrandIds ?? []` (real usa
`brandIds`, mock usa `ownedBrandIds`). `state/index.ts` ahora re-exporta también `catalogsApi`,
`notificationsApi`, `authenticatedBaseQuery`.

**`ui/atoms/`** (7, sin cambio de cantidad): igual que antes, salvo `StatusChip` — **ahora cubre 11 valores
de `PostStatus`** (se agregó `rechazado_cliente`, Fase O).

**`ui/molecules/`** (12): sin cambio de cantidad; `NotificationBell` ahora conectado de verdad
(`useNotifications`/`useMarkNotificationReadMutation`), con mensajes/deep-links reales para 7+ tipos de
notificación (`campaign_pending_cm_approval`, `post_rejected_by_client`, etc.).

**`ui/organisms/`** (**5, no 4** — se agregó `ToastProvider`/`useToast()`, sistema de toasts real montado
en todas las zonas): `DataTable`, `RoleSwitcher` (sigue deshabilitado/sin importar en ningún lado),
`SidebarNav`, `TopBar`, `ToastProvider`.

**`SidebarNav` — 3 capacidades nuevas de matching** (`SidebarNavItem`, usadas por
brands-front/posts-front/analytics-front para el ítem activo del sidebar):
- `activeMatchPrefixes?: string[]` — prefijos literales adicionales
- `activeMatchSegmentPrefixes?: string[][]` — patrón por segmento con comodín `'*'`, para rutas con id
  dinámico (ej. `[['brands','*','campaigns']]` matchea `/brands/cualquier-id/campaigns/*`)
- `activeMatchExcludeSegmentPrefixes?: string[][]` — mismo matcher, en negativo (excluye un ítem de su
  propio match cuando la ruta cae en el patrón, para sub-rutas que viven bajo ese href pero pertenecen a
  otro ítem)

**Confirmado ausente**: `MediaCarousel` no vive acá — es local de `posts-front`.

**`config/`, `theme/`** — sin cambios de fondo (theme ganó overrides extra de responsive:
`MuiInputLabel/MuiTabs/MuiStack/MuiDialogActions/MuiToggleButtonGroup`, no documentados antes).

**`utils/getPostAuthDestination`** — ahora acepta `string | string[]` (antes solo un rol) para soportar
`AuthUser.roles[]` real, multi-rol.

**`types/`** (13 archivos, antes menos documentados): `modules.enum.ts`/`actions.enum.ts` **ya están en
español, idénticos a los del backend** (contradice versiones previas: "distintos de los del backend, sin
unificar" — **ya se unificaron**). `post.types.ts`: `PostStatus` 11 valores. Nuevos: `notification.types.ts`
(`Notification{id,userId,type,payload,readAt?,createdAt}`), `password-reset.types.ts`. `media.types.ts`:
`Media{id,brandId,uploadedBy,fileName,originalName,mimeType,url,size,width?,height?,duration?}`,
`PostMedia{postId,mediaId,order}`. `campaign.types.ts` más rico: `cmStatus`, `cmRespondedAt?`,
`cmRejectionReason?`, `designers?`, `categories?`.

**`mocks/` — estado mixto, preciso**: `mock-users.ts`/`build-user-token.ts` **siguen en uso real**, pero
solo por `RegisterForm`/`ActivateForm` de `auth-front` (no por `LoginForm`, que ya es real — ver §2.4).
`mock-tokens.ts` solo lo usa `RoleSwitcher`, sin importar en ningún lado activo. **`mock-world.ts`** (marca/
cuenta social/campaña) sigue genuinamente en uso real por partes mock de `brands-front`/`posts-front` (ver
§2.5/§2.6) — es dato de demostración no relacionado con auth, no confundir los dos tipos de "mock" del
proyecto.

### 2.2 `web-shell` (puerto 3000, host MFE, paquete `@repo/web-shell`)

- `next.config.ts` rewrites — tabla completa: auth-front (`/login`, `/register`, `/forgot-password`,
  `/reset-password`), admin-front (`/users`, `/roles`, `/audit-log`, `/catalogs/*`), brands-front
  (`/brands[*]`, `/my-campaigns`, `/team`, `/profile[*]` — el rewrite de `/profile` se agregó a propósito al
  introducir `/profile/alexa`), posts-front (`/posts[*]`, `/approvals`), analytics-front (`/metrics`).
- **`middleware.ts` ya NO es passthrough** — enforcement real de sesión vía `resolveSessionAction` (ver
  §2.1), redirige a `authFront/login` si la sesión no es válida ni refrescable.
- `app/page.tsx` — igual que antes (lee cookie, redirige server-side), pero decodifica `payload.roles[]`
  (array), no un rol singular.
- **`components/dashboard/` — se redujo**: `DashboardCliente`/`DashboardCM`/`DashboardDisenador` (que
  existían sin usarse) **se borraron**, junto con su mock data. Solo queda `DashboardAdmin` (real, la única
  ruta wireada).
- `components/layout/Sidebar.tsx` — **ítem "Team" confirmado eliminado** (sin `GroupIcon` huérfano). Ítems
  actuales: `dashboard`, `my-campaigns`, `my-brand`, `posts`, `brands` (legacy), `calendar`, `metrics`,
  `admin`.
- `store/api/*.ts` — **5 slices vacíos** (antes 7): `ai`, `metrics`, `notifications`, `posts`, `reports`
  (`brands`/`campaigns` se borraron del todo, no solo quedaron sin registrar). `store/index.ts` registra
  `authReducer`, `authApi`, y **`notificationsApi`** (real, uno más que antes).

### 2.3 `admin-front` (puerto 3010, sirve `/users`, `/roles`, `/audit-log`, `/catalogs/*`)

- **`/catalogs/categories`, `/catalogs/specialties`, `/catalogs/social-networks` — ya son reales**:
  `CatalogList.tsx`/`SocialNetworkForm.tsx` llaman `useListCategoriesQuery`/`useCreateCategoryMutation`/etc.
  de `@repo/ui/state` (`catalogsApi`), CRUD contra `core-service` de verdad. Contradice versiones previas
  ("sigue usando el componente genérico mock").
- **`/users`, `/roles`, `/audit-log` — siguen 100% mock**, pese a que el backend real ya existe
  (`AdminModule` en `auth-service`, ver §1.3) — es un hueco de conexión frontend, no de backend.
  `CreateUserDialog` sigue escribiendo a `useState` local.
- `store/index.ts` registra `authReducer`, `authApi`, `catalogsApi`, `notificationsApi` — RTK Query real en
  uso (no "sin RTK Query local" como decían versiones previas — sí usa slices compartidos con datos reales).
- **`middleware.ts` real** (mismo patrón que web-shell, ver §2.1).
- Sidebar: mismo patrón que web-shell, "Team" eliminado, sin `GroupIcon` huérfano.

### 2.4 `auth-front` (puerto 3012, sirve `/login`, `/register`, `/forgot-password`, `/reset-password`, `/activate`)

- **`LoginForm` — YA ES REAL**: `useLoginMutation()` (backend de verdad vía `authApi`), guarda access +
  refresh token en las 2 cookies reales, decodifica el JWT real (`payload.roles[]`), redirige vía
  `getPostAuthDestination(roles)`. El hint de consola ahora imprime credenciales reales del seed
  (`admin@bananagram.mx`... **nota**: ese string literal en el código sigue diciendo `admin@bananagram.mx`,
  que ya no es el email real del seed — es `20233tn102@utez.edu.mx`, ver §1.7 — vale la pena corregirlo si
  se toca este archivo).
- **`RegisterForm`, `ForgotPasswordForm` (el submit), `ActivateForm` — siguen 100% mock** (JWT sin firmar
  vía `findUserByEmail`/`buildTokenFromUser`). `ForgotPasswordForm` tiene el comentario explícito "Diseño
  sin backend: no se consume ninguna API todavía", pese a que `useForgotPasswordMutation` ya existe y
  apunta a un endpoint real.
- `ResetPasswordForm` — sí lee `?token=` real de la URL (`useSearchParams`), pero el submit sigue siendo
  solo local.
- Sin `middleware.ts` (correcto — es el destino de login). `store/index.ts` sin cambios (solo
  `authReducer`/`authApi`).

### 2.5 `brands-front` (puerto 3013, sirve `/brands/*`, `/my-campaigns`, `/my-team`, `/team`, `/profile/*`)

**Rutas — real vs. mock, exacto por ruta** (no generalizar a nivel de zona):

| Ruta | Estado |
|---|---|
| `/profile` (`ClientSection`/`StaffProfileSection` según rol) | `ClientSection` **real**; `StaffProfileSection` (perfil CM/Diseñador) **mock** |
| `/profile/alexa` (nuevo) | **Real** — link-code + ideas guardadas, solo Cliente/Diseñador |
| `/profile/campaigns` | **Real** |
| `/profile/campaigns/[campaignId]` | **Eliminada** — consolidada en `/brands/[id]/campaigns/[campaignId]` (Fase M, URL única de detalle) |
| `/profile/calendar` | **Mock** (`react-big-calendar` rico, sin conectar) |
| `/my-campaigns` | **Real** |
| `/my-team` | **Real** — roster general del CM |
| `/team` | **Mock**, agregado de solo lectura, **sin ítem en el Sidebar** (página sigue existiendo, solo no es alcanzable desde el menú) |
| `/brands`, `/brands/[id]` | **Real** (legacy, browsing tipo Admin) |
| `/brands/[id]/campaigns[/:campaignId[/team]]` | **Real** — URL canónica única de detalle de campaña |
| `/brands/[id]/{metrics,score,reports,calendar}` | **Mock**, todo el árbol (vía `BrandTabs`) |
| `/my-brand`, `/onboarding` | Solo `redirect('/profile')` |

**Multi-marca real**: un Cliente puede tener varias marcas. `useSelectedBrand()` + slice Redux
`selectedBrand.slice.ts` (`selectedBrandId`, persiste entre `/profile`↔`/profile/campaigns`).
`ClientSection` muestra selector de marca + "Nueva marca" solo si `myBrands.length > 1`.

**`store/api/*.ts` (todos reales)**: `brands.api.ts` (`listMyBrands`, `getBrand`, `createBrand` — real
llamada a Ayrshare vía backend, `updateBrand`, `createConnectUrl`), `campaigns.api.ts` (CRUD completo +
`listEligibleCMs`/`Designers`, `acceptCampaign`/`rejectCampaign`), `cm-team.api.ts` (`listMyTeam`,
`addToMyTeam`, `removeFromMyTeam`), `ideas.api.ts` (`listIdeasByCampaign`, `deleteIdea` — solo lectura/borrado,
crear es solo por voz), `metrics.api.ts` (`getCampaignMetrics`, `refreshCampaignMetrics`), `posts.api.ts`
(solo `listPostsByCampaign`, para "Publicaciones recientes"), `social-accounts.api.ts` (`list`, `sync`,
`disconnect`).

**Sidebar (`components/layout/Sidebar.tsx`)** — mismo patrón que las otras 2 zonas grandes: ítem `my-team`
(label "Diseñadores"), "Team" eliminado. Usa las 3 capacidades nuevas de `SidebarNav` (§2.1):
`my-campaigns` reclama `/brands/:id/campaigns/*` vía `activeMatchSegmentPrefixes` (para CM/Diseñador);
`brands` ("Marcas") **excluye** ese mismo patrón vía `activeMatchExcludeSegmentPrefixes` — salvo para
Cliente, donde el componente vuelve a quitarle esa exclusión (Cliente no tiene `my-campaigns`, así que ahí
"Marcas" sí debe quedar activo en el detalle de campaña).

**Hooks**: `useSelectedBrand.ts` (multi-marca), `useCampaignsLiveRefresh.ts` (escucha el evento
`bananagram:notification` del stream SSE; si el tipo empieza con `campaign_`, invalida el tag `Campaign` de
RTK Query — refresco en vivo sin polling).

### 2.6 `posts-front` (puerto 3014, sirve `/posts/*`, `/approvals`)

Todas las rutas son reales: `/posts` (filtros de status+campaña, `useListPostsQuery`), `/posts/new`,
`/posts/[id]`, `/posts/approvals` (5 secciones por audiencia: CM "Para revisar"/"Rechazadas por el
Cliente", todos "Esperando al Cliente", Diseñador/CM "Rechazadas por el CM", todos "Borradores").

**Flujo completo de aprobación** (2 tramos): `borrador`→`en_revision`→CM decide
`aprobado`/`rechazado`(vuelve a Diseñador)→`aprobado`→Cliente programa (`programado`) o rechaza
(`rechazado_cliente`, Fase O) → desde ahí solo el CM puede editar-y-reenviar (`aprobado`) o regresarlo al
Diseñador (`borrador`, con el motivo del Cliente siempre visible vía `statusHistory`) →`programado`→cron
por evento→`publicando`→`publicado`/`parcial`/`error`, o `cancelado` desde `programado`.

**`components/MediaCarousel.tsx` (nuevo)** — carrusel cuadrado estilo Instagram, sin librería externa
(scroll-snap CSS nativo + índice sincronizado a mano por `onScroll`), flechas + puntos si hay >1 archivo,
video con `<video controls playsInline>`. Usado en `/posts/new` (preview por red, desde `File[]` locales) y
`/posts/[id]` (preview real, desde `post.media`).

**Creación atómica de post+media (fix de esta sesión)**: en `/posts/new`, si `uploadMedia` falla después de
`createPost`, se llama `deletePost(post.id)` (endpoint nuevo, `DELETE posts/:id`) para deshacer el borrador
huérfano, en vez de dejarlo creado sin imagen.

**Edición/borrado de media en el detalle (fix de esta sesión)**: en modo edición de `/posts/[id]` (solo
`borrador`/`rechazado`), miniaturas de `post.media` con botón de borrar (`removeMedia`, endpoint nuevo
`DELETE posts/:id/media/:mediaId`) + adjuntar nuevos archivos. `rechazado_cliente` (solo editable por el CM)
**no** tiene esta capacidad — el backend solo permite tocar media en `borrador`/`rechazado`.

**`store/api/posts.api.ts` — endpoints completos**: `listPosts`, `getPost`, `createPost`,
`submitForReview`, `approvePost`, `rejectPost`, `schedulePost`, `clientRejectPost`, `forwardToDesigner`,
`updatePost`, `cancelPost`, `uploadMedia` (multipart), `removeMedia` (nuevo), `deletePost` (nuevo).

**`lib/mock-data.ts`** — huérfano en su mayoría (nada de negocio lo usa ya); sobreviven solo constantes de
presentación (`NETWORK_LABELS`, `NETWORK_SHORT_LABELS`, `NETWORK_DISPLAY_COLORS`, `POST_CHAR_LIMIT=2200`) y
los re-exports de `mock-world.ts` de `@repo/ui`.

**Sidebar propio** (`components/Sidebar.tsx`, sin carpeta `layout/`) — **ítem `my-team` agregado esta
sesión** (antes solo existía en brands-front, el CM lo perdía al navegar a Posts).

### 2.7 `analytics-front` (puerto 3011, sirve `/metrics`)

**Tabs dinámicos**: solo muestra pestañas de las redes que la marca tiene realmente conectadas
(`useGetBrandSocialAccountsQuery`, filtrado por `active`) — antes las 6 aparecían siempre.

**Clasificación real de los 17 componentes de `components/dashboard/`**:

| Componente | Estado |
|---|---|
| `NetworkOverview`, `EngagementChart`, `CampaignBreakdown`, `ScoreExplanationPanel`, `NetworkComparison`, `CampaignComparison`, `TrendAnalysis`, `PostingHeatMap`, `AccountGrowthOverview` | **Real**, RTK Query |
| `NetworkMetricCards`, `TopContent`, `InsightsPanel`, `AudienceOverview`, `SelectedPostDetail` | **`EmptyState` estático** — limitación real de backend (sin métricas nativas por red, sin ranking, sin histórico semanal, sin demografía, sin endpoint de detalle por post) |
| `AnalyticsBreadcrumb`, `AnalyticsFilterBar`, `AnalyticsFilterDrawer` | **Real** |
| `AnalyticsDashboardLayout` | Existe, **sin usar en ningún lado** |

**Sistema de filtros — qué sí filtra de verdad**:
- **Marca** (`profileId`) y **Campaña** (`campaignId`) — vía `useFilteredCampaigns()`, el único punto donde
  se aplican sobre `useGetCampaignsMetricsSummaryQuery()`; todo widget real pasa por este hook.
- **Red social** (`networks[]`, multi-select) — vía `useNetworkCodesFilter()`, solo tiene efecto en la
  pestaña General (el drawer oculta el control por completo cuando hay una pestaña de red específica
  activa — `selectedNetwork` ya vacía `networks[]` al cambiar de pestaña).
- **Fecha** (`dateRange`) — vía `useDateRangeParams()`/`useDateRangeFilter()`.
- **"Filtros avanzados"** (Estado/CM/Diseñador/Categoría/Especialidad) — **oculto a propósito** tras
  `SHOW_ADVANCED_FILTERS=false` en `AnalyticsFilterDrawer.tsx`, no conectado, código intacto por si se
  activa después.

**`store/api/analytics.api.ts`**: `getCampaignsMetricsSummary`, `getBrands`, `getBrandScore`,
`getBrandSocialAccounts`, `getBrandMetricsHistory`, `getBrandScoreHistory`, `getCampaignMetricsHistory` —
todos reales.

**`useLatestFollowers`** — lee el último snapshot de `metrics-history` en vez del campo `SocialAccount.
followers` (que solo se actualiza con un sync manual y puede quedar días desactualizado) — mismo criterio
que ya usaba `AccountGrowthOverview`.

**Motor mock viejo (`lib/analytics/engine.ts` + `analytics.selectors.ts` sobre `MOCK_METRIC_FACTS`)** —
sigue importado pero **prácticamente muerto**: de ~20 selectores solo 4 tienen consumidor real
(`selectAnalyticsFilters`, `selectSelectedNetwork`, `selectActiveFiltersCount`, `selectSelectedPostLabel`),
y ninguno de esos 4 depende en la práctica del dataset mock. El filtro por `postId` también está muerto en
la práctica — nada dispara `selectPost(<id real>)`.

**Sidebar** — mismo patrón que las otras 2 zonas grandes; **`my-team` agregado esta sesión** (mismo caso
que posts-front, antes solo existía en brands-front).

---

## 3. Patrones transversales a recordar

- **Gate de permisos en frontend**: siempre `usePermissions().can(module, action)` /
  `<ProtectedAction module="..." action="...">` (de `@repo/ui/ui`). **Los slugs de módulo/acción del
  frontend YA COINCIDEN con los del backend** (`AppModule`/`AppAction` de `@repo/ui/types`, ambos en
  español) — la divergencia inglés/español documentada en versiones previas de este archivo **ya se
  resolvió**.
- **Navegación cross-zone**: siempre vía `ZONE_URLS` (`@repo/ui/config`) + `window.location.href` (full
  page nav). Dentro de la misma zona, `router.push`.
- **Sesión compartida — real, no solo mock**: 2 cookies (`bananagram_token` access + `bananagram_refresh_token`
  refresh), `createAuthenticatedBaseQuery()` maneja el refresh-on-401 automático y coordinado, y
  `middleware.ts` (5 de 6 zonas, todas salvo `auth-front`) hace enforcement real de sesión en el edge vía
  `resolveSessionAction` — ya no es "guard desactivado hasta que exista backend real": el backend existe y
  el guard está activo.
- **`SidebarNav`**: además de `activeMatch`/`exactMatch`/`activeMatchPrefixes` originales, ahora soporta
  matching por segmentos con comodín (`activeMatchSegmentPrefixes`/`activeMatchExcludeSegmentPrefixes`,
  ver §2.1) para rutas con id dinámico en medio (ej. `/brands/:id/campaigns/*`).
- **Notificaciones en tiempo real**: `useNotificationStream()` (SSE) es el único disparador de
  actualizaciones tras el montaje inicial — el polling que existía antes se quitó por redundante.
- **Mock data de Marca/Campaña/Cuenta social** (`@repo/ui/mocks/mock-world.ts`) sigue siendo la fuente
  única para las partes de `brands-front`/`posts-front` que aún no se conectaron (ver §2.5/§2.6) — no
  confundir con el mock de autenticación (`mock-users.ts`/`build-user-token.ts`, usado solo por
  Registro/Activación, ver §2.1/§2.4), son dos sistemas mock independientes con estados de migración
  distintos.
- **Todas las 6 apps siguen el mismo esqueleto**: `app/layout.tsx` → `app/providers.tsx`
  (`EmotionCacheProvider` → `ReduxProvider` → MUI `ThemeProvider`+`CssBaseline` → `ToastProvider` →
  `SessionBootstrap` → `useNotificationStream()` (excepto auth-front) → `AppShell`/children) →
  `components/AppShell.tsx` (`Sidebar`+`TopBar`+contenido).
