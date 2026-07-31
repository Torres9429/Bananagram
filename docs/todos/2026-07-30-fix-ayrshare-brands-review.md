# Revisión + fixes: integración de Ayrshare en `feat/services` (2026-07-30)

## Contexto

El commit `c3616eb feat(brand): creacion de marca + redes sociales + API externa` (rama `feat/services`,
autora ViridianaPP) agregó la integración con [Ayrshare](https://www.ayrshare.com/) para que
`POST /brands` cree un perfil externo y devuelva una URL de onboarding para conectar redes sociales. Se
pidió revisar si siguió las convenciones del backend documentadas en `.claude/CLAUDE.md` y
`docs/backend/guia-nuevos-modulos-backend.md`.

La revisión encontró 8 problemas puntuales (config, tipos, seguridad, validación) más 2 gaps de flujo
(rollback incompleto y "cerrar el loop" de qué redes quedaron conectadas). Se investigó la documentación
oficial de Ayrshare (`https://www.ayrshare.com/docs/llms.txt` y sub-páginas) para resolver los 2 últimos
con datos reales de la API en vez de suposiciones. Todo se corrigió, se probó en vivo contra el backend
real (Postgres en Docker + credenciales de Ayrshare ya configuradas en `.env`), y se actualizó la
colección de Postman.

## Lo que ya estaba bien (no se tocó)

- Guards correctos: `JwtAuthGuard` + `PermissionGuard` a nivel controller, `BrandAccessGuard` en las
  rutas `:id`.
- Lanzar excepciones HTTP desde el service (no solo desde controllers) — parece violar el CLAUDE.md
  viejo, pero es una decisión ya cerrada y documentada en `docs/backend/guia-nuevos-modulos-backend.md`
  §5 (`CatalogsService` sentó el precedente).
- Soft delete respetado: la marca nunca se borra físicamente, incluso en el rollback.
- Secretos de Ayrshare solo se leen server-side en `core-service`.

## Problemas encontrados y su solución

| # | Problema | Solución |
|---|----------|----------|
| 1 | `.env.example` no documentaba las 4 env vars de Ayrshare | Agregado bloque con `AYRSHARE_API_KEY`, `AYRSHARE_DOMAIN`, `AYRSHARE_PRIVATE_KEY`, `AYRSHARE_API_BASE_URL` |
| 2 | Config faltante respondía `400 Bad Request` (semánticamente incorrecto — es un error del servidor, no del cliente) | Ahora `500 Internal Server Error`, extraído a `brands/ayrshare.util.ts` |
| 3 | `as any` al hacer `prisma.brand.update({ refId, profileKey })` — señal de que el Prisma Client no se había regenerado tras el cambio de schema | Se regeneró (`pnpm db:generate`) y se quitó el cast |
| 4 | **Fuga de recurso externo**: si `createAyrshareProfile` tenía éxito pero `generateJWT` fallaba, quedaba un perfil huérfano en Ayrshare sin registro local | Se agregó `deleteAyrshareProfile()` — `DELETE /profiles` con header `Profile-Key`, llamado automáticamente en el `catch` antes de soft-deletear la marca. **Probado en vivo**: se forzó el fallo y se confirmó que el perfil se borra de verdad en Ayrshare (la cuota de perfiles se liberó) |
| 5 | `refId`/`profileKey` (identificadores internos de la integración) se exponían en las respuestas de `GET/POST/PATCH/DELETE /brands` a cualquiera con permiso de ver la marca | Nunca se devuelven ahora (helper `toBrandResponse`); solo se agrega `connectUrl` en la respuesta de `POST /brands` |
| 6 | Migración de Prisma sin nombre descriptivo (`20260730033241_`) | Renombrada a `20260730033241_drop_brand_category_and_media_uploaded_by` |
| 7 | `console.error` agregado en `auth.service.ts` no seguía el patrón `Logger` de NestJS que ya usa el resto del backend | Reemplazado por `this.logger.error(...)` |
| 8 | El DTO aceptaba `allowedSocial: []` (una connect URL sin ninguna red permitida) | `@ArrayMinSize(1)` |
| 9 | **Flujo incompleto**: no existía forma de saber qué redes quedaron conectadas después de que el usuario visitara la `connectUrl` | Ver sección siguiente — módulo `social-accounts` nuevo |
| 10 | Sin tests automatizados para este flujo | Decisión explícita: no se agregaron — se validó manualmente contra Ayrshare real (ver "Pruebas realizadas") |

### Problema #9 — módulo nuevo `social-accounts`

Ayrshare no manda webhook para "se conectó una red" sin plan Premium + una URL pública (inviable para
probar solo con Postman en local). En su lugar, `GET https://api.ayrshare.com/api/user` (con header
`Profile-Key`) devuelve qué redes están activas ahora mismo — eso se usa para un endpoint de sync:

- `POST /brands/:brandId/social-accounts/sync` — consulta Ayrshare y hace upsert de `SocialAccount` local
  contra el catálogo `SocialNetwork` (matching por `code`, ignora silenciosamente redes que el Admin no
  haya dado de alta — mismo espíritu que la regla de negocio #8, "matching orientativo").
- `GET /brands/:brandId/social-accounts` — lee el estado local sin llamar a Ayrshare.

Archivos nuevos: `apps/backend/services/core-service/src/social-accounts/` (`*.module.ts`,
`*.controller.ts`, `*.service.ts`), registrado en `app.module.ts`.

## Detalle técnico: cómo se consume la API externa (Ayrshare)

Todo vive en `apps/backend/services/core-service/src/brands/` (perfil + connect URL + rollback) y
`.../social-accounts/` (sync). Se usa `fetch` nativo de Node, sin SDK ni librería — 4 llamadas en total,
todas con `Authorization: Bearer {AYRSHARE_API_KEY}`. Config centralizada en `brands/ayrshare.util.ts`
(`getAyrshareConfig()` lee las 4 env vars; `AYRSHARE_PRIVATE_KEY` viene en base64 en el `.env` y se
decodifica a UTF-8 antes de usarse, porque es una private key RSA multilínea).

### 1. Crear el perfil — `createAyrshareProfile()` en `brands.service.ts`

- **Método/URL**: `POST {AYRSHARE_API_BASE_URL}/profiles`
- **Headers**: `Authorization: Bearer {apiKey}`, `Content-Type: application/json`
- **Body enviado**: `{ "title": brand.name }` — solo el nombre de la marca.
- **Campos que se leen de la respuesta**: `status` (debe ser `"success"`), `refId`, `profileKey`. Si
  `status !== "success"` o la respuesta no es `ok`, se lanza `BadRequestException` con el `code`/`message`
  que manda Ayrshare (ej. `Ayrshare 286: Over maximum number of user profiles...`).
- **Se llama**: al inicio de `createBrand()`, justo después de crear la fila `Brand` en la BD local.

### 2. Generar la connect URL — `createAyrshareConnectUrl()` en `brands.service.ts`

- **Método/URL**: `POST {AYRSHARE_API_BASE_URL}/profiles/generateJWT`
- **Headers**: `Authorization: Bearer {apiKey}`, `Content-Type: application/json`
- **Body enviado**: `{ "domain": AYRSHARE_DOMAIN, "privateKey": AYRSHARE_PRIVATE_KEY (decodificada),
  "profileKey": <del paso 1>, "allowedSocial": dto.allowedSocial }` — `allowedSocial` es el array que
  manda el cliente en `POST /brands` (ej. `["facebook","instagram"]`), limita qué redes puede conectar el
  usuario en la pantalla de onboarding de Ayrshare.
- **Campo que se lee de la respuesta**: `url` — es la `connectUrl` que se devuelve en la respuesta de
  `POST /brands`. También viene `token`/`expiresIn` pero no se usan.
- **Se llama**: inmediatamente después del paso 1, con el `profileKey` recién obtenido.

### 3. Rollback — `deleteAyrshareProfile()` en `brands.service.ts` (fix del problema #4)

- **Método/URL**: `DELETE {AYRSHARE_API_BASE_URL}/profiles`
- **Headers**: `Authorization: Bearer {apiKey}`, `Profile-Key: {profileKey}` — **sin body**. La
  identificación de qué perfil borrar va en el header `Profile-Key`, no en el body (así lo documenta
  Ayrshare; verificado en vivo).
- **Respuesta esperada**: `{ "status": "success", "refId": "..." }`.
- **Se llama**: solo dentro del `catch` de `createBrand()`, y solo si el paso 1 (crear perfil) ya se
  había completado antes de que fallara el paso 2 — evita dejar perfiles huérfanos en Ayrshare.

### 4. Sync de redes conectadas — `syncFromAyrshare()` en `social-accounts.service.ts` (fix del problema #9)

- **Método/URL**: `GET {AYRSHARE_API_BASE_URL}/user`
- **Headers**: `Authorization: Bearer {apiKey}`, `Profile-Key: {brand.profileKey}` — sin body (es GET).
- **Campos que se leen de la respuesta**:
  - `activeSocialAccounts: string[]` — códigos de plataforma actualmente conectados (ej.
    `["facebook","instagram"]`).
  - `displayNames: [{ platform: string, username?: string }]` — se usa para sacar el `username` de cada
    red y guardarlo como `handle` en `SocialAccount`.
- **Qué hace con esos datos** (todo local, sin más llamadas a Ayrshare):
  1. Carga el catálogo `SocialNetwork` (`prisma.socialNetwork.findMany`) e indexa por `code`.
  2. Por cada código en `activeSocialAccounts` que exista en el catálogo: `upsert` de `SocialAccount`
     (`brandId` + `socialNetworkId`) con `active: true` y `handle` = el `username` correspondiente.
  3. Códigos que Ayrshare reporta pero no están en el catálogo local: se ignoran + se loguea un `warn`
     (el Admin todavía no dio de alta esa red en `catalogs/social-networks`).
  4. `SocialAccount` locales que estaban `active: true` pero ya no aparecen en `activeSocialAccounts`:
     se marcan `active: false` (no se soft-deletean — desconectar no es "borrar el registro").
- **Se llama**: a demanda, vía `POST /brands/:brandId/social-accounts/sync` (ver abajo). No hay
  webhook — Ayrshare solo ofrece eso en plan Premium + URL pública, inviable en local.

## Detalle técnico: los endpoints de nuestra API (core-service)

### `Brands` — `apps/backend/services/core-service/src/brands/`

Guards en todos: `JwtAuthGuard` + `PermissionGuard` (módulo `marcas`); `BrandAccessGuard` además en las
rutas con `:id`.

| Método | Ruta | Permiso | Body | Respuesta |
|---|---|---|---|---|
| GET | `/brands` | `marcas:ver` | — | `BrandResponse[]` (admin ve todas; el resto solo las suyas o de campañas donde participa) |
| GET | `/brands/:id` | `marcas:ver` | — | `BrandResponse` |
| POST | `/brands` | `marcas:crear` | `{ name, slug, profileType?, logoUrl?, primaryColor?, allowedSocial: string[] }` | `BrandResponse & { connectUrl: string }` |
| PATCH | `/brands/:id` | `marcas:editar` | cualquier subconjunto de `{ name, slug, profileType, logoUrl, primaryColor }` | `BrandResponse` |
| DELETE | `/brands/:id` | `marcas:eliminar` | — | `BrandResponse` (soft delete, `deletedAt` seteado) |

`BrandResponse` = todos los campos de `Brand` **excepto** `refId` y `profileKey` (fix del problema #5) —
esos 2 son internos de la integración con Ayrshare y nunca salen de `core-service` hacia el cliente.

### `Social accounts` — `apps/backend/services/core-service/src/social-accounts/` (nuevo)

Guards: `JwtAuthGuard` + `PermissionGuard` + `BrandAccessGuard` (mismo criterio que `Brands`, valida que
el usuario sea dueño de la marca o CM/Diseñador de una campaña de esa marca).

| Método | Ruta | Permiso | Body | Respuesta |
|---|---|---|---|---|
| GET | `/brands/:brandId/social-accounts` | `marcas:ver` | — | `SocialAccount[]` (incluye `socialNetwork`), leído solo de la BD local, sin llamar a Ayrshare |
| POST | `/brands/:brandId/social-accounts/sync` | `marcas:editar` | — | mismo shape que el `GET`, después de sincronizar contra Ayrshare (ver punto 4 de arriba) |

`POST /sync` responde `400 Bad Request` si la marca todavía no tiene `profileKey` (nunca completó
`POST /brands` con éxito) y `404` si el `brandId` no existe.

## Bug adicional encontrado durante las pruebas (no estaba en la revisión original)

`turbo.json` tiene un allowlist (`globalEnv`) de env vars que `pnpm dev`/`dev:backend` pasa a las tareas.
No incluía las 4 vars de Ayrshare, así que **aunque estuvieran bien puestas en `.env`, Turborepo las
filtraba en silencio** y `core-service` arrancaba sin ellas. Se agregaron al `globalEnv`. Sin este fix,
`POST /brands` habría fallado con 500 pase lo que pase en `.env`.

## Pruebas realizadas (backend real + Ayrshare real, no mocks)

1. Login admin → `POST /brands` con `allowedSocial` → devuelve `connectUrl` real, sin `refId`/`profileKey`.
2. `GET /brands/:id` → confirma que tampoco expone esos campos ahí.
3. `allowedSocial: []` → `400` con mensaje de validación.
4. Env var de Ayrshare vacía → `500` (antes `400`).
5. **Rollback real**: se forzó un dominio inválido para que `generateJWT` fallara después de crear el
   perfil → se confirmó que la marca queda soft-deleteada y que el perfil se borró de verdad en Ayrshare
   (se liberó la cuota de perfiles de la cuenta — se pudo crear otro después sin el error de "máximo de
   perfiles").
6. `POST /brands/:id/social-accounts/sync` y `GET /brands/:id/social-accounts` corren sin error contra la
   API real (devuelven `[]` cuando no hay redes conectadas todavía).

Nota al pasar: se encontró y cerró un proceso `nest --watch` de `auth-service` huérfano de una sesión
anterior (arrancado el 2026-07-29 a las 23:07, sin terminal asociada) que ocupaba el puerto 3001 con
código viejo — no relacionado al trabajo de hoy, solo limpieza de entorno.

## Qué queda pendiente (fuera de este alcance, documentado a propósito)

- **Tests automatizados** del flujo de Ayrshare (mock de `fetch`) — se decidió validar manualmente en su
  lugar.
- El endpoint de sync es *pull* (hay que llamarlo a propósito). Si en algún momento se sube a un plan
  Premium de Ayrshare con una URL pública, se podría agregar el webhook `action: "social"`
  (`type: link/unlink/refresh`) como alternativa a demanda — la investigación de esa API ya quedó hecha
  en esta sesión por si se retoma.
- `DELETE /brands/:id` (borrado normal, no el rollback) sigue sin limpiar el perfil de Ayrshare asociado
  — no estaba en el alcance de esta revisión, pero es la misma clase de gap que el problema #4.

## Configuración agregada para este proyecto

- `.vscode/mcp.json` — conecta el MCP de documentación de Ayrshare (solo lectura, busca en sus docs) a
  VS Code / Claude Code para consultas futuras sobre su API sin tener que adivinar endpoints.

## Archivos tocados

```
.env.example
turbo.json
apps/backend/services/auth-service/src/auth/auth.service.ts
apps/backend/services/core-service/src/app.module.ts
apps/backend/services/core-service/src/brands/brands.service.ts
apps/backend/services/core-service/src/brands/dto/create-brand.dto.ts
apps/backend/services/core-service/src/brands/ayrshare.util.ts          (nuevo)
apps/backend/services/core-service/src/social-accounts/                (nuevo)
apps/backend/services/core-service/prisma/migrations/20260730033241_.../ (renombrada)
docs/backend/bananagram-backend.postman_collection.json
.vscode/mcp.json                                                        (nuevo)
```
