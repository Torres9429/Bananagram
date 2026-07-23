# INVENTORY.md — Mapa detallado del código (para Claude)

Este archivo es un inventario exhaustivo de rutas, endpoints, componentes, tipos y estado real de cada
paquete del monorepo. Se generó leyendo el código fuente completo (no se infiere nada). Complementa a
`.claude/CLAUDE.md` (que da la arquitectura general y las reglas críticas) con el detalle fino que
`CLAUDE.md` no incluye para no inflar el contexto de cada sesión.

**Cuándo leer este archivo**: antes de tareas puntuales tipo "agrega un endpoint a X", "crea un componente
para Y", "consume tal servicio desde tal front", "elimina/cambia el flujo de Z" — así no hay que re-explorar
el árbol de archivos correspondiente.

**Última actualización**: sección 1 (Backend) actualizada 2026-07-23; sección 2 (Frontend) sigue en su
estado de 2026-07-19. Si el código diverge de lo aquí descrito, confía en el código y actualiza este archivo.

**⚠️ 2026-07-19 — Alineación de mocks/tipos del frontend a `modelo.txt`**: la sección 2 (Frontend) de este
documento refleja el frontend **post-alineación** (tipos/mocks de `@repo/ui` y las 6 apps reescritos para
seguir el schema estable en `docs/base/modelo.txt`) — el frontend sigue en modo mock, sin conectar al
backend real. Ver `docs/frontend-db-alignment.md` (análisis + 12 decisiones de producto) y
`docs/frontend-db-alignment-implementation.md` (registro de la implementación) para el detalle.

**⚠️ 2026-07-23 — el backend SÍ se tocó de fondo** (la nota anterior de esta sección decía lo contrario,
ya no aplica): se separaron las bases de datos de `auth-service`/`core-service` adoptando
`docs/base/modelo2.txt` completo (2 schemas, 2 bases — `gestor_redes_auth`/`gestor_redes_core`), se
wireó `AuthModule`+`PermissionsModule` en `auth-service` y `CatalogsModule` en `core-service` (ambos
`AppModule` dejaron de estar vacíos), se arregló el bug de `AuthService.refresh()`, y se protegieron los
endpoints de catálogos con `JwtAuthGuard` + DTOs con `class-validator`. Detalle completo abajo en cada
subsección — ya NO hay bandera de "STALE" porque se reescribió.

---

## 0. Estado real de implementación (léase primero — es la sorpresa más grande del repo)

Este proyecto está en etapa de **scaffold**: la estructura de carpetas/módulos/DTOs está creada según las
convenciones (`agents/conventions.md`), pero la mayoría de las piezas todavía no están conectadas entre sí.
Antes de asumir que algo "ya funciona", verifica contra esta lista:

### Backend — solo auth-service y core-service responden hoy, y no todo su dominio
- **`auth-service` y `core-service` ya tienen su `AppModule` wireado** (desde 2026-07-23) —
  `auth-service` importa `AuthModule` (login/refresh/logout/me) + `PermissionsModule`
  (`GET /me/permissions`); `core-service` importa `CatalogsModule` (CRUD de categories/specialties/
  social-networks, protegido con `JwtAuthGuard`). **`alexa-service` sigue con `imports: []`** y el
  comentario `// TODO: importar módulos de dominio` — no se tocó en esta ronda.
- **El gateway ya proxea de verdad** (2026-07-23): `/api/auth/*`+`/api/me/*` → `auth-service`,
  `/api/catalogs/*` → `core-service`, vía `http-proxy-middleware` montado en `main.ts` (no en
  `app.module.ts`, que sigue solo con `HealthController`+`CorrelationIdMiddleware`). Ver §1.1 para el
  detalle de implementación. Falta agregar rutas nuevas conforme se construyan más módulos de dominio.
- **`core-service/campaigns`, `core-service/reports`, `core-service/ideas`** siguen siendo clases
  completamente vacías (`@Controller('campaigns') export class CampaignsController {}`, sin métodos) — no
  se tocaron. **`alexa-service/campaigns`+`alexa-service/ideas`** — mismo patrón de stub vacío.
- **La máquina de estados de posts sigue sin ningún controller que la exponga** — `post-state-machine.ts`
  + `transitions.map.ts` (real, ahora con los 10 valores de `PostStatus` — ver §1.6), `char-limits.map.ts`
  (real), `PostSchedulerService` (cron real, publica posts `programado`→`publicado`, sin cambios porque no
  tocaba campos removidos del schema).
- **Lo que SÍ es lógica de negocio real y completa** (aunque inalcanzable por HTTP salvo lo de auth/catalogs):
  - `auth-service`: `AuthController`/`AuthService`/`AuthRepository`/`PermissionsController` — **wireados y
    verificados en vivo** (login, refresh, `/me`, `/me/permissions`, contra su propia BD `gestor_redes_auth`).
  - `core-service/catalogs/` — CRUD completo de `Category`/`Specialty`/`SocialNetwork`, **wireado,
    protegido con `JwtAuthGuard` y validado con `class-validator`** (2026-07-23) — verificado en vivo contra
    `gestor_redes_core`.
  - `core-service/score/score.service.ts`: `ScoreService.calculate(brandId)` — calcula y persiste en
    `brand_scores`. Fórmula real: `score = consistency×0.30 + engagement×0.40 + coverage×0.20 +
    frequency×0.10` — **difiere del texto en `CLAUDE.md`** (3 factores, sin cobertura); confirma con el
    usuario cuál es la vigente antes de tocarlo. Reescrito 2026-07-23 para el nuevo shape (opera sobre
    `PostSocialAccount`/`SocialAccount`, ya no `BrandProfile` — ver §1.6).
  - `core-service/cron/metrics-cron.service.ts` + `metrics/decay-simulator.ts` — métricas simuladas con
    decaimiento exponencial; reescrito 2026-07-23 para generar `PostMetric` sobre `PostSocialAccount`
    (antes sobre `Post`+`BrandProfile` directo) y agregó el campo `views`.
  - **Bug de `AuthService.refresh()` corregido** (2026-07-23) — antes re-llamaba `login()` con
    `password: ''`, lo cual siempre fallaba; ahora arma el JWT directo desde el usuario del refresh token
    (método privado `issueTokens()`, compartido con `login()`).
- **Guards**: `JwtAuthGuard` se usa en `auth-service` (rutas propias) y ahora también en `core-service`
  (catálogos) — `core-service` tuvo que ganar su propia infraestructura JWT
  (`src/guards/jwt-auth.guard.ts`, `src/strategies/jwt.strategy.ts`, `src/auth/jwt-auth.module.ts`, todo
  nuevo 2026-07-23) porque no tenía nada de esto antes (solo `auth-service` hacía login). `PermissionGuard`
  sigue sin usarse en ningún lado. `BrandAccessGuard` **ya no vive en `commons/`** — se reescribió en
  `core-service/src/guards/brand-access.guard.ts` (valida acceso a una marca con una consulta LOCAL contra
  `Brand.ownerId`/`Campaign.cmId`/`CampaignDesigner.userId` usando el `sub` del JWT, sin depender de
  `brandIds[]` — ver §1.4 y el gap de `brandIds` en `CLAUDE.md`). Existe y compila, pero **todavía no está
  aplicado a ningún endpoint** (no hay endpoints de `campaigns`/`brands` reales).
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
- ~~Bug conocido: `POSTS_FRONT_URL` sin importar en `brands-front/profile/campaigns/[campaignId]/page.tsx`~~
  — **corregido** el 2026-07-19 durante la alineación a `modelo.txt` (ver
  `docs/frontend-db-alignment-implementation.md`).
- Los datos mock **siguen sin estar sincronizados entre zonas** (esto no cambió con la alineación —
  solo se alinearon los *nombres/shapes de campo* a `modelo.txt`, no se unificó el mock store): `brands-front`
  y `posts-front` tienen cada uno su propio `MOCK_CAMPAIGNS`/`SocialAccount` con IDs parecidos (`c1`, `bp1`...)
  pero formas distintas — no hay una fuente única. Documentado explícitamente en comentarios del código.
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

### 1.1 Gateway (`apps/backend/gateway/`, puerto 4000, paquete `@repo/api-gateway`) — proxea de verdad desde 2026-07-23
- `src/main.ts` — `NestFactory.create(AppModule, { bodyParser: false })` (el `false` es necesario: si Nest
  parseara el body antes de llegar al proxy, `http-proxy-middleware` reenviaría POST/PATCH con el body ya
  consumido/vacío). `app.enableCors()`, `listen(4000)`. Sin Swagger, sin prefix global.
- Monta 3 proxies con `app.use(createProxyMiddleware({ pathFilter, target, changeOrigin: true }))` — **sin**
  pasar el path a `app.use()` (si se hiciera `app.use('/api/auth', ...)`, Express recortaría ese prefijo de
  `req.url` antes de pasarlo al middleware, y el proxy reenviaría `/login` en vez de `/api/auth/login`).
  `pathFilter` matchea sobre la URL completa sin tocarla:
  - `/api/auth` → `AUTH_SERVICE_URL`
  - `/api/me` → `AUTH_SERVICE_URL`
  - `/api/catalogs` → `CORE_SERVICE_URL`
  Faltan agregar rutas nuevas conforme se construyan (`/api/campaigns`, `/api/posts`, etc. → `CORE_SERVICE_URL`).
- `AUTH_SERVICE_URL`/`CORE_SERVICE_URL` — mismo patrón host-vs-Docker que `DATABASE_URL_AUTH`/`CORE`:
  `.env` trae `localhost:3001`/`3002` (para `pnpm dev`), `docker-compose.yml` los override con
  `http://auth-service:3001`/`http://core-service:3002` (nombre del servicio en la red de compose).
- `src/app.module.ts` — `controllers: [HealthController]`, aplica `CorrelationIdMiddleware` a `'*'`.
- `src/health/health.controller.ts` — `GET /health` → `{ status: 'ok', timestamp }`.
- `src/middleware/correlation-id.middleware.ts` — genera/propaga `X-Request-Id` (uuid) en cada request.
- Verificado en vivo y en Docker real (3 contenedores separados, comunicándose por nombre de servicio):
  login, `/me/permissions`, catálogos (incluyendo `POST` con body) todo a través de `localhost:4000/api/...`.

### 1.2 `commons` (`apps/backend/commons/`) — ya NO incluye Prisma, y va perdiendo piezas conforme cada servicio se vuelve autocontenido
Desde `feat/catalogos-base` (mergeada) + la separación de bases del 2026-07-23, cada servicio duplica
localmente lo que necesita en vez de importarlo de aquí (para ser desplegable solo) — `commons/` queda
como lo que TODAVÍA no se ha duplicado en ningún lado:
- ~~`prisma/`~~ — **eliminado 2026-07-23** (schema único + client.ts + migrations). Cada servicio tiene
  ahora el suyo, ver §1.3/§1.4.
- ~~`guards/brand-access.guard.ts`~~ — **eliminado 2026-07-23**, reescrito en `core-service/src/guards/`
  (ya no depende de `brandIds[]` del JWT, ver §1.4).
- `guards/jwt-auth.guard.ts`, `decorators/current-user.decorator.ts` — siguen aquí, pero **tanto
  `auth-service` como `core-service` ya tienen su propia copia local** (`src/guards/jwt-auth.guard.ts`,
  `src/decorators/current-user.decorator.ts` en auth-service; solo el guard en core-service) — nadie
  importa ya la de `commons/` por path relativo.
- `guards/permission.guard.ts` — lee metadata `@RequirePermission(module, action)`, valida
  `user.permissions[module].includes(action)`, si no `ForbiddenException`. Sin duplicar todavía, sin uso.
- `decorators/require-permission.decorator.ts` — `@RequirePermission(module, action)` (SetMetadata). Sin uso.
- `interceptors/audit.interceptor.ts` — detecta POST/PUT/PATCH/DELETE, **TODO sin implementar** (no escribe en `audit_log` aún).
- `interceptors/logging.interceptor.ts` — loguea `METHOD url — Nms` con `Logger('HTTP')`.
- `filters/http-exception.filter.ts` — formatea `HttpException` a `{statusCode, timestamp, path, message}`.
- `circuit-breaker/opossum.factory.ts` — `createCircuitBreaker(fn, options)` con defaults `timeout:5000, errorThresholdPercentage:50, resetTimeout:30000`. Sin caller todavía (ADR-0003).
- `types/jwt-payload.type.ts` — `JwtPayload { sub, email, role, brandIds: string[], permissions: Record<string,string[]> }` — `brandIds` siempre `[]` en la práctica, ver §1.3/§1.4.
- `types/roles.enum.ts`, `types/modules.enum.ts`, `types/actions.enum.ts` — slugs en español (distinto del frontend, que usa inglés — ver §2.1).
- `types/post-status.enum.ts` — **ya no se usa** para el enum real; `core-service` tiene su propia copia local en `src/types/post-status.enum.ts` con los 10 valores nuevos (ver §1.4/§1.6).

### 1.3 `auth-service` (puerto 3001, paquete `@repo/auth-service`) — wireado y verificado en vivo 2026-07-23
- **`app.module.ts` importa `AuthModule` + `PermissionsModule`** — ya no está vacío.
- `POST auth/login` — `LoginDto { email (IsEmail), password (IsString, MinLength(6)) }` →
  `{accessToken, refreshToken}` (`refreshToken` es el registro completo de `refresh_tokens`, no un
  string — el campo real a mandar a `/auth/refresh` es `refreshToken.token`). Valida contra `prisma.user`
  (bcrypt) — el `User` de este servicio **ya no tiene `firstName`/`lastName`** (ver §1.6), ni `brandUsers`
  (`BrandUser` ya no existe). `permissions` se arma desde `role_permissions`; `brandIds` siempre `[]`
  (Brand vive en la BD de `core-service` — ver `CLAUDE.md` para el detalle de por qué y cómo se resolvió
  vía `BrandAccessGuard` en core-service en vez de esto).
- `POST auth/refresh` — `RefreshDto { refreshToken: string }` → **bug corregido 2026-07-23** (antes
  re-llamaba `login()` con `password: ''`, siempre fallaba). Ahora `AuthService.issueTokens(user)` es un
  método privado compartido por `login()` y `refresh()` que arma el JWT directo, sin volver a checar contraseña.
- `POST auth/logout` — requiere `JwtAuthGuard`, revoca todos los refresh tokens del usuario.
- `GET auth/me` — requiere `JwtAuthGuard`, devuelve el payload del JWT tal cual.
- `GET me/permissions` (`PermissionsController`) — requiere `JwtAuthGuard`, devuelve `{ permissions, brandIds }` del JWT. **Esta es la ruta que el frontend consulta como fuente de verdad del menú.**
- `PermissionsService.updateRolePermission(...)` — lógica de upsert lista, sin controller/endpoint que la exponga todavía.
- Refresh tokens: 7 días, single-use, `usedAt` marca consumo.
- `JwtStrategy`/`JwtAuthGuard`/`CurrentUser` — copias **locales** en `src/strategies/`, `src/guards/`, `src/decorators/` (ya no se importan de `commons/`).
- **BD propia**: `apps/backend/services/auth-service/prisma/schema.prisma`, base `gestor_redes_auth`. Prisma Client con `output` personalizado en `node_modules/.prisma-client` (ver comentario en el schema — necesario para no chocar con el de `core-service`).

### 1.4 `core-service` (puerto 3002, paquete `@repo/core-service`) — fusiona brands+content+analytics-service; único módulo de dominio wireado hoy: catálogos
- **`catalogs/`** (`CategoriesController`, `SpecialtiesController`, `SocialNetworksController`, todos bajo
  `catalogs/*`) — CRUD completo de `Category`/`Specialty`/`SocialNetwork`, **wireado en `AppModule`**,
  **protegido con `JwtAuthGuard`** (2026-07-23 — antes no tenía ningún guard) y **DTOs con
  `class-validator`** (`@IsString`/`@IsNotEmpty`/`@IsNumber`/`@Min(0)`, antes eran clases vacías con
  validación a mano). `core-service` no tenía ninguna infraestructura JWT propia — se creó
  `src/guards/jwt-auth.guard.ts`, `src/strategies/jwt.strategy.ts`, `src/auth/jwt-auth.module.ts` (valida
  el mismo `JWT_SECRET` que emite `auth-service`, no hace login propio).
- **`campaigns/`, `reports/`, `ideas/`** — controller/service/module/DTOs **totalmente vacíos**, sin tocar.
- **`posts/state-machine/`** — sin controller. `transitions.map.ts` cubre ahora 10 estados (antes 6, ver
  §1.6): `borrador→en_revision→{aprobado|rechazado}`, `rechazado→borrador`, `aprobado→programado`,
  `programado→{publicando|cancelado}`, `publicando→{publicado|parcial|error|cancelado}` (el tramo nuevo es
  traducción directa del comentario ya escrito en `docs/base/modelo2.txt`, no lógica de negocio nueva).
  `post-state-machine.ts` (`validateTransition`) sin cambios estructurales.
- `char-limits/char-limits.map.ts` — sin cambios.
- `scheduler/post-scheduler.service.ts` — sin cambios (no tocaba campos removidos del schema).
- `score/score.service.ts` — `ScoreService.calculate(brandId)`: real, calcula y persiste en
  `brand_scores`. **Reescrito 2026-07-23** para el nuevo shape: antes leía `Post.metrics`/`BrandProfile`
  directo; ahora un `Post` puede fan-out a varias redes (`PostSocialAccount`), así que agrega
  `post.socialAccounts.flatMap(sa => sa.metrics)` para engagement, y cuenta `SocialAccount` (no
  `BrandProfile`) para cobertura. Misma fórmula: `score = consistency×0.30 + engagement×0.40 +
  coverage×0.20 + frequency×0.10` — sigue difiriendo del texto de `CLAUDE.md` (3 factores).
- `cron/metrics-cron.service.ts` — **reescrito 2026-07-23**: antes generaba `PostMetric` sobre
  `Post`+`BrandProfile` directo; ahora consulta `PostSocialAccount` (`status: 'publicado'`) y crea
  `PostMetric` con `postSocialAccountId` (antes `postId`+`brandProfileId`).
- `metrics/decay-simulator.ts` — `simulateMetrics(...)` ahora también devuelve `views` (campo nuevo del
  schema) y renombró `engagementRate`→`engagement` (mismo nombre que el campo real de `PostMetric`).
- **Guards nuevos en `src/guards/`**: `jwt-auth.guard.ts` (ver arriba) y `brand-access.guard.ts`
  (**reescrito** desde la versión vieja de `commons/` — ya no depende de `user.brandIds[]`, valida con una
  consulta LOCAL a su propia BD: `Brand.ownerId` o `Campaign.cmId`/`CampaignDesigner.userId` para el
  `brandId` del request, usando `user.sub`. Existe y compila, **sin aplicar a ningún endpoint todavía**).
- **BD propia**: `apps/backend/services/core-service/prisma/schema.prisma`, base `gestor_redes_core`. Mismo mecanismo de `output` personalizado que auth-service.

### 1.5 `alexa-service` (puerto 3004, paquete `@repo/alexa-service`) — nuevo, BFF de la Alexa Skill. Sin cambios en esta ronda.
- **Sin base de datos propia** — no tiene Prisma. Su única razón de ser es traducir los intents del Lambda
  de la skill en llamadas HTTP a `core-service` (campañas, métricas, ideas) y `auth-service`
  (account-linking/identidad).
- `campaigns/` e `ideas/` — controller/service/module **totalmente vacíos**. `AppModule` sigue con
  `imports: []` — no se tocó en la sesión del 2026-07-23 (alcance era solo auth-service/core-service).
- Ver `docs/skill/AlexaSkill-Diseno-Final.md` y `docs/skill/lambda-codigo-por-pasos.md` para el contrato completo.

### 1.6 Modelo de datos — 2 schemas separados desde 2026-07-23 (antes 1 solo, `commons/prisma/schema.prisma`, ya eliminado)
`docs/base/modelo2.txt` es la fuente de verdad; copiado tal cual a
`apps/backend/services/{auth,core}-service/prisma/schema.prisma`.

**auth-service** (`gestor_redes_auth`): `Role`, `Module`, `Action`, `RolePermission` (RBAC dinámico),
`User` (ya **sin** `firstName`/`lastName`), `RefreshToken`, `PasswordResetToken` (nuevo), `Notification`,
`AuditLog` (BIGINT, inmutable). `UserStatus` enum nuevo (`pending`/`active`/`suspended`, todos nacen `active`).

**core-service** (`gestor_redes_core`): `Category`/`Specialty`/`SocialNetwork` (catálogos, dueño
core-service, ya no auth-service), `UserProfile` (nuevo — `name`/`avatarUrl`, vinculado a `User` por
`userId` **sin `@relation` real** porque son bases distintas) + `UserProfileCategory`/
`UserProfileSpecialty` (reemplazan a `UserCategory`/`UserSpecialty`, que desaparecieron), `Brand`
(**ya sin `type: brand|profile`**, campo `profileType` en su lugar; **`BrandUser` desapareció** —
ownership singular vía `Brand.ownerId`), `SocialAccount` (reemplaza a `BrandProfile`), `Campaign`
(**`CampaignTeam` desapareció** — CM vía `Campaign.cmId` directo, Diseñadores vía `CampaignDesigner`),
`CampaignCategory`, `Post` (ya no 1:1 con una red — fan-out vía `PostSocialAccount`), `PostStatusHistory`
(BIGINT, inmutable), `PostSocialAccount` (nuevo, capa 2: publicación física por red), `Media`/`PostMedia`
(nuevo, biblioteca de medios), `ContentIdea`, `PostMetric` (ahora cuelga de `PostSocialAccount`, no de
`Post` directo; campos `likes/comments/shares/views/reach` todos opcionales, campo `engagement` en vez de
`engagementRate`), `BrandScore`, `Report`, `AuditLog` (BIGINT, inmutable, copia local igual que auth-service).

`PostStatus` pasó de 6 a 10 valores: `borrador`, `en_revision`, `aprobado`, `rechazado`, `programado`,
**`publicando`** (nuevo), `publicado`, **`parcial`**, **`error`**, **`cancelado`** (los últimos 3 nuevos,
cubren el resultado del fan-out multi-red). `PostSocialAccountStatus` es un enum nuevo y separado
(`pendiente`/`publicando`/`publicado`/`error`/`cancelado`) para el estado de cada red individual.

Todas las tablas de negocio: `deletedAt` (soft delete), `createdAt`/`updatedAt`, UUID PK excepto
`AuditLog`/`PostStatusHistory` (BIGINT autoincrement).

### 1.7 Seed / credenciales demo (`packages/seed/src/index.js`)
Corre con `pnpm seed`. **Reescrito 2026-07-23** para escribir en las 2 bases (antes una sola): usa 2
Prisma Clients (`authPrisma`/`corePrisma`), importados directo desde
`apps/backend/services/{auth,core}-service/node_modules/.prisma-client` (no hay paquete `@repo/prisma`
compartido — se eliminó junto con `commons/prisma/`). Crea (idempotente, `upsert`):
- 9 módulos / 9 acciones (mismos slugs que `commons/types/modules.enum.ts` / `actions.enum.ts`), en `authPrisma`.
- 4 roles con matriz de permisos, en `authPrisma` — sin cambios en la matriz.
- **5 usuarios demo**, en `authPrisma` (ya sin `firstName`/`lastName` — el nombre se compone y se guarda
  aparte en `UserProfile.name`, en `corePrisma`, vinculado por `userId`):
  | Email | Password | Rol |
  |---|---|---|
  | 20233tn102@utez.edu.mx | admin123 | administrador |
  | cm@bananagram.mx | cm123456 | community_manager |
  | disenador@bananagram.mx | diseno123 | disenador |
  | cliente@bananagram.mx | cliente123 | cliente |
  | alex@bananagram.mx | alex12345 | cliente |
  (el admin ya no es `admin@bananagram.mx` — se cambió al correo real del usuario a pedido suyo; esto
  desincroniza ese usuario específico de `apps/frontend/commons/src/mocks/mock-users.ts`, que sigue
  usando el email viejo — nadie lo actualizó ahí, el frontend sigue en modo mock sin conectar al backend real).
- **`seedCatalogs()` se eliminó del seed** (2026-07-23, a pedido del usuario, para poder probar el CRUD de
  catálogos desde cero vía Postman/API en vez de datos precargados) — el seed **ya no crea**
  categorías/especialidades/redes sociales. Si hace falta data de catálogos para probar algo, hay que
  crearla a mano vía `POST /api/catalogs/*` (ahora protegido con `JwtAuthGuard`, ver §1.4) o volver a
  agregar esa función si se decide revertir esto.

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
| `forgotPassword` | POST | `auth/forgot-password` | `{email}` | `void` |
| `resetPassword` | POST | `auth/reset-password` | `{token,password}` | `void` |

(Los últimos dos se agregaron el 2026-07-19, respaldados por `PasswordResetToken` en `modelo.txt` — ver
`docs/frontend-db-alignment-implementation.md`.) Sin `tagTypes`. Exporta `useLoginMutation`,
`useRegisterMutation`, `useForgotPasswordMutation`, `useResetPasswordMutation`. **Nada en el frontend los
usa realmente hoy** (login/registro/reset siguen en modo mock, ver §0) salvo que un componente los importe
puntualmente sin llamarlos de verdad.

**`hooks/`**
- `usePermissions()` → `{ can(module,action), canAny(module,actions[]), permissions }` — lee `selectPermissions` de Redux.
- `useSessionBootstrap()` — al montar, lee cookie `bananagram_token` (`getCookieToken`); si existe `dispatch(setCredentials(...))`, si no `dispatch(logout())`. **El único inicializador de sesión**, usado en `providers.tsx` de las 6 apps.
- `useSession()` — wrapper de `useSelector(selectUser)`.
- `useNotifications()` — **stub**, siempre devuelve `[]` tipado como `Notification[]` (comentario: reemplazar por `useGetNotificationsQuery` cuando exista backend).

**`session/cookieSession.ts`** — `getCookieToken()`/`setCookieToken(token)`/`deleteCookieToken()`. Cookie
`bananagram_token`, no HttpOnly, `path=/; SameSite=Lax` — deliberado para compartir sesión entre puertos
distintos de `localhost` (cookies son per-host, no per-origin como `localStorage`). Comentario documenta
migrar a cookie HttpOnly real cuando exista backend.

**`state/auth.slice.ts`** (slice `'auth'`) — `AuthState { user, accessToken, permissions, ownedBrandIds, isAuthenticated }`
(**`brandIds` fue renombrado a `ownedBrandIds` el 2026-07-19** — ya no aplica a todos los roles, solo a
Cliente; para CM/Diseñador la marca se deriva de sus campañas asignadas, no vive en la sesión — ver
`docs/frontend-db-alignment.md` §1.2). Actions: `setCredentials({accessToken})` (decodifica JWT vía
`decodeJwt`, popula todo el estado incluyendo `name`/`status`/`avatarUrl`), `logout()` (reset a
`initialState`). Selectors: `selectUser`, `selectPermissions`, `selectOwnedBrandIds` (antes
`selectBrandIds` — el rename es breaking, ver abajo), `selectIsAuthenticated`. `state/index.ts` re-exporta
esto + `authApi` + `cookieSession` juntos.

**`ui/atoms/`** (7): `CharCounter` (contador de caracteres por red), `LabeledField`/`LabeledSelect`
(inputs con label fijo 44px), `PrimaryButton` (botón dorado `#E0A800`), `ScoreGauge` (gauge circular
Recharts `RadialBarChart`, colorea por `classification: string` — **ya no es unión cerrada
`'bajo'|'medio'|'alto'`, es `string` abierto con color de fallback gris para valores desconocidos**),
`SkeletonLoader` (rows/card), `StatusChip` (chip coloreado por `PostStatus`, exporta
`STATUS_COLORS`/`STATUS_LABELS` — **ahora cubre los 10 valores del enum**, incluidos `publicando`,
`parcial`, `error`, `cancelado`).

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

**`mocks/`** (motor de todo el login actual, ver §0): `mock-users.ts` (`MOCK_USERS`, 5 usuarios con `id`
explícito ahora — mismos emails/passwords que el seed backend, ver §1.8 — +
`findUserByEmail`/`findUserByCredentials`), `mock-tokens.ts` (`MOCK_TOKENS` por rol, para `RoleSwitcher`),
`build-user-token.ts` (`buildTokenFromUser(user)` → JWT sin firmar, ahora usa `user.id` como `sub` en vez
de `user.email`).

**`types/`** (reescrito el 2026-07-19 para seguir `modelo.txt` — ver `docs/frontend-db-alignment.md` y
`docs/frontend-db-alignment-implementation.md` para el detalle campo por campo):
- `roles.enum.ts` — `AppRole`: ADMINISTRADOR/COMMUNITY_MANAGER/DISENADOR/CLIENTE (sin cambios, ya
  coincidía con la convención elegida para `Role.name`).
- `modules.enum.ts`/`actions.enum.ts` — sin cambios en esta pasada (siguen en inglés, distintos de los
  slugs en español que usa el backend viejo — ver §1.2/§3).
- `auth.types.ts` — `UserStatus = 'pending'|'active'|'suspended'` (nuevo). `AuthUser {id, email, name,
  role, status, avatarUrl?}`. `AuthState {user, accessToken, permissions, ownedBrandIds, isAuthenticated}`.
  `JwtPayload {sub, email, name, role, status, avatarUrl?, ownedBrandIds?, permissions?}`. `MockUser {id,
  email, password, role: AppRole, name, status, avatarUrl?, ownedBrandIds?, permissions}`. `brandIds`
  eliminado de todos estos tipos.
- `post.types.ts` — `PostStatus` ahora 10 valores (`borrador|en_revision|aprobado|rechazado|programado|
  publicando|publicado|parcial|error|cancelado`). `PostSocialAccountStatus =
  'pendiente'|'publicando'|'publicado'|'error'|'cancelado'` (nuevo). `PostMetric {id,
  postSocialAccountId, likes?, comments?, shares?, views?, reach?, engagement?, capturedAt}` (nuevo —
  antes las métricas no tenían tipo propio). `PostSocialAccount {id, postId, socialAccountId, status,
  socialPostId?, postUrl?, publishedAt?, errorMessage?, metrics?}` (nuevo — capa de fan-out multi-red).
  `Post {id, brandId (antes brandProfileId), campaignId?, content, status, scheduledAt?, publishedAt?,
  createdBy, ayrsharePostId?, socialAccounts: PostSocialAccount[]}` — **ya no es 1:1 con una sola red**.
  `PostStatusHistory.id` ahora `string` (antes `number`).
- `score.types.ts` — `BrandScore {id, brandId, score, consistency, engagement, frequency, coverage
  (informativa, no pondera), classification: string (antes unión cerrada), snapshotDate}`.
- `social-network.types.ts` (**nuevo**) — `SocialNetworkCode = 'instagram'|'tiktok'|'facebook'|'x'|
  'linkedin'|'youtube'` (nombres completos minúsculas, antes códigos cortos `'IG'|'TK'|...` en cada app).
  `SocialNetwork extends CatalogItem {code, baseEngagementRate}`. `SocialAccount {id, brandId,
  socialNetworkId, handle?, followers, active}` (antes `BrandProfile`/formas ad-hoc por app).
- `catalog.types.ts` (**nuevo**) — `CatalogItem {id, name, deletedAt?}`, base para catálogos con soft delete.
- `brand.types.ts` (**nuevo**) — `PROFILE_TYPES = ['brand','company','organization','creator','personal'] as const`,
  `Brand {id, name, slug, profileType, logoUrl?, primaryColor?, ownerId, categoryId?, ayrshareProfileKey?}`.
- `campaign.types.ts` (**nuevo**) — `CampaignStatus = 'active'|'paused'|'finished'`. `Campaign {id, brandId,
  name, description?, objective?, status, startDate?, endDate?, cmId (FK única, 1 CM por campaña),
  createdBy}`. `CampaignDesigner {campaignId, userId}` (join sin campo de rol — reemplaza el viejo patrón
  de "team member con role string" que mezclaba CM+Diseñadores+Cliente en un solo arreglo).
- `notification.types.ts` (**nuevo**) — `Notification {id, userId, type, payload, readAt?, createdAt}`.
- `password-reset.types.ts` (**nuevo**) — `PasswordResetToken`, `ForgotPasswordRequest`, `ResetPasswordRequest`.
- `media.types.ts` (**nuevo**, 2026-07-19 segunda pasada) — `Media {id, brandId, uploadedBy, fileName,
  originalName, mimeType, url, size, width?, height?, duration?}`, `PostMedia {postId, mediaId, order}`.
  `Post` (`post.types.ts`) ganó `media?: PostMedia[]`. Implementado en la UI solo en `posts-front` (ver §2.6).

**`mocks/mock-world.ts`** (**nuevo**, 2026-07-19 segunda pasada) — fuente única compartida de Marca/Cuenta
social/Campaña, consumida por `brands-front` y `posts-front` (ver §3 "Mock data..."): `AVAILABLE_SOCIAL_NETWORKS`/
`getSocialNetwork`, `MOCK_BRANDS`/`getBrand`, `MOCK_SOCIAL_ACCOUNTS`/`getSocialAccount`/
`getSocialAccountsByBrand`, `MOCK_CAMPAIGNS` (tipado `MockCampaignRecord extends Campaign` +
`socialAccountIds: string[]`, un atajo de mock ya que modelo.txt no tiene ese join explícito)/`getCampaign`/
`getSocialAccountsForCampaign`/`campaignUsesSocialAccount`.

### 2.2 `web-shell` (puerto 3000, host MFE, paquete `@repo/web-shell`)
- `next.config.ts` — define todos los `rewrites()` que hacen de web-shell el "gateway" de rutas para las
  5 zonas (ver `.claude/CLAUDE.md` para la tabla completa). `middleware.ts` es passthrough total hoy.
- `/` (`app/page.tsx`, server component) — lee cookie `bananagram_token`, si hay sesión redirige server-side
  a `getPostAuthDestination(role)`; si no, renderiza `LandingTemplate` (landing pública completa: Header,
  Hero, Campaigns, Publications timeline, Calendar mini, Metrics + Score explicativo, Collaboration flow,
  Contact, Footer — todo en `components/landing/{atoms,molecules,organisms,templates}/`, atomic design).
  `MetricsSection.tsx` usa códigos de red completos en minúsculas (`'instagram'`, no `'IG'`) desde el
  2026-07-19.
- `/dashboard` (`app/(app)/dashboard/page.tsx`) — **exclusivo de `AppRole.ADMINISTRADOR`**; no-admins son
  redirigidos client-side. Renderiza `DashboardAdmin` únicamente.
- `components/dashboard/`: `DashboardAdmin` (el único wireado a una ruta), `DashboardCliente`,
  `DashboardCM`, `DashboardDisenador` — estos 3 últimos **existen pero no están referenciados por ninguna
  página de este slice del repo** (probablemente pensados para otras zonas o para conectar después). Los
  3 usan `getSocialAccount(post.brandId)` (antes `post.brandProfileId`, renombrado el 2026-07-19).
- `store/api/*.ts` — 7 slices vacíos sin registrar (`ai`, `brands`, `campaigns`, `metrics`,
  `notifications`, `posts`, `reports` — ver §0). `store/index.ts` solo registra `authReducer`/`authApi`.
- `lib/mock-data.ts` — datos para los 4 dashboards (`MOCK_DASHBOARD`, `MOCK_ADMIN_DASHBOARD`,
  `MOCK_CLIENTE_DASHBOARD`, `MOCK_DISENADOR_DASHBOARD`, `MOCK_POSTS_BY_STATUS`, `getMockPostsByNetwork`) —
  posts usan `brandId`, no `brandProfileId`.
- `src/interfaces/interface.ts` — `MockRecentPost.brandId` (rename). El viejo `SocialAccount {id,
  socialNetwork}` (en realidad una lista de redes, no de cuentas) se renombró a `SocialNetworkOption` para
  no chocar de nombre con el `SocialAccount` real de `@repo/ui/types`.
- `components/layout/Sidebar.tsx` — nav con items gateados por `usePermissions().can()`, admin ve solo
  Dashboard+Admin, resto de roles ve todo excepto Dashboard.

### 2.3 `admin-front` (puerto 3010, sirve `/users`, `/roles`, `/audit-log`, `/catalogs/*`)
- `/` → redirect a `/users`.
- `/users` — `DataTable` de `MOCK_USERS`, botón "+ Nuevo usuario" (gate `users:manage`) abre
  `CreateUserDialog` (crea usuario mock con **`status: 'pending'`** — antes creaba con `'activo'`, bug
  corregido el 2026-07-19 ya que el propio flujo de activación por link implica que el usuario nace sin
  password — genera URL de activación `${authFront}/activate?email=...`, comentario: en producción esto se
  envía por email). Columna "Perfil" (marca asignada) **fue eliminada** — ya no hay FK usuario↔marca para
  CM/Diseñador (la asignación real es a nivel `Campaign`, que este app no modela — ver
  `docs/frontend-db-alignment.md` §1.2). El rol se muestra vía `ROLE_LABELS[u.role]` sobre los slugs reales
  de `AppRole` (`community_manager`, `disenador`, etc.), ya no labels sueltos tipo `'CM'`.
- `/roles` — editor de matriz de privilegios (gate `users:manage`): tabs por rol, `Accordion` por módulo con
  `Switch` por acción, "Restaurar rol" (`ConfirmDialog`), "Guardar cambios" es mock (comentario: futuro
  `PATCH /roles/privileges {roleKey, module, actions[]}` — nota: `PermissionsService.updateRolePermission`
  en el backend ya tiene la lógica lista para esto, solo falta el controller, ver §1.3).
- `/audit-log` — `DataTable` read-only de `MOCK_AUDIT_LOG`, ahora con `createdAt` (ISO, formateado con
  `formatDate` de `@repo/ui/utils`) en vez de un string pre-formateado (`date`).
- `/catalogs/categories`, `/catalogs/specialties` — siguen usando el componente genérico `CatalogList`
  (nombre + `Switch` activo + "+ Agregar" con `FormDialog`).
- `/catalogs/social-networks` — **ya NO usa `CatalogList`**. Desde el 2026-07-19 renderiza
  `SocialNetworkForm.tsx` (componente nuevo), construido sobre `SocialNetwork extends CatalogItem` (de
  `@repo/ui/types`) para poder capturar `code` (select de los 6 `SocialNetworkCode`) y
  `baseEngagementRate` (%), campos que el formulario genérico no soporta. Semilla usa los valores reales
  del backend (instagram 0.045, tiktok 0.09, facebook 0.02, x 0.015, linkedin 0.025, youtube 0.03).
- Componentes propios: `AdminTabs` (nav horizontal de las 6 sub-secciones), `AppShell`, `CatalogList`,
  `SocialNetworkForm` (nuevo), `CreateUserDialog`, `layout/Sidebar`.
- Sin RTK Query local, sin `middleware.ts`, sin slice Redux local — solo `authApi`/`authReducer` de `@repo/ui`.
- `interfaces/interface.ts` local: `MODULES`/`ACTIONS` (mirror de los enums de `@repo/ui/types`, usados aquí
  solo como datos mock de UI) + `MockUser` (ahora `role: AppRole`, `status: UserStatus`, sin campo `brand`)
  / `MockAuditEntry` (ahora `createdAt`) / `MockCatalogItem`/etc. `MockRole` (código muerto, no usado por
  ninguna página) **fue eliminado** el 2026-07-19.

### 2.4 `auth-front` (puerto 3012, sirve `/login`, `/register`, `/forgot-password`, `/reset-password`, `/activate`)
- Todas las páginas comparten `AuthLayout` (panel izquierdo decorativo `BrandPanel` + panel derecho con el form).
- `LoginForm` — usa `findUserByCredentials`/`buildTokenFromUser`/`setCookieToken` de `@repo/ui` (mock real,
  no llama backend), redirige vía `getPostAuthDestination(role)`.
- `RegisterForm` — wizard 2 pasos (cuenta → perfil); al final usa el usuario demo fijo `cliente@bananagram.mx`
  (comentario: futuro `POST /auth/register {name,email,password,type,profileName,category}`). El campo de
  categoría ahora guarda `categoryId` (contra `MOCK_CATEGORIES: {id,name}[]`, antes `string[]`), y
  `ProfileType` se importa de `@repo/ui/types` en vez de una unión local duplicada.
- `ForgotPasswordForm` — sigue siendo mock (solo cambia estado local), pero `useForgotPasswordMutation`/
  `useResetPasswordMutation` **ya existen** en `@repo/ui`'s `auth.api.ts` desde el 2026-07-19 (respaldados
  por `PasswordResetToken` de `modelo.txt`), sin cablear obligatoriamente.
- `ResetPasswordForm` — **antes no leía el `token` de la URL en absoluto** (bug corregido el 2026-07-19):
  ahora usa `useSearchParams()` (mismo patrón que `ActivateForm.tsx` con `?email=`), envuelto en
  `<Suspense>` en `app/reset-password/page.tsx`; muestra "Enlace inválido" si no hay `token`.
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
  equivalentes sin `BrandTabs`, usados desde `/profile` y `/my-campaigns`. ~~Bug: `POSTS_FRONT_URL` no
  importada en `/profile/campaigns/[campaignId]/page.tsx`~~ — **corregido** el 2026-07-19
  (`ZONE_URLS.postsFront`).
- `/profile/calendar` — calendario rico (`react-big-calendar`) con KPIs, filtros, `PostPreviewDialog` con
  Aprobar/Rechazar (gate `post:approve`/`post:reject`). Resuelve red vía `socialAccountId` (antes
  `brandProfileId`) + `getSocialNetwork()`.
- `/team` — lista plana de todo el equipo across campañas activas (`getTeamAggregate()`), ahora combina CM
  (resuelto vía `getCampaignCM()`, 1:1 desde `MockCampaign.cmId`) + Diseñadores (`MOCK_CAMPAIGN_DESIGNERS`,
  N por campaña) — ya no un solo array mixto con un campo `role` libre.
- `/my-brand`, `/onboarding` — **deprecados**, solo `redirect('/profile')`.
- `lib/mock-data.ts` (reescrito el 2026-07-19 para seguir `modelo.txt` — ver
  `docs/frontend-db-alignment-implementation.md`): `MOCK_PROFILES` (4 marcas: Zara MX, Nike MX, Spotify MX,
  Alex Rivera-personal — ahora con `profileType`/`socialAccounts`/`categoryId`/`ownerId`/`slug`/`logoUrl`/
  `primaryColor`, antes `type`/`profiles`/`category`), `MOCK_SOCIAL_ACCOUNTS` (`socialNetworkId` en vez de
  `socialNetwork` crudo, códigos completos en minúsculas), `MOCK_CAMPAIGNS` (c1-c5, ahora con `cmId`,
  `createdBy`, `objective`, `description`), `getCurrentClientProfile(email)` (mapea
  `alex@bananagram.mx`→perfil personal, default Zara; ahora resuelve `MockProfile.ownerId` consistente con
  los ids de `@repo/ui/mocks/mock-users.ts`), `getCampaignCM()` + `MOCK_CAMPAIGN_DESIGNERS` (**reemplazan**
  el viejo `MOCK_TEAM_BY_CAMPAIGN` mixto — el Cliente ya NO se sintetiza como team member, es
  `Campaign.createdBy`), `MOCK_AVAILABLE_CMS`/`MOCK_AVAILABLE_DESIGNERS`, `MOCK_CALENDAR_EVENTS`
  (`socialAccountId` en vez de `brandProfileId`).
- `CreateCampaignDialog.tsx` — setea `cmId`/`createdBy` directo en la campaña (ya no sintetiza team
  members); campos opcionales de `objective`/`description` agregados al form.
- Sin RTK Query local, sin `middleware.ts`, sin slice Redux local.

### 2.6 `posts-front` (puerto 3014, sirve `/posts/*`, `/approvals`)
**Rediseño estructural el 2026-07-19**: un `Post` ya no es 1:1 con una sola red social — ahora puede
publicarse en varias redes a la vez (fan-out), cada una con su propio estado independiente
(`PostSocialAccount`/`PostSocialAccountStatus`, ver `docs/frontend-db-alignment.md` §1.1).
- `/posts` — lista principal, filtros por status + campaña, `DataTable`, acción "Publicar" (gate
  `post:publish`, solo visible para `aprobado`/`programado`), "+ Nueva publicación" (gate `post:create`) →
  `/posts/new`. `FILTERS` ampliado a los 10 valores de `PostStatus`. Cada fila resuelve red/marca desde
  `post.socialAccounts[0]` (la cuenta "representativa") — **no muestra estado por red aquí**, eso vive solo
  en el detalle (decisión de producto explícita).
- `/posts/[id]` — detalle: metadata, contenido, acciones gateadas (`Editar`/`Enviar a revisión`→`post:create`,
  `Programar`→`post:schedule` **sin handler real todavía**, `Rechazar`→`post:reject` abre `RejectPostDialog`,
  `Aprobar`→`post:approve`, muta status local), timeline de `MOCK_STATUS_HISTORY`. **Nuevo**: sección
  "Estado por red" que itera `post.socialAccounts[]` — un chip de `PostSocialAccountStatus` por red (mapa
  de color local `PSA_STATUS_STYLES`, no reusa `StatusChip` que es solo para `PostStatus`), con
  `postUrl`/`errorMessage` cuando aplica. Es donde se ve el caso `parcial` (una red publicada, otra con error).
- `/posts/new` — **rediseñado a multi-select**: `socialAccountIds: string[]` (antes `brandProfileId: string`
  único) con chips toggle; una card de vista previa por cada red seleccionada; límite de caracteres único
  (`POST_CHAR_LIMIT = 2200`, ya no `CHAR_LIMITS` por red — decisión de producto: mismo límite para todas las
  redes). Panel "IA" sigue estático (`MOCK_AI_SUGGESTIONS`/`MOCK_TIME_SLOTS`, no hay IA real). **No persiste
  el post** — solo navega a `/posts` o `/posts/approvals`.
- `/posts/approvals` — tablero kanban de 3 columnas (Borradores por enviar / Esperando aprobación /
  Rechazados), cada una gateada por permiso distinto; mismo criterio que `/posts` para resolver red/marca
  (`socialAccounts[0]`, sin estado por red en las cards).
- `lib/mock-data.ts`: `MOCK_SOCIAL_ACCOUNTS` (5, shape distinto del de brands-front — no compartido, ahora
  con `brandId`/`followers`/`active`/`socialNetworkId`, conservando `networkBg`/`networkColor` como campos
  de UI), `getPostNetworkInfo(socialAccountId)` (antes recibía el post completo con un solo
  `brandProfileId` — ahora recibe el id de una cuenta social específica, ya que un post puede tener
  varias), `MOCK_CAMPAIGNS` (c1-c3, shape distinto del de brands-front), `MOCK_POSTS` (5 posts — `p5`
  demuestra el caso `parcial`: Instagram `publicado` + TikTok `error`), `MOCK_STATUS_HISTORY` +
  `addStatusHistoryEntry`, `POST_CHAR_LIMIT` (constante única, reemplaza `CHAR_LIMITS`).
- `interfaces/interface.ts` — `MockPost` ahora `{..., brandId, ayrsharePostId?, socialAccounts:
  MockPostSocialAccount[]}` (sin `brandProfileId` ni `metrics` planos — las métricas viven dentro de cada
  `socialAccounts[].metrics`, tipo `PostMetric` importado directo de `@repo/ui/types`).
- Sin RTK Query local, sin `middleware.ts`, sin slice Redux local.
- `Sidebar.tsx` propio (no en `components/layout/` como los demás) — enlaces cross-zone a `brandsFront`
  para `my-campaigns`/`my-brand`/`brands`/`calendar`/`team`/`profile`.

### 2.7 `analytics-front` (puerto 3011, sirve `/metrics`)
Dominio: score digital / analítica de redes. Única app con **Recharts** usado activamente en varios
componentes (`EngagementChart` LineChart, `CampaignBreakdown` BarChart, `NetworkComparison` BarChart);
el resto de widgets "visuales" son hand-rolled con MUI (heatmap, barras de audiencia) o primitivos
compartidos (`ScoreGauge`, `MetricCard`, `TrendCard`).
- `/metrics` — única página real (`/` solo redirige aquí). Gate `metrics:view`. Tabs por red (General +
  instagram/facebook/tiktok/linkedin/x/youtube — códigos completos en minúsculas desde el 2026-07-19,
  estado en Redux `selectedNetwork`). Botón "Exportar" **deshabilitado** (tooltip "Exportación pendiente").
  Composición según tab:
  - **General**: `NetworkOverview`, `EngagementChart`, `GeneralMetricCards`, `CampaignBreakdown`,
    `TopContent`, `InsightsPanel`, `ScoreExplanationPanel` (explica el `BrandScore` existente; **desde el
    2026-07-19 muestra Cobertura en su propia sección, separada de las 3 barras ponderadas
    Consistencia/Engagement/Frecuencia**, con el copy "informativa — no pondera en el score" — antes se
    mostraba como un 4º factor en pie de igualdad, hallazgo crítico ya corregido), `NetworkComparison`,
    `CampaignComparison`, `TrendAnalysis` (ventanas 7/30/90 días), `PostingHeatMap` (día×hora, CSS grid
    custom), `AudienceOverview`.
  - **Por red**: mismo set base con `NetworkMetricCards` (config-driven por `NETWORK_METRIC_FIELDS`) en
    vez de `GeneralMetricCards`.
  - `SelectedPostDetail` reemplaza todo lo anterior cuando hay un `postId` seleccionado (drill-down nivel 4).
- **Toda la data es mock + derivación pura** (`lib/analytics/engine.ts`, funciones puras sobre
  `SocialMetricFact[]` desde `lib/mock-data.ts`) — cero llamadas HTTP para métricas. `SocialMetricFact`
  reescrito el 2026-07-19: `engagementRate`→`engagement`, `impressions` eliminado (colapsado a `views`, el
  campo real de `PostMetric` en `modelo.txt` — se consideró redundante mantener ambos), `brandProfileId`→
  `socialAccountId`, `networkCode: SocialNetworkCode` (re-exportado de `@repo/ui/types`, códigos completos
  en minúsculas), `PostStatus` también re-exportado de `@repo/ui/types` (10 valores) en vez de copia local.
  Si se conecta un backend real, el reemplazo natural es sustituir `mock-data.ts`/agregar un slice RTK
  Query real, `engine.ts`/`analytics.selectors.ts` quedan casi igual (son puros).
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
  en español) — cualquier integración real de permisos necesita mapear entre ambos o unificarlos. (Esto NO
  se tocó en la alineación del 2026-07-19 — sigue pendiente.)
- **Navegación cross-zone**: siempre vía `ZONE_URLS` (`@repo/ui/config`) + `window.location.href` (full
  page nav, porque son apps Next.js independientes) — nunca `router.push` para cruzar de zona.
  Navegación dentro de la misma zona sí usa `router.push`.
- **Sesión compartida**: cookie `bananagram_token` (no `localStorage`, por ser per-origin/puerto) +
  `useSessionBootstrap()` en cada `providers.tsx`. Un solo punto de verdad: `@repo/ui/state`. Desde el
  2026-07-19, `AuthState.ownedBrandIds` (antes `brandIds`) **solo tiene datos reales para rol Cliente** —
  para CM/Diseñador siempre viene vacío, la marca se deriva de sus campañas asignadas en el mock del app
  correspondiente (p. ej. `getCampaignCM()`/`MOCK_CAMPAIGN_DESIGNERS` en brands-front), no de la sesión.
- **`SocialNetworkCode`** (desde el 2026-07-19): nombres completos en minúsculas
  (`'instagram'|'tiktok'|'facebook'|'x'|'linkedin'|'youtube'`), definidos una sola vez en
  `@repo/ui/types/social-network.types.ts` y re-exportados/consumidos por las 4 apps que manejan redes
  sociales (web-shell, brands-front, posts-front, analytics-front) — antes cada app tenía su propia copia
  del union type con códigos cortos en mayúsculas (`'IG'|'TK'|...`), ahora desincronizadas si alguna copia
  local sobrevivió sin re-exportar del paquete compartido.
- **Mock data de Marca/Campaña/Cuenta social YA está unificada entre `brands-front` y `posts-front`**
  (desde el 2026-07-19, segunda pasada — ver `docs/frontend-db-alignment-implementation.md` §7.1):
  `apps/frontend/commons/src/mocks/mock-world.ts` (paquete `@repo/ui`, se importa `import {
  MOCK_BRANDS, MOCK_SOCIAL_ACCOUNTS, MOCK_CAMPAIGNS, AVAILABLE_SOCIAL_NETWORKS, getBrand,
  getSocialAccount, getCampaign, ... } from '@repo/ui'`) es ahora la única fuente de verdad para esas 3
  entidades — ambos apps consumen los mismos ids/valores (`b1..b4`, `bp1..bp8`, `c1..c5`). `analytics-front`
  y `web-shell` **no** consumen este mock-world (su propio dominio de datos — `SocialMetricFact`,
  dashboards — es distinto, no se forzó la unificación ahí). Los datos específicos de cada app (equipo de
  campaña en brands-front, `MockPost`/`Media` en posts-front) siguen siendo locales, como corresponde.
- **Todas las 6 apps siguen el mismo esqueleto**: `app/layout.tsx` (fuente Poppins, metadata, favicon
  `/LogoMonkey.png`) → `app/providers.tsx` (`EmotionCacheProvider` → `ReduxProvider` → MUI `ThemeProvider`
  + `CssBaseline` → `SessionBootstrap` → `AppShell`/children) → `components/AppShell.tsx`
  (`Sidebar` + `TopBar` + contenido) → `components/layout/Sidebar.tsx` (o `Sidebar.tsx` en posts-front).
