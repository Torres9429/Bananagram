# Estado del backend — bases separadas + catálogos protegidos (al día: 2026-07-27)

> Este documento arrancó como un análisis de la rama `feat/catalogos-base` antes de mergearla. Esa rama
> ya se mergeó, y desde entonces se hizo trabajo real de fondo (separación de bases de datos completa,
> catálogos protegidos con auth real). Este documento se reescribió para reflejar el estado **actual**,
> no el análisis original — sirve como punto de partida para quien siga con el resto de los módulos de
> `core-service` (`campaigns`, `posts`, `reports`, `ideas`).
>
> **2026-07-27**: la sección §2 de la versión anterior ("Qué falta") describía `campaigns`/`reports`/
> `ideas` como stubs vacíos, el gateway sin proxear nada, y `PermissionGuard`/`BrandAccessGuard` sin
> aplicar a ningún endpoint. Todo eso se construyó en esta ronda — ver §0 abajo. Se deja §1 intacta
> (sigue siendo verdad) y se reescribió §2/§4 para reflejar lo que sigue pendiente ahora.

## 0. Actualización 2026-07-27 — resto de `core-service` + admin de `auth-service`

Además de catálogos (§1, sin cambios), esta ronda construyó:

- **`brands/`** (nuevo, no estaba ni mencionado como pendiente porque nadie lo había notado hasta ahora):
  CRUD completo. `ownerId` sale del JWT, nunca del body — nadie puede crear una marca a nombre de otro
  usuario. `listBrands` filtra por rol: Administrador ve todas, el resto solo las suyas (dueño) o las de
  campañas donde participa (CM/Diseñador). Es prerrequisito real de `campaigns` (`Campaign.brandId` es
  obligatorio) — por eso se construyó aunque no estaba en el pendiente original.
- **`campaigns/`**: CRUD + `POST/DELETE /campaigns/:id/designers/:userId` (asignar/quitar Diseñadores,
  regla de negocio #3 — solo el CM asignado o un Administrador). Ojo con el patrón: `BrandAccessGuard`
  **no se pudo reusar aquí** — resuelve el `:id` de la ruta como si fuera un `brandId`, y en las rutas de
  campaign `:id` es un `campaignId`; reusarlo tal cual habría negado el acceso siempre. La pertenencia
  (dueño de la marca / CM asignado / Administrador) se resuelve con una consulta local dentro de
  `CampaignsService.assertCanManage`, no con un guard genérico.
- **`reports/`**: `Report` no tiene `deletedAt` ni campos editables en el schema — es un registro de
  solicitud, no una entidad mutable. Por eso el service solo expone `list`/`get`/`create` (gatillado por
  el permiso `reportes:exportar`, que es el que sí tiene el Cliente en el seed — no `reportes:crear`, que
  nadie tiene salvo Administrador). La generación real del archivo csv/pdf no está implementada: `fileUrl`
  queda `null`.
- **`ideas/`**: CRUD completo, pero con rutas planas (`/ideas?campaignId=`, no anidadas bajo
  `/campaigns/:campaignId/ideas` como prescribía el comentario viejo de `modelo2.txt` — ya corregido ahí).
  `ContentIdea` no tiene módulo de permiso propio en el seed; se autoriza con `campanas:ver`/`crear` +
  una verificación real de pertenencia a la campaña (mismo criterio que `assertCanManage` de campaigns).
- **`admin/` en `auth-service`** (nuevo): `admin/users` (CRUD de usuarios, respuestas sin `passwordHash`) y
  `admin/roles` (lista roles+permisos, `PATCH admin/roles/:id/permissions` para editar la matriz
  `role_permissions` por slug de módulo/acción vía HTTP — antes solo existía `PermissionsService` sin
  ningún controller que lo expusiera).
- **`POST auth/register`** y **`POST auth/password-reset/{request,confirm}`**: no existían. Register nace
  con rol `cliente` por defecto; intenta (best-effort, sin bloquear el registro si falla) crear el
  `UserProfile` en `core-service` vía un endpoint interno nuevo, `POST internal/user-profiles` — sin
  `JwtAuthGuard` a propósito, es tráfico servicio-a-servicio, no expuesto por el gateway.
- **`PermissionGuard`/`@RequirePermission`**: ya no es "decisión abierta" (§7 de la guía lo decía así) —
  se adoptó, y se **duplicó localmente en cada servicio** (`auth-service/src/guards/permission.guard.ts`,
  `core-service/src/guards/permission.guard.ts`) en vez de importarse de `commons/`, mismo criterio ya
  usado para `JwtAuthGuard`/`CurrentUser` (cada servicio autocontenido). Se agregó un módulo de permiso
  nuevo, `catalogos` (no existía), porque los 3 catálogos no encajaban en ningún módulo de
  `modules.enum.ts` existente — todos los roles tienen `catalogos:ver`, solo Administrador puede mutar.
- **Gateway**: ahora proxea también `/api/admin`, `/api/brands`, `/api/campaigns`, `/api/reports`,
  `/api/ideas` hacia el servicio correspondiente (antes solo `/api/auth`, `/api/me`, `/api/catalogs`).
- **`alexa-service`**: ganó su propia infraestructura JWT (`strategies/jwt.strategy.ts`,
  `guards/jwt-auth.guard.ts`, `auth/jwt-auth.module.ts`, `decorators/current-user.decorator.ts` — mismo
  patrón que `core-service`) y sus controllers de `campaigns`/`ideas` (stubs) quedaron protegidos con
  `@UseGuards(JwtAuthGuard)`. Sigue sin la lógica real de traducir intents de voz a llamadas HTTP.
- **Tests reales**: `apps/backend/test/` no tenía ni `package.json` ni `jest.config.js` — los specs
  existentes (`auth.integration.spec.ts`, `posts-flow.spec.ts`) eran `expect(true).toBe(true)`, nunca se
  ejecutaban en ningún lado. Se armó el paquete (`@repo/backend-integration-tests`) con `ts-jest` y se
  reescribieron ambos specs con aserciones reales contra Postgres (auth) y contra la máquina de estados
  pura (posts). Correr con `pnpm --filter @repo/backend-integration-tests test` (necesita
  `docker compose up -d postgres`).
- **Bug real encontrado en el camino**: `auth-service/src/prisma/client.ts` y
  `core-service/src/prisma/client.ts` cacheaban su singleton en la misma clave `global.prisma` — si ambos
  se cargan en el mismo proceso de Node (exactamente lo que hace un test que importa los dos), el segundo
  en cargar pisaba silenciosamente al primero. Cada uno ahora usa su propia clave (`prismaAuth`/
  `prismaCore`). En producción/dev normal no se manifestaba (cada servicio corre en su propio proceso),
  pero es un bug real, no cosmético.

Pendiente de correr tras esta ronda: `pnpm seed` (la matriz de permisos cambió — se agregó `catalogos` y
se amplió `marcas` para cliente/CM/diseñador).

## 1. Qué está hecho y verificado hoy (no solo "debería funcionar")

### 1.1 Bases de datos separadas (adopción completa de `docs/base/modelo2.txt`)

`auth-service` y `core-service` **ya no comparten base de datos**. Cada uno tiene:
- Su propio `prisma/schema.prisma` (`apps/backend/services/{auth,core}-service/prisma/`), copiado de la
  sección correspondiente de `docs/base/modelo2.txt`.
- Su propia base Postgres: `gestor_redes_auth` / `gestor_redes_core` (mismo contenedor Postgres del
  `docker-compose.yml`, 2 bases lógicas — no 2 contenedores).
- Su propio Prisma Client generado con `output` personalizado en
  `node_modules/.prisma-client` (**necesario**: ambos servicios declaran la misma versión de
  `@prisma/client`, y pnpm resuelve versiones idénticas al mismo folder físico en su store — sin `output`
  propio, el `generate` de un servicio pisaba el del otro. Verificado empíricamente, no es una precaución
  teórica).

Cambios de modelo reales respecto al schema viejo (único): `User` perdió `firstName`/`lastName` (ahora
viven en `UserProfile.name`, en `core-service`, vinculado solo por `userId` — **sin `@relation` real**,
son bases distintas); `BrandUser` desapareció (ownership de marca singular vía `Brand.ownerId`);
`BrandProfile` se volvió `SocialAccount`; apareció la capa `PostSocialAccount` (fan-out multi-red);
`PostStatus` pasó de 6 a 10 valores (`publicando`/`parcial`/`error`/`cancelado` nuevos).

**Verificado end-to-end**, no solo compilado:
- `pnpm --filter @repo/{auth,core}-service run build` — limpio.
- `docker build`/`docker run` reales para ambos servicios, contra la red de Docker, contra Postgres real.
- Login → JWT → refresh → `/me` → `/me/permissions`, todo contra `gestor_redes_auth` real.
- `packages/seed` reescrito para escribir en las 2 bases (2 Prisma Clients, `authPrisma`/`corePrisma`).

### 1.2 Catálogos: primer módulo de dominio realmente terminado

`core-service/src/catalogs/` (`Category`/`Specialty`/`SocialNetwork`, CRUD completo) ya no es solo "el
primer módulo wireado" — quedó **protegido y validado como debe ser**:
- `JwtAuthGuard` en los 3 controllers — sin token, `401`. Verificado en `pnpm dev` **y en Docker real**.
- DTOs con `class-validator` (`@IsString`, `@IsNotEmpty`, `@IsNumber`, `@Min(0)`) — `whitelist: true`
  restaurado en el `ValidationPipe` global de `core-service`. Verificado: body vacío → `400` con mensaje
  claro; campo no declarado en el DTO → se descarta solo, no truena.
- `CatalogsService` simplificado (se quitó la validación manual redundante que ahora cubre `class-validator`;
  se dejó `assertAtLeastOneProvided` porque es una regla cross-field real que `class-validator` no cubre
  con decoradores por campo, y `runWithUniqueGuard` para el choque de `@unique`).

**Importante para los próximos módulos**: `core-service` **no tenía ninguna infraestructura JWT propia**
antes de esto (solo hacía consultas a su BD, nunca validaba tokens — eso vivía solo en `auth-service`).
Se creó desde cero, sigue el mismo patrón autocontenido que ya usa `auth-service`:
- `core-service/src/guards/jwt-auth.guard.ts`
- `core-service/src/strategies/jwt.strategy.ts`
- `core-service/src/auth/jwt-auth.module.ts` (mínimo: solo registra la estrategia `'jwt'`; `core-service`
  no hace login, solo *valida* el token que `auth-service` ya emitió con el mismo `JWT_SECRET`)

Cualquier módulo nuevo que necesite proteger endpoints solo tiene que importar `JwtAuthModule` en su
propio `*.module.ts` y poner `@UseGuards(JwtAuthGuard)` — ya no hay que rehacer esto.

### 1.3 `brandIds` / `BrandAccessGuard` — resuelto, no solo documentado

El JWT de `auth-service` emite `brandIds: []` siempre (ya no se puede resolver con join local — `Brand`
vive en la BD de `core-service`). En vez de intentar arreglar eso, `BrandAccessGuard` se reescribió para
vivir en `core-service` (`src/guards/brand-access.guard.ts`) y validar acceso con una **consulta local**
contra su propia BD (`Brand.ownerId` o `Campaign.cmId`/`CampaignDesigner.userId` para el `brandId` del
request, usando `user.sub` del JWT) — sin llamada HTTP, sin depender de `brandIds[]`. Existe y compila,
pero **todavía no está aplicado a ningún endpoint** porque no hay endpoints de `campaigns`/`brands`
reales todavía — aplíquenlo con `@UseGuards(BrandAccessGuard)` en cuanto se construya el primero.

### 1.4 Otros arreglos de esta ronda (bugs reales, no cosméticos)

- **`turbo.json`** filtraba `DATABASE_URL_AUTH`/`DATABASE_URL_CORE` (modo `strict` de Turborepo 2.x, la
  lista `globalEnv` seguía con el nombre viejo `DATABASE_URL`) — causaba que `pnpm dev`/`pnpm dev:backend`
  fallaran con "Environment variable not found" aunque el `.env` estuviera bien. Ya corregido.
- **`AuthService.refresh()`** re-llamaba `login()` con `password: ''`, lo cual siempre fallaba el
  `bcrypt.compare` (y además quemaba el refresh token viejo aunque fallara). Ahora usa un método privado
  compartido (`issueTokens()`) que arma el JWT directo desde el usuario, sin volver a checar contraseña.
- **`tsconfig.build.tsbuildinfo`** de auth/core-service estaban comiteados en git mientras `dist/` está en
  `.gitignore` — en un clon fresco eso hacía que `tsc` compilara `core-service` con 0 archivos emitidos y
  exit code 0 (falla silenciosa). Se borraron y se agregó `*.tsbuildinfo` al `.gitignore`.
- Dockerfiles de los 4 servicios reescritos para build con **contexto = raíz del repo** (antes usaban
  `npm ci` sin lockfile y contexto limitado a su propia carpeta — nunca habían funcionado de verdad).

## 2. Qué falta — actualizado 2026-07-27

Lo que describía esta sección antes (campaigns/reports/ideas vacíos, gateway sin proxear, guards sin
aplicar) ya está hecho — ver §0. Lo que sigue de verdad pendiente:

- **`posts/` sigue sin controller/service/module que exponga la máquina de estados por HTTP.** Es el
  módulo de negocio más grande que falta — sin él no hay flujo de aprobación real, ni fan-out multi-red
  (`PostSocialAccount`), ni biblioteca de medios (`Media`/`PostMedia`) conectada a nada. La máquina de
  estados en sí (`posts/state-machine/`) ya soporta los 10 valores de `PostStatus` y está probada
  (`apps/backend/test/posts-flow.spec.ts`) — lo que falta es la capa HTTP + Prisma alrededor.
- **Métricas y Score sin exponer por HTTP.** `score.service.ts` y `cron/metrics-cron.service.ts` existen
  como lógica pero no hay ningún controller que los sirva — nadie puede consultar el score de una marca
  todavía. La fórmula real (4 factores con `coverage`) sigue sin confirmarse contra la documentada en
  `CLAUDE.md` (3 factores) — confirmar con el usuario antes de tocar el cálculo o de exponerlo.
- **Notificaciones**: el modelo `Notification` existe en `auth-service` pero no hay service/controller, ni
  el endpoint interno que `core-service` debería llamar al rechazar un post o asignar una campaña
  (mencionado como pendiente en el propio `modelo2.txt`).
- **`alexa-service`** ya tiene infraestructura JWT (ver §0) pero sus controllers de `campaigns`/`ideas`
  siguen siendo stubs — falta la lógica real de traducir intents de voz a llamadas HTTP contra
  `core-service`/`auth-service` (con el circuit breaker de `commons/circuit-breaker/opossum.factory.ts`,
  que existe pero nadie usa todavía, ni siquiera el fetch best-effort de `auth-service` hacia
  `core-service` en `register()`).
- **`AuditInterceptor`/`LoggingInterceptor`** (`commons/interceptors/`) no están registrados como
  interceptor global en ningún servicio, pese a que `audit_log` es una tabla inmutable pensada
  exactamente para esto.
- **Frontend**: sigue 100% en modo mock, cero consumo de cualquier endpoint real (ni siquiera los que ya
  existían antes de esta ronda). Fuera de alcance a propósito, no se tocó.
- `.claude/INVENTORY.md` §2 (Frontend) sigue con fecha 2026-07-19, sin actualizar.

## 3. Cosas importantes a tener en cuenta antes de escribir el siguiente módulo

1. **Patrón de DTOs ya decidido**: `class-validator` con decoradores por campo (`@IsString`,
   `@IsNotEmpty`, `@IsNumber`, `@Min(0)`, `@IsOptional` en los Update). `ValidationPipe` global de
   `core-service` tiene `whitelist: true` — cualquier DTO nuevo sin decoradores hará que Nest descarte
   todos sus campos. Ya no es una decisión abierta, es la convención a seguir.
2. **Prisma Client con `output` personalizado es obligatorio** en cualquier schema nuevo dentro de este
   monorepo mientras dos servicios compartan versión de `@prisma/client` — copiar el patrón de
   `output = "../node_modules/.prisma-client"` que ya tienen `auth-service`/`core-service`, y anotar
   `prisma: PrismaClient` explícito en el wrapper `client.ts` (si no, `tsc` tira `TS2742` por el tipo no
   nombrable desde un path relativo).
3. **`core-service` ya tiene `JwtAuthModule`/`JwtAuthGuard`/`BrandAccessGuard` listos para reusar** — no
   hay que rehacer la infraestructura JWT para el siguiente módulo, solo importar y aplicar.
4. **Nada carga `.env` automáticamente** al correr `pnpm dev`/`pnpm dev:backend` en el host — hay que
   `source .env` (con `set -a`/`set +a`) en la misma terminal antes. Los scripts de `packages/seed` sí lo
   hacen solos (`node --env-file-if-exists=../../.env`).
5. **El seed ya NO crea categorías/especialidades/redes sociales** (se quitó a propósito para poder
   probar el CRUD de catálogos desde cero vía API/Postman). Si un módulo nuevo necesita datos de catálogo
   para probarse, hay que crearlos a mano vía `POST /api/catalogs/*` (ahora requiere login).
   
## 4. Siguiente paso sugerido — actualizado 2026-07-27

`campaigns/`, `reports/`, `ideas/` (y `brands/`, que no estaba en el plan original) ya están construidos —
ver §0. En orden de prioridad para lo que sigue:
1. `posts/` — el módulo de negocio central que falta, dar controller/service a la máquina de estados ya
   existente y probada. Depende de `campaigns`/`brands` (ya listos) y de `Media`/`SocialAccount` (sin
   controller propio todavía tampoco).
2. Notificaciones — el endpoint interno en `auth-service` que `core-service` debería llamar al rechazar un
   post o asignar una campaña (hoy no existe ninguno de los dos lados).
3. Métricas/Score — exponer `score.service.ts` por HTTP, una vez confirmada la fórmula vigente con el
   usuario.
4. `alexa-service` — lógica real de intents una vez que `campaigns`/`ideas` de `core-service` (ya listos)
   tengan también `posts` para poder cubrir los intents que lo requieran.

Todos deberían seguir el mismo patrón ya establecido: DTOs con `class-validator`, `JwtAuthGuard` +
`PermissionGuard` + (si el recurso cuelga directo de una marca) `BrandAccessGuard` — pero ver la nota de
§0 sobre `campaigns`: si el `:id` de la ruta no es un `brandId` (es un `campaignId`, un `postId`, etc.),
`BrandAccessGuard` no aplica tal cual y la pertenencia se resuelve a mano en el service.
