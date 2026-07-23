# Estado del backend — bases separadas + catálogos protegidos (al día: 2026-07-23)

> Este documento arrancó como un análisis de la rama `feat/catalogos-base` antes de mergearla. Esa rama
> ya se mergeó, y desde entonces se hizo trabajo real de fondo (separación de bases de datos completa,
> catálogos protegidos con auth real). Este documento se reescribió para reflejar el estado **actual**,
> no el análisis original — sirve como punto de partida para quien siga con el resto de los módulos de
> `core-service` (`campaigns`, `posts`, `reports`, `ideas`).

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

## 2. Qué falta — para cuando se retome el resto de `core-service`

Fuera de alcance de esta ronda a propósito (nadie los tocó):
- **`campaigns/`, `reports/`, `ideas/` siguen siendo stubs vacíos** (`export class CampaignsService {}`,
  sin métodos). Registrar el módulo en `AppModule` no alcanza — hay que escribir la lógica real.
- **`posts/state-machine/`** sigue sin controller que lo exponga por HTTP (la máquina de estados en sí ya
  soporta los 10 valores nuevos de `PostStatus`, incluyendo el tramo `publicando→{publicado|parcial|error|
  cancelado}` — es traducción directa del comentario ya escrito en `modelo2.txt`, no lógica nueva).
- **`auth-service`** (dominio) y **`alexa-service`** no se tocaron — siguen como estaban antes de esta
  sesión (`auth-service` ya estaba wireado desde una sesión anterior; `alexa-service` sigue con
  `imports: []`).
- **El gateway sigue sin proxear nada** (`http-proxy-middleware` instalado, sin usar).
- **El cálculo real del Score Digital** existe y ahora usa el shape nuevo (`PostSocialAccount`/
  `SocialAccount`), pero la fórmula sigue sin confirmar con el usuario (`CLAUDE.md` documenta 3 factores,
  el código implementa 4 con `coverage`) — confirmar antes de tocarlo.
- `.claude/INVENTORY.md` §2 (Frontend) sigue con fecha 2026-07-19, sin actualizar en esta ronda (solo se
  reescribió la §1, Backend).

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
   
## 4. Siguiente paso sugerido (cuando se retome)

Dentro de `core-service`, en orden de menor a mayor esfuerzo — sin empezar todavía, según lo acordado:
1. `campaigns/` — es el módulo del que dependen `posts/`, `ideas/`, y a futuro `alexa-service`.
2. `posts/` — dar controller a la máquina de estados ya existente.
3. `reports/`, `ideas/`, en el orden que priorice el equipo.

Todos deberían seguir el mismo patrón ya establecido: DTOs con `class-validator`, `JwtAuthGuard` +
`BrandAccessGuard` en endpoints que toquen una marca/campaña específica, repository/service local sin
depender de `commons/`.
