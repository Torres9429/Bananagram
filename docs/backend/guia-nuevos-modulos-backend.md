# Guía para construir un módulo nuevo de backend

> Estándar de facto, extraído de cómo se construyó `core-service/catalogs` (el primer módulo de dominio
> terminado de punta a punta: wireado, protegido, validado, verificado en Docker real). No reemplaza a
> `.agents/backend.md`/`.agents/database.md`/`agents/conventions.md` — los complementa con el detalle
> práctico que esos archivos no traen, y **corrige 2 puntos donde el código real ya diverge de lo
> documentado ahí** (ver §5). Úsala como checklist al construir `campaigns`, `posts`, `reports`, `ideas`,
> o cualquier módulo nuevo en `auth-service`/`core-service`.

## 1. Mapa mental — dónde vive cada cosa

```
Cliente (Postman/frontend)
        │  Authorization: Bearer <JWT>
        ▼
   api-gateway (4000)  ── proxy puro, no valida nada, solo reenvía
        │
        ├── /api/auth/*, /api/me/*  ──▶  auth-service (3001) ── BD: gestor_redes_auth
        └── /api/catalogs/* (y lo que sigue) ──▶ core-service (3002) ── BD: gestor_redes_core
```

- **`auth-service`**: identidad, login, RBAC (`Role`/`Module`/`Action`/`RolePermission`). Emite el JWT.
- **`core-service`**: todo lo de negocio (marcas, campañas, posts, catálogos, métricas, score, reportes,
  ideas). No hace login — solo *valida* el JWT que `auth-service` ya emitió, con el mismo `JWT_SECRET`.
- **`alexa-service`**: BFF de la Alexa Skill, sin BD propia, sin tocar en esta fase.
- Cada servicio es **autocontenido**: su propio `schema.prisma`, su propia infraestructura JWT si la
  necesita. **Actualizado 2026-08-16 (`c867e24`)**: el criterio de "nada se importa de `commons/`" se
  revirtió — `commons/` volvió a ser un paquete workspace real (`@repo/backend-commons`) y el código
  verdaderamente compartido (guards, decorators, filters, circuit breaker, enums) se importa de ahí en vez
  de duplicarse por servicio. La única excepción sigue siendo código que es *genuinamente distinto* entre
  servicios por su rol (ver §6: `auth-service` con su `JwtAuthGuard`, porque es el emisor del JWT, no un
  verificador remoto). Ver `CLAUDE.md` → "commons" para el detalle completo de qué se comparte y qué no.

## 2. Estructura de un módulo (usa `catalogs/` como plantilla)

```
core-service/src/<modulo>/
├── <modulo>.module.ts        # imports: [JwtAuthModule] si el módulo protege endpoints
├── <modulo>.service.ts       # lógica de negocio + acceso a Prisma
├── <recurso>.controller.ts   # uno por recurso si el módulo agrupa varios (ver catalogs: 3 controllers)
└── dto/
    ├── create-<recurso>.dto.ts
    └── update-<recurso>.dto.ts
```

Un módulo puede agrupar varios recursos relacionados (como `catalogs` agrupa `categories`/`specialties`/
`social-networks` bajo un solo `CatalogsService` y 3 controllers) o ser 1:1 recurso↔módulo. Decídelo por
cohesión de dominio, no por dogma.

## 3. Base de datos

1. **¿El modelo va en `auth-service` o `core-service`?** Identidad/RBAC/sesión → `auth-service`. Todo lo
   demás (negocio) → `core-service`. Si dudas, mira `docs/base/modelo2.txt` — ya tiene la separación
   completa hecha, cópiala tal cual, no la rediseñes.
2. Edita el `schema.prisma` del servicio correspondiente
   (`apps/backend/services/{auth,core}-service/prisma/schema.prisma`).
3. Corre la migración **desde ese servicio** (nunca desde la raíz sin `--filter`, y nunca `npx prisma`
   suelto — ver §7 sobre por qué):
   ```bash
   pnpm --filter @repo/core-service run db:migrate   # o @repo/auth-service
   ```
4. El `generator client` de cada schema **ya trae `output` personalizado**
   (`node_modules/.prisma-client`) — no lo quites ni lo cambies. Es obligatorio mientras ambos servicios
   compartan versión de `@prisma/client`; sin esto, el `generate` de un servicio pisa el Client generado
   del otro (verificado empíricamente, no es paranoia).
5. Reglas de `agents/conventions.md`/`.agents/database.md` que siguen aplicando: `deletedAt` (soft
   delete) + `createdAt`/`updatedAt` en toda tabla de negocio, UUID como PK salvo `AuditLog`/
   `PostStatusHistory` (BIGINT, inmutables). La regla de `brand_id NOT NULL` aplica a tablas de negocio
   con dueño de marca — catálogos/identidad (`Category`, `Role`, etc.) son la excepción obvia, no tienen
   `brandId` porque no son de una marca.
6. **Ojo con el singleton de `client.ts` si algo carga los dos servicios en el mismo proceso** (p. ej. un
   test de integración): `auth-service/src/prisma/client.ts` y `core-service/src/prisma/client.ts` cacheaban
   su instancia en la misma clave `global.prisma` — el segundo en importarse pisaba en silencio al
   primero (bug real, corregido 2026-07-27: ahora usan `global.prismaAuth`/`global.prismaCore`). Si creas
   un `client.ts` nuevo para un servicio adicional, usa una clave de `global` distinta a las que ya
   existen — no reuses `prisma` a secas.

## 4. DTOs y validación

Patrón ya establecido (`catalogs/dto/*.ts`) — `class-validator` con decoradores por campo, no validación
manual:

```ts
// create-*.dto.ts
export class CreateXDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;
}

// update-*.dto.ts — todo opcional
export class UpdateXDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
```

`core-service/src/main.ts` ya tiene `ValidationPipe({ whitelist: true, transform: true })` global — **un
DTO sin decoradores hace que Nest borre todos sus campos silenciosamente**. Si un endpoint nuevo recibe
`{}` en vez de los datos que mandaste, lo primero a revisar es si el DTO tiene decoradores.

Lo que **sí** sigue siendo válido a mano en el service (no lo cubre `class-validator` por campo):
- Reglas cross-field (ej. "en un PATCH debe venir al menos un campo" — `assertAtLeastOneProvided` en
  `CatalogsService`).
- Reglas de negocio que dependen de una consulta a BD (ej. `runWithUniqueGuard`, que atrapa el choque de
  `@unique` de Prisma — `P2002` — y lo traduce a `409 Conflict`).

## 5. Excepciones desde el service, repository opcional — decisión ya cerrada

`.agents/backend.md` originalmente decía *"Repositorios abstraen el acceso a Prisma"* y *"Nunca lanzar
errores HTTP desde los servicios; solo desde controladores o filtros"*. `CatalogsService` — el único
módulo de negocio terminado y probado — **no seguía ninguna de las 2**: llama `prisma.*` directo (sin
repository) y lanza `NotFoundException`/`ConflictException`/`BadRequestException` directo desde el
service. No fue un descuido, y `.agents/backend.md` ya se actualizó para reflejarlo — ya no hay
contradicción entre los documentos, esto queda como registro del porqué:

- **Lanzar excepciones desde el service es el patrón idiomático de NestJS** (así lo hace la propia
  documentación oficial de Nest) — el controller queda de una línea (`return this.service.algo()`), y el
  exception filter por defecto de Nest ya formatea cualquier `HttpException` sin importar de dónde se
  lance, sin que haga falta registrar nada extra. (`@repo/backend-commons` también exporta un
  `HttpExceptionFilter` propio desde el `c867e24`, pero ningún `main.ts` lo registra todavía como filtro
  global — no es lo que formatea las respuestas hoy, es el default de Nest.) La regla vieja solo tenía
  sentido si el controller iba a decidir *qué* excepción lanzar según el resultado del service — pero eso
  es más código, no menos, para el mismo resultado.
- **Repository es opcional, no obligatorio.** `auth-service` tiene `AuthRepository` porque sus queries
  (refresh tokens, permisos agregados por rol) tienen suficiente complejidad para justificar la capa.
  Para CRUD simple como `catalogs` (o cualquier módulo que sea básicamente `findMany`/`create`/`update`
  con soft-delete), llamar `prisma.*` directo en el service es más simple y no pierde nada — no hay lógica
  que compartir entre múltiples services todavía. Si un módulo nuevo empieza a acumular queries complejas
  o repetidas, entonces sí vale la pena extraer un repository (mismo criterio que ya se usó para decidir
  que `auth-service` sí lo necesitaba).

## 6. Autenticación (JWT)

**Actualizado 2026-08-16 (`c867e24`)**: esta sección describía un `JwtAuthGuard`/`jwt.strategy.ts` local de
`core-service` basado en passport y `JWT_SECRET` compartido — ya no es así. El JWT es RS256/JWKS desde
antes (ADR-0004, ver `CLAUDE.md`), y desde este commit `core-service` y `alexa-service` ya no duplican el
guard localmente: lo importan de `@repo/backend-commons`, que **sí** es la forma correcta de compartirlo
ahora (al revés de lo que decía la versión anterior de esta sección).

Ya existe, no hay que rehacerlo, solo reusarlo:
- `@repo/backend-commons` exporta `JwtAuthGuard` (`implements CanActivate`, verifica RS256 contra el JWKS
  remoto de `auth-service` vía `jose`, sin passport) + `TokenDenylistService`. `core-service` y
  `alexa-service` lo importan tal cual — no tienen su propia copia.
- `src/auth/jwt-auth.module.ts` (local a cada servicio, sí) — módulo `@Global()` mínimo que provee
  `TokenDenylistService` para que esté disponible en todo módulo que use el guard vía `@UseGuards`, no solo
  los que importan este módulo explícitamente. Este archivo sigue siendo local porque su rol es de wiring
  de DI del servicio, no lógica compartible.

Para proteger un módulo nuevo:
```ts
// tu-modulo.module.ts
@Module({
  imports: [JwtAuthModule],
  controllers: [TuController],
  providers: [TuService],
})
export class TuModulo {}
```
```ts
// tu.controller.ts
import { JwtAuthGuard } from '@repo/backend-commons';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tu-recurso')
export class TuController { ... }
```

**Excepción real, no un patrón a copiar sin pensar**: `auth-service` mantiene su propia copia local
(`src/guards/jwt-auth.guard.ts`), no importa la de `commons/`, porque es el *emisor* del JWT — verifica con
su llave privada directo, no contra un JWKS remoto (verificación genuinamente distinta, no solo "el mismo
código duplicado"). Si algún día un servicio **nuevo** necesita validar JWT como verificador remoto
(el caso común), importa `JwtAuthGuard` de `@repo/backend-commons` como `core-service`/`alexa-service` —
solo copia el patrón de `auth-service` si ese servicio nuevo también va a *emitir* tokens.

## 7. Autorización por marca (`BrandAccessGuard`) — y por qué no siempre aplica

**Actualizado 2026-07-27**: ya está aplicado, en `core-service/src/brands/brands.controller.ts` (rutas
`GET/PATCH/DELETE /brands/:id`):

```ts
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('brands')
export class BrandsController {
  @Get(':id')
  @RequirePermission('marcas', 'ver')
  @UseGuards(BrandAccessGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) { ... }
}
```

Qué hace: valida que el `userId` del JWT (`user.sub`) sea dueño de la marca (`Brand.ownerId`) o esté
asignado a alguna campaña de esa marca (`Campaign.cmId`/`CampaignDesigner.userId`) — **consulta local a
la BD de `core-service`**, no llamada HTTP. No confundir con `brandIds[]` del JWT: ese campo siempre viene
vacío a propósito (`auth-service` ya no puede resolverlo, Brand vive en otra BD) — no lo uses para nada,
usa el guard.

**Trampa real en la que ya se cayó al construir `campaigns/`**: `BrandAccessGuard` resuelve el `brandId` a
validar leyendo `request.params.brandId || request.params.id` — asume que el `:id` de la ruta ES un
`brandId`. Eso es cierto en `brands/:id`, pero **no** en `campaigns/:id` (ahí `:id` es un `campaignId`) ni
lo será en `posts/:id`, `reports/:id`, etc. Aplicar el guard tal cual en esas rutas lo rompe: buscaría un
`Brand` con el id de una `Campaign`, nunca lo encontraría, y negaría el acceso siempre — no falla ruidoso,
falla silencioso (403 en todo). Regla práctica: **`BrandAccessGuard` solo sirve en rutas donde `:id` literalmente
identifica una `Brand`.** Para cualquier otro recurso, resuelve la pertenencia a mano en el service (ver
`CampaignsService.assertCanManage` en `core-service/src/campaigns/campaigns.service.ts` — misma idea,
sin guard genérico: dueño de la marca del recurso, o CM/rol asignado, o Administrador).

## 7bis. `PermissionGuard` — ya no es una decisión abierta

**Actualizado 2026-07-27, revertido 2026-08-16 (`c867e24`)**: se adoptó primero duplicándose localmente en
cada servicio (mismo criterio que `JwtAuthGuard`/`CurrentUser` de §6 en su momento) —
`core-service/src/guards/permission.guard.ts`, `auth-service/src/guards/permission.guard.ts`, cada uno con
su propio `decorators/require-permission.decorator.ts`. **Ese criterio ya no aplica**: al revivir
`commons/` como paquete real, `PermissionGuard`/`RequirePermission` se movieron ahí de verdad y las copias
locales se borraron — los 3 servicios (incluido `alexa-service`, que también lo usa) importan
`PermissionGuard`/`RequirePermission` de `@repo/backend-commons`. A diferencia de `JwtAuthGuard`,
`PermissionGuard` no tiene una razón de rol para ser distinto entre servicios (todos leen
`user.permissions[module]` del mismo payload de JWT), por eso sí se comparte sin excepción.

Patrón para un endpoint nuevo:
```ts
import { JwtAuthGuard, PermissionGuard, RequirePermission } from '@repo/backend-commons';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('tu-recurso')
export class TuController {
  @Get()
  @RequirePermission('tu-modulo', 'ver')
  findAll() { ... }
}
```

`tu-modulo` tiene que existir en `commons/types/modules.enum.ts` **y** en `packages/seed/src/index.js`
(`MODULES`/`ROLE_PERMISSIONS`) — si tu recurso no encaja en ningún módulo existente (`marcas`,
`publicaciones`, `calendario`, `campanas`, `metricas`, `score`, `reportes`, `usuarios`, `privilegios`,
`catalogos`), agrega uno nuevo ahí (así se hizo con `catalogos`, que no existía) y define qué acción
(`ver`/`crear`/`editar`/`eliminar`/...) recibe cada rol. Después de tocar el seed hay que volver a correr
`pnpm seed` — no aplica solo con reiniciar el servicio.

Si el sub-recurso no tiene módulo propio natural (como `ContentIdea`, que no tiene un módulo `ideas` en el
seed), es válido reusar el módulo del recurso padre (`campanas` en ese caso) en vez de inventar uno — pero
entonces la pertenencia real (¿esta idea es de una campaña a la que tengo acceso?) hay que verificarla en
el service, el permiso por módulo solo cubre "¿tiene este rol el privilegio en general?", no "¿es SU
campaña?".

## 7ter. Validar un atributo/rol que vive en el otro servicio — patrón `UserProfile.roleName` (nuevo 2026-08-01)

Cuando un módulo de `core-service` necesita saber algo de identidad que solo `auth-service` conoce de
verdad (ej. "¿este userId tiene rol CM?"), hay dos caminos: llamar por HTTP en cada lectura, o denormalizar
el dato una vez y consultarlo local. `campaigns/` (`CampaignsService.assertUserHasRole`,
`listEligibleCommunityManagers`/`listEligibleDesigners`) usó el segundo:

1. `UserProfile.roleName` (`'cliente'|'cm'|'disenador'`, nullable) se escribe **una sola vez**, en
   `POST /internal/user-profiles` (el mismo endpoint interno que ya usaba `register()` para crear el
   nombre) — nunca se vuelve a leer de auth-service después.
2. Cualquier validación posterior (¿este userId es CM? ¿qué diseñadores existen?) es un `findFirst`/
   `findMany` local contra `core-service`'s propia BD, filtrando por `roleName` — cero HTTP, cero
   circuit breaker.
3. **Trade-off real, no lo ocultes si construyes algo similar**: si el rol de un usuario cambia en
   `auth-service` después de su registro (`AdminUsersService.updateUser` lo permite), `roleName` en
   `core-service` queda desactualizado — nada lo re-sincroniza hoy. Es una decisión consciente (evita HTTP
   síncrono en el camino caliente de crear campañas), pero documéntala igual si reusas el patrón en un
   módulo nuevo.

Ver `docs/base/modelo2.txt` (modelo `UserProfile`) y `docs/base/service-boundaries.md` (fila #2 de la
tabla de FKs cruzadas) para el detalle completo de esta decisión.

## 8. Wiring — de código muerto a endpoint real

1. Registra el módulo en `app.module.ts` del servicio:
   ```ts
   @Module({ imports: [CatalogsModule, TuModuloNuevo] })
   export class AppModule {}
   ```
2. Si el endpoint necesita ser alcanzable desde el frontend/Postman **a través del gateway** (no solo
   pegándole directo al puerto del servicio), agrega la línea de proxy en
   `apps/backend/gateway/src/main.ts`:
   ```ts
   app.use(createProxyMiddleware({ pathFilter: '/api/tu-prefijo', target: coreServiceUrl, changeOrigin: true }));
   ```
   Una línea por prefijo nuevo. No hace falta tocar nada más del gateway.
3. Si agregas una variable de entorno nueva (poco común para un módulo normal, pero si pasa),
   agrégala a `turbo.json` → `globalEnv` — si no, Turborepo (modo `strict` desde v2) la filtra
   silenciosamente en `pnpm dev` y el síntoma es un error de "Environment variable not found" que no
   tiene nada que ver con tu código.

## 9. Docker

No deberías tener que tocar los Dockerfiles para un módulo nuevo — ya están preparados (contexto raíz,
`prebuild`/`predev` corren `prisma generate` automático). Si agregaste un modelo nuevo al schema, el
`Dockerfile` lo recoge solo en el siguiente build. Si agregaste una dependencia npm nueva, corre
`pnpm install` en la raíz antes de buildear (para que el lockfile quede actualizado y Docker lo instale
bien).

## 10. Checklist — "voy a construir el módulo X"

1. [ ] ¿El modelo va en `auth-service` o `core-service`? (§3.1) — probablemente `core-service`.
2. [ ] Agregar/editar el modelo en su `schema.prisma`, correr `db:migrate` con `--filter` (§3).
3. [ ] Escribir `<modulo>.service.ts` — Prisma directo salvo que la complejidad justifique un repository
   (§5). Lanzar `NotFoundException`/`ConflictException`/etc. directo desde ahí.
4. [ ] Escribir los DTOs con `class-validator` (§4) — no dejarlos como clases vacías.
5. [ ] Escribir el/los controller(s), con `@UseGuards(JwtAuthGuard)` (+ `BrandAccessGuard` si aplica a una
   marca, §6-7) y `@ApiBearerAuth()`.
6. [ ] Registrar el módulo en `app.module.ts` (§8.1).
7. [ ] Agregar la ruta al gateway si hace falta (§8.2).
8. [ ] Verificar — no dar por terminado sin esto (§11).

## 11. Definition of Done — el estándar que se usó en `catalogs`

No es "compila". Antes de considerar un módulo terminado, verificado de verdad:

1. `pnpm --filter @repo/core-service run build` — limpio, sin errores.
2. Arrancar en modo dev (`pnpm --filter @repo/core-service run dev`, con `.env` cargado) y probar con
   `curl`/Postman:
   - Sin token → `401`.
   - Con token válido → `200`/`201` con los datos correctos.
   - Body inválido (campo vacío/tipo incorrecto) → `400` con mensaje claro.
   - Campo no declarado en el DTO → se descarta solo, la request no truena (confirma que `whitelist`
     sigue funcionando).
3. **`docker build` + `docker run` reales** (no solo `pnpm dev`) contra la red de Docker
   (`--network bananagram_default`) y Postgres real. Un `pnpm dev` que funciona no garantiza que el
   Docker build también funcione — ya pasó hoy que un bug (`tsbuildinfo` comiteado) solo se manifestaba
   en un build limpio tipo Docker, no en local con caché tibia.
4. Si el endpoint debe ser alcanzable vía gateway, probarlo también contra `localhost:4000/api/...`, no
   solo contra el puerto directo del servicio.
5. Limpiar los datos de prueba que hayas creado en la BD antes de dar por cerrado (no dejar
   "Prueba 123" viviendo en `gestor_redes_core`).
6. Si tocaste `packages/seed/src/index.js` (módulo/permiso nuevo), vuelve a correr `pnpm seed` — el efecto
   no aparece solo con reiniciar el servicio.
7. Si el módulo tiene lógica no trivial reusable en un test (una máquina de estados, un flujo de
   rotación/reuso, etc.), agrega un spec real en `apps/backend/test/` (`pnpm --filter
   @repo/backend-integration-tests test`, necesita `docker compose up -d postgres`) — no dejes un
   placeholder `expect(true).toBe(true)` como los que había antes de 2026-07-27.

## 12. Commits

Un commit por concepto, no un commit gigante. Mensaje que explique el *porqué*, no solo el *qué* (el
*qué* ya se ve en el diff). Sin coautoría. Ver el historial de `feat/db-separada-catalogos-protegidos` y
`feat/gateway-proxy-real` como referencia de granularidad.
