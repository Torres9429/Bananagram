# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Contexto global — Gestor de Redes Sociales y Puntuación Digital

Stack: Next.js (MFE host, Multi-Zones) + NestJS (microservicios) + PostgreSQL + Prisma + Turborepo + pnpm

## Reglas críticas
- NUNCA hardcodear permisos: viven en `role_permissions` (BD)
- NUNCA borrar registros físicamente: usar `deleted_at` (soft delete)
- NUNCA exponer `OPENROUTER_API_KEY` al frontend
- El creador de una publicación NO puede aprobarla (validar backend, no solo frontend)
- `post_status_history` y `audit_log` son INMUTABLES (solo insert)

## Privilegios dinámicos
- Decorator: `@RequirePermission('módulo', 'acción')` en controllers de NestJS
- Guard: `PermissionGuard` lee `user.permissions[module]` del JWT — **desde 2026-07-27 ya está conectado**
  (antes existía en `commons/guards/permission.guard.ts` sin usarse en ningún endpoint). **Desde
  2026-08-16 (`c867e24`) sí es lo que corre en runtime**: `commons/` volvió a ser un paquete workspace real
  (`@repo/backend-commons`) y 4 de los 5 servicios (`auth-service`, `core-service`, `alexa-service`,
  `ai-service` — este último desde que se agregó, 2026-08-18) importan `PermissionGuard`/`RequirePermission`
  de ahí en vez de duplicarlo localmente — detalle completo en la sección `commons/` bajo Arquitectura →
  Backend, más abajo.
- Módulos del catálogo (`commons/types/modules.enum.ts` + `packages/seed/src/index.js`): `marcas`,
  `publicaciones`, `calendario`, `campanas`, `metricas`, `score`, `reportes`, `usuarios`, `privilegios`,
  y `catalogos` (agregado 2026-07-27 — los 3 catálogos no encajaban en ninguno existente).
- Endpoint: `GET /me/permissions` → fuente de verdad del menú frontend
- Hook: `usePermissions()` (`apps/frontend/commons/src/hooks/usePermissions.ts`) → `can(module, action)` / `canAny(module, actions)`
- **Regla de autoridad (auditoría final, 2026-08-19/20)**: `can(module, action)` es la ÚNICA fuente de
  capacidad; ownership/relación (`cmId===user.id`, `brand.ownerId===user.id`, etc.) es la única fuente de
  alcance de recurso. Un check crudo por nombre de rol (`role==='cliente'`, `roles.includes('disenador')`)
  en frontend o backend es un bug — **salvo 2 excepciones documentadas, no generalizar a una tercera sin
  confirmarlo antes con el usuario**:
  - `isAdmin` en los Sidebars (colapsa el menú a solo Dashboard+Admin) — es simplificación de UX para el
    superusuario, no una restricción de acceso (Admin ya tiene el permiso máximo en todo).
  - `canUseAlexaSkill`/`auth.service.ts.createLinkCode` (Cliente/Diseñador/Administrador) — no existe
    ningún permiso `alexa:*` en el catálogo de 10 módulos; el backend también autoriza por rol crudo ahí,
    así que generalizar solo el frontend crearía un desfase real con el backend.
- **`/internal/*` (auth-service↔core-service) — `InternalAuthGuard`+`INTERNAL_SERVICE_SECRET`
  (2026-08-19)**: compara el header `X-Internal-Token` contra `process.env.INTERNAL_SERVICE_SECRET`, falla
  cerrado si la variable no está configurada. Antes esas rutas no tenían ningún guard y, al publicar el
  puerto del servicio sin restringir, eran alcanzables desde fuera del contenedor sin autenticación — el
  gateway nunca las proxea, pero eso no era la protección real. Aplicado a `UserProfilesController`
  (`core-service`) e `InternalNotificationsController` (`auth-service`); los 4 call sites reales
  (`auth.service.ts` ×2, `profile.service.ts`, `notifications-client.service.ts`) mandan el header.

## Fórmula score digital
Documentada como `Score = (Consistencia×0.30) + (Engagement×0.40) + (Frecuencia×0.30)`, pero el código real
en `apps/backend/services/core-service/src/score/score.service.ts` calcula
`Consistencia×0.30 + Engagement×0.40 + Cobertura×0.20 + Frecuencia×0.10` (4 factores, no 3). Confirmar con
el usuario cuál es la vigente antes de tocar el score.

## Alexa Skill — contrato real (2026-08-13)

`docs/skill/AlexaSkill-Diseno-Final.md` y `docs/skill/lambda-codigo-por-pasos.md` quedaron **descartados**
(diseño anterior, Lambda llamando a Claude directo) — el contrato real y vigente son las 6 funciones
documentadas en `docs/todos/2026-08-10-ayrshare-pipeline-alexa-endpoints-plan.md` (`fetchUserByLinkCode`,
`fetchCampaigns`, `fetchContentIdeas`, `fetchSavedIdeas`, `saveIdeaToBackend`, `deleteIdeaFromBackend`).
**`fetchContentIdeas` (generación de ideas dictada por voz) — implementado 2026-08-18**:
`POST alexa-service/ideas/generate` llama a `ai-service` por HTTP (mismo patrón BFF que `alexa-service` ya
usaba contra `core-service`, ver sección "AI Service" más abajo) y devuelve ideas reales. También se agregó
`GET campaigns/:id/recommendations` (`GetIdeaRecommendationsIntent`, IA cualitativa sobre métricas reales de
la campaña) — `GetCampaignSummaryIntent` deliberadamente NO usa IA, se arma con datos puros de
`GET campaigns/:id/metrics` (decisión explícita). El único intent de voz sin mapeo backend hoy es
`GetTopContentIntent` con filtro por red/periodo (`docs/skill/backend-api-reference.md` §3-quater). El
pipeline real de Ayrshare (publish + métricas) ya
se verificó en vivo, publicando de verdad en Instagram — detalle de los 5 bugs reales encontrados y
arreglados en ese mismo documento, sección "Fase P1".

## AI Service — OpenRouter (2026-08-18)

`apps/backend/services/ai-service` (puerto 3005, `@repo/ai-service`) es el **único** punto del backend que
habla con OpenRouter — ningún otro servicio ni el frontend lo hace directo. Sin base de datos propia (el
primer servicio backend sin Prisma) — es stateless, no persiste nada de lo que genera. Sigue exactamente
las convenciones de `alexa-service` (mismo esqueleto `main.ts`/`app.module.ts`/`auth/jwt-auth.module.ts`,
mismo patrón de `JwtAuthGuard`+`PermissionGuard` de `@repo/backend-commons`), con un único dominio flat
`src/ai/` (sin envoltorio `modules/`, homologado a propósito con el resto del backend).

**Endpoints reales** (proxeados por el gateway en `/api/ai/*`, sin permiso nuevo en el catálogo — se
reutilizan módulos/acciones ya existentes, mismo criterio que `alexa-service/ideas.controller.ts` con
`campanas`):
- `POST ai/generate-ideas` — `campanas:crear`. Contexto libre (marca/categoría/audiencia/tono), sin
  `postId`/`campaignId` obligatorio.
- `POST ai/analyze-post` — `publicaciones:ver` (de solo lectura, para que el Cliente pueda analizar sin
  poder editar). Recibe solo `postId` — el contenido/imagen real se piden a `core-service`
  (`CoreServiceClient.fetchPostContext`, reenviando el Bearer del caller) para no confiar en un caption
  arbitrario del body ni reimplementar las reglas de pertenencia de `posts.service.ts`.
- `POST ai/improve-post` — `publicaciones:editar` (sí propone una reescritura). Mismo mecanismo de
  `postId` que `analyze-post`. Nunca sobrescribe el post — el frontend precarga la propuesta en el
  formulario de edición existente, el usuario le da "Guardar" él mismo.
- `POST ai/suggest-caption` — `publicaciones:crear`. Sin `postId` (la publicación no existe todavía, es
  para `/posts/new`); las imágenes van como data URL base64, no URLs de Cloudinary (los archivos son
  locales en ese punto del flujo).

**CTA retirado del todo (2026-08-19)**: `analyze-post` ya no devuelve `ctaAnalysis`, `improve-post` ya no
devuelve `suggestedCta` ni acepta `action: 'cta'` (`ImprovePostAction` quedó en `mejorar`/`variantes`/
`hashtags`/`adaptar`) — decisión explícita, no una limitación técnica. Los system prompts de OpenRouter ya
no piden esos campos.

**UI de IA en `posts-front`** (rediseñado 2026-08-19): ya no son diálogos modales — `/posts/[id]`
(`AnalyzePostDialog`/`ImprovePostDialog`, retirados) usa `AiAssistantSection` (`Accordion` de MUI con tabs
"Analizar"/"Mejorar") debajo de la card principal; `/posts/new` (`SuggestCaptionDialog`, retirado) usa
`SuggestCaptionPanel` en una sección inline (`Collapse`) que se abre/cierra con el mismo botón "Sugerir con
IA", debajo del campo "Contenido" — en ambos casos, en la misma pantalla que el formulario, para poder
comparar/editar sin que un modal tape el contenido. **Ninguno dispara la petición a OpenRouter solo al
abrirse** — "Analizar" (antes auto-disparaba al expandir) ahora requiere el botón "Analizar publicación"
también, mismo criterio que ya tenían "Mejorar"/"Sugerir" (nunca gastar una llamada sin que el usuario la
pida explícitamente). Visibilidad sigue el
estado del post, no solo el permiso: "Analizar" y "Mejorar" solo aparecen mientras la publicación sigue en
el flujo de revisión (nunca en estados post-publicación) y solo a quien la tiene "en su cancha" en ese
momento (Diseñador en `borrador`/`rechazado` → CM en `en_revision` → Cliente en `aprobado` → CM en
`rechazado_cliente`) — mismo criterio de ownership por status que ya usan `canEditNow`/los botones de
aprobar-rechazar existentes, no una regla nueva. **El CM ya no necesita rechazar la publicación primero
para poder editarla/mejorarla con IA mientras la tiene en `en_revision`** (fricción real reportada,
corregida 2026-08-19): `posts.service.ts.updatePost` ahora permite `EN_REVISION` además de
`BORRADOR`/`RECHAZADO`/`RECHAZADO_CLIENTE`, solo para el CM (mismo criterio que ya aplicaba a
`RECHAZADO_CLIENTE` — el status no cambia, es edición aparte de aprobar/rechazar). Media (adjuntar/quitar
archivos) sigue restringida a `borrador`/`rechazado` únicamente, sin cambios. De paso se corrigió un bug
real preexistente: el botón "Editar" solo se mostraba con `canEditNow`, nunca con `canEditRechazadoCliente`
— el CM no tenía forma de entrar al formulario de edición durante `rechazado_cliente` pese a que esa lógica
(nota para el Diseñador, "Guardar y reenviar al Cliente") ya existía asumiendo que sí se podía.

**Modelo**: `OPENROUTER_MODEL` es 100% configurable por env var (ver `.env` de `ai-service`, sin valor
hardcodeado en código) — el catálogo de modelos gratis (`:free`) de OpenRouter cambia seguido, verificar el
vigente en `openrouter.ai/models` antes de asumir que el que está en `.env.example` sigue existiendo.

**Bug real encontrado y corregido en vivo (2026-08-18)**: el circuit breaker (`createCircuitBreaker` de
`@repo/backend-commons`) solo envolvía el `fetch()` inicial, no el `response.json()` posterior — `fetch()`
resuelve en cuanto llegan los headers, no cuando termina de bajar el body, así que una respuesta lenta
podía colgarse minutos sin que el timeout configurado cortara nada. Mismo hallazgo aplicado también a
`core-service/src/integrations/ayrshare/ayrshare.service.ts` (`publish`/`getAnalytics`/`getAccountMetrics`)
— un post quedó marcado `error` a los 60.0s exactos mientras Ayrshare seguía publicando de verdad en
segundo plano. En ambos servicios, `fetch()`+`response.json()` ahora van juntos dentro de la misma acción
del breaker.

**Bug real encontrado y corregido en vivo (2026-08-19)**: `main.ts` creaba la app sin configurar el límite
del body parser — el default de Express/`body-parser` (100kb) rechazaba cualquier imagen adjunta a
`POST ai/suggest-caption` con `PayloadTooLargeError: request entity too large`, aunque `SuggestCaptionDto.
images` ya declaraba soportar hasta 3 imágenes de ~3MB cada una (`@MaxLength(3_000_000)`) — el transporte
nunca coincidió con lo que el propio DTO decía aceptar. Fix: `app.useBodyParser('json', { limit: '12mb' })`
en `main.ts` (Nest 10, API soportada — no hace falta desactivar+reemplazar el parser default a mano). **El
cap de 3MB por imagen resultó ser insuficiente para fotos reales de celular** (confirmado el mismo día con
una foto real de un usuario) — subido a `@MaxLength(8_000_000)` (~6MB de binario real por imagen) y el
límite del body parser a `28mb` para dar margen sobre 3 imágenes a ese tamaño.
Además, ninguna de las 5 DTOs de `ai-service` tenía mensajes `message:` en español en sus decoradores de
`class-validator` — cualquier error de validación (no solo el de payload) llegaba al frontend en inglés.
Las 5 DTOs (`suggest-caption`, `analyze-post`, `improve-post`, `generate-ideas`, `campaign-recommendations`)
ahora tienen mensajes en español en todos sus decoradores. Nuevo `PayloadTooLargeFilter`
(`src/common/payload-too-large.filter.ts`, registrado como `APP_FILTER` en `app.module.ts`) traduce
específicamente el error de `raw-body` (detectado por `err.type === 'entity.too.large'`, no por texto) a un
413 con mensaje en español — **extiende `BaseExceptionFilter` y delega con `super.catch()`** para cualquier
otro error (nunca `throw exception`: eso NO reengancha con el manejo de excepciones de Nest y tumbó el
proceso entero en el primer error de validación normal durante el desarrollo de este fix — por eso se
registra vía `APP_FILTER`, no `app.useGlobalFilters(new ...)`: `BaseExceptionFilter` necesita
`HttpAdapterHost` inyectado por Nest para que `super.catch()` funcione, y una instancia creada a mano con
`new` nunca pasa por el contenedor de DI).

## Estado real del código — léase antes de asumir que algo "ya funciona" (actualizado 2026-08-14)

El proyecto dejó de ser un scaffold: los 5 servicios de backend (el 5º, `ai-service`, agregado el
2026-08-18) y la mayoría del frontend (login, publicaciones, campañas, métricas/score, notificaciones en
vivo, Alexa Skill, IA generativa) están conectados de punta a punta. Lo mock/stub es ahora la excepción
puntual, no la regla — detalle exhaustivo en `.claude/INVENTORY.md` §0; resumen abajo.

- **Los 4 servicios de backend tienen dominio real conectado**, incluido `alexa-service`: sus módulos
  `campaigns`/`ideas` **ya no son stubs** — `ideas` es dueño único de ese dominio en todo el sistema
  (se movió de `core-service`), con acceso directo (no HTTP) a la tabla `ContentIdea` de la BD física de
  `core-service` vía su propio `prisma/schema.prisma` (nunca migra desde ahí). `posts` en `core-service`
  tiene controller/service/module completo (13 endpoints, máquina de estados de 11 valores) más un
  scheduler de publicación por temporizadores de evento (ya no sondeo `@Cron`). Score/métricas ya tienen
  controller HTTP (`GET /brands/:id/score[-history]`, `/campaigns/:id/metrics[-history]`, con refresh
  manual). Notificaciones son reales de punta a punta, incluido un stream SSE en vivo
  (`GET me/notifications/stream`).
- **IA generativa real, vía OpenRouter** (`ai-service`, ver sección propia arriba): generación de ideas,
  análisis de publicaciones, mejora de captions y sugerencia de descripciones — los 4 conectados de punta a
  punta en `posts-front`/`brands-front`. `fetchContentIdeas` (la voz de Alexa) sigue siendo la única puerta
  de IA sin conectar, ver sección "Alexa Skill" arriba.
- **Sigue faltando de verdad**: generación real de reportes (`POST /reports` solo registra la solicitud,
  `fileUrl` queda `null`), `auth-front`'s `ActivateForm` (huérfano — el flujo de activación por email ya no
  corresponde a como `admin/users.controller.ts` crea usuarios hoy, activos de inmediato; nada lo enlaza ya
  desde `LoginForm`), `brands-front` `/profile/calendar` y el árbol legacy
  `/brands/[id]/{metrics,score,reports,calendar}`, y algunos widgets de `analytics-front` como `EmptyState`
  honesto por falta de dato nativo. **Ya NO son mock** (corregido 2026-08-19/20, no repetir este trabajo):
  `auth-front`'s `RegisterForm` (registro real contra `POST auth/register`, sin catálogo de
  categorías/especialidades — se completan después vía `PATCH me/profile`, ya autenticado), `TopBar`'s
  logout (`POST auth/logout` real antes de limpiar la sesión local), y `admin-front`'s `/users`/`/roles`/
  `/audit-log` + `web-shell`'s `DashboardAdmin` (los 4 conectados a datos reales, incluido un
  `GET admin/audit-log` nuevo). Lista completa (con matices por componente) en `.claude/INVENTORY.md` §0 —
  **ojo**: esa sección todavía describe varias de estas cosas como mock, quedó desactualizada por este
  trabajo; confía en este párrafo sobre esa sección hasta que se actualice a fondo.
- **El gateway ya proxea de verdad**: `/api/auth/*`, `/api/me/*`, `/api/admin/*` → `AUTH_SERVICE_URL`;
  `/api/catalogs/*`, `/api/brands/*`, `/api/campaigns/*`, `/api/cm-team/*`, `/api/posts/*`,
  `/api/reports/*` → `CORE_SERVICE_URL`; **`/api/ideas/*` → `ALEXA_SERVICE_URL`** (no core-service — el
  dominio de ideas se mudó entero ahí, ver arriba); **`/api/ai/*` → `AI_SERVICE_URL`** (agregado
  2026-08-18, sin bug conocido de env var faltante en `docker-compose.yml` — sí se agregó ahí, a diferencia
  de `ALEXA_SERVICE_URL`, ver el bug de abajo). `main.ts` crea la app con `{ bodyParser: false }` —
  necesario para que `http-proxy-middleware` reciba el stream del body sin consumir (si Nest lo parseara
  antes, los POST/PATCH llegarían vacíos al servicio destino). Montado con
  `app.use(createProxyMiddleware(...))` **sin** pasar el path como argumento de `app.use()` — Express
  recorta ese prefijo de `req.url` antes de pasarlo al middleware si se hace así, rompiendo el proxy; se
  usa `pathFilter` en su lugar, que matchea sobre la URL completa sin tocarla. `/api/internal/*` (tráfico
  servicio-a-servicio: auth-service↔core-service, protegido por `InternalAuthGuard`+`INTERNAL_SERVICE_SECRET`,
  ver más abajo) **no** se proxea a propósito. **Ya corregido (2026-08-19)**: el override de
  `docker-compose.yml` para `api-gateway` ahora sí incluye `ALEXA_SERVICE_URL: http://alexa-service:3004`
  (junto con `AI_SERVICE_URL`) — `/api/ideas` resuelve bajo el perfil `full` containerizado.
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
pnpm dev:backend                # solo los 4 microservicios + gateway
pnpm dev:web                    # solo web-shell
pnpm dev:frontend               # web-shell + los 5 microfrontends

pnpm build                     # turbo run build (respeta grafo de dependencias)
pnpm test                      # turbo run test
pnpm lint                      # turbo run lint
```

- No hay `jest.config.js` ni `.eslintrc` explícitos en el repo — `test`/`lint` corren `jest`/`eslint` con configuración por defecto de cada paquete cuando existan. `apps/frontend/*` no tienen script `lint` propio todavía; no asumas que `pnpm lint` cubre todo.
- Para correr un solo servicio backend: `pnpm --filter @repo/auth-service dev` (o `test`/`build`). Nombres de paquete backend: `@repo/auth-service`, `@repo/core-service`, `@repo/alexa-service`, `@repo/ai-service`, y el gateway (sin nombre `@repo/` explícito, revisar `apps/backend/gateway/package.json`).
- Para un solo frontend: `pnpm --filter @repo/web-shell dev` (equivalentes: `admin-front`, `analytics-front`, `auth-front`, `brands-front`, `posts-front` — cada uno con su propio puerto fijo, ver abajo).
- Tests de integración backend viven en `apps/backend/test/*.spec.ts` (no dentro de cada servicio) y usan `apps/backend/test/helpers/auth.helper.ts` (JWT de prueba por rol) y `db.helper.ts` (limpieza de tablas). Paquete propio `@repo/backend-integration-tests` (`jest`+`ts-jest`, agregado 2026-07-27 — antes no existía ni `package.json` ahí, los specs no se ejecutaban nunca): `pnpm --filter @repo/backend-integration-tests test` (necesita `docker compose up -d postgres`). Tests e2e cross-servicio en `apps/e2e/src/*.e2e.spec.ts` (paquete `@repo/e2e`, usa `supertest`) siguen siendo placeholder.
- `docker compose --profile full up -d --build` levanta el stack completo containerizado (todos los servicios + fronts); el modo diario (`docker compose up -d`, sin profile) solo levanta `postgres` + `adminer` y se espera correr el resto con `pnpm dev` en el host.
- **Bug real corregido en vivo (2026-08-20)**: los 10 Dockerfiles que corren `pnpm exec turbo run build` (los 6 frontends + `auth-service`/`core-service`/`alexa-service`/`ai-service` — `api-gateway` no usa turbo, no aplica) copiaban `package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc` pero nunca `turbo.json` — Turbo fallaba con "Could not find turbo.json" dentro del contenedor aunque el archivo sí existiera en el repo. Ahora la línea `COPY` incluye `turbo.json`. Bug independiente pero relacionado: `.dockerignore` excluía `apps/frontend` (comentario viejo: "Backend Docker build context = repo root", escrito cuando solo el backend construía desde la raíz) — como todos los servicios (backend y frontend) usan `context: .` en `docker-compose.yml`, esa exclusión le vaciaba el contexto a los 6 Dockerfiles de frontend. Ya se quitó esa exclusión; `.dockerignore` es compartido por ambos contextos ahora.

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
| ai-service                    | 3005   |
| postgres (host)                   | 5433   |
| adminer                              | 8080   |

---

## Arquitectura

### Backend: microservicios NestJS detrás de un gateway

`apps/backend/`
- `gateway/` — único punto de entrada HTTP externo (puerto 4000). Usa `http-proxy-middleware` para enrutar a cada servicio; también aplica `CorrelationIdMiddleware` (propaga `X-Request-ID`) a todas las rutas.
- `services/{auth,core,alexa,ai}-service/` — un microservicio NestJS por dominio. `core-service` fusiona lo que antes eran brands/content/analytics-service (marcas, campañas, publicaciones, medios, métricas, score, reportes) en un solo servicio; `alexa-service` es el BFF de la Alexa Skill. **Ideas de contenido (`ContentIdea`) se mudó entera a `alexa-service`** (antes vivía en `core-service`) — `alexa-service` no tiene una base de datos propia que migre, pero **sí tiene su propio `prisma/schema.prisma`** (solo el modelo `ContentIdea`) con acceso directo de lectura/escritura a la misma base física de `core-service` (`gestor_redes_core`), nunca corre `prisma migrate` desde ahí (core-service sigue siendo el dueño de esa migración). Para todo lo demás (campañas, marcas, métricas, score, account-linking) `alexa-service` sí es un BFF puro por HTTP contra `core-service`/`auth-service`. `auth-service` y `core-service` cada uno con su propio `main.ts`/puerto/Dockerfile/`package.json`, y **desde 2026-07-23 cada uno con su propio `prisma/schema.prisma` y su propia base de datos** (`gestor_redes_auth`/`gestor_redes_core`, ver `docs/base/modelo2.txt`) — ya no hay schema ni BD compartida entre ellos. Cada uno genera su Prisma Client con `output` propio (`node_modules/.prisma-client`, ver comentario en su `schema.prisma`) para evitar que pnpm resuelva ambos al mismo folder por compartir versión de `@prisma/client`. `ai-service` (agregado 2026-08-18) es el único de los 5 **sin base de datos propia** (stateless, no persiste nada de lo que genera con OpenRouter) — un solo dominio flat `src/ai/` (sin `modules/`, homologado a propósito con el resto), ver sección "AI Service" más arriba para el detalle de endpoints/permisos.
- `commons/` — **desde el 2026-08-16 (`c867e24`), de nuevo un paquete workspace real** (`@repo/backend-commons`, `package.json`+`tsconfig.json`+`dist/`, un único barrel `src/index.ts` sin subpaths — la resolución clásica de módulos que usa `tsconfig.base.json` de backend no resuelve de forma confiable un `exports` map con subpaths). Antes de esa fecha había quedado huérfano (nada lo importaba; ver histórico más abajo) — hoy `auth-service`, `core-service`, `alexa-service` y `ai-service` (este último desde 2026-08-18) lo declaran como dependencia y lo importan de verdad (`import { X } from '@repo/backend-commons'`), ya no por path relativo. Ya **no** incluye Prisma (el schema único se eliminó junto con la separación de bases, 2026-07-23):
  - `guards/` — `JwtAuthGuard` (reescrito al revivir el paquete: ya **no** usa passport-jwt, verifica RS256 contra el JWKS remoto de `auth-service` vía `jose`) + `TokenDenylistService`, compartidos entre `core-service`, `alexa-service` y `ai-service` (verificadores idénticos, sin firmar nunca); `auth-service` mantiene su propia copia local (`src/guards/jwt-auth.guard.ts`) porque es el emisor del JWT, no un verificador remoto — esa no se comparte. `PermissionGuard` sí se comparte entre esos mismos 4 servicios (antes se duplicaba localmente en cada uno, criterio abandonado con el commit `c867e24`). `BrandAccessGuard` sigue sin vivir aquí — sigue en `core-service/src/guards/`, ver nota de `brandIds` arriba.
  - `decorators/` — `@CurrentUser()`, `@RequirePermission(module, action)` — compartidos entre esos mismos 4 servicios
  - `interceptors/` — `LoggingInterceptor` (exportado, pero sin importadores reales todavía — ningún `main.ts` lo registra global). `AuditInterceptor` **sí está implementado y registrado** en `auth-service`/`core-service` (`app.useGlobalInterceptors(new AuditInterceptor(writeAuditEntry))`, ver sus `main.ts`) — agnóstico de Prisma a propósito (cada servicio inyecta su propia función de escritura contra su propio cliente), audita todo método mutante (`POST/PUT/PATCH/DELETE`), redacta claves sensibles (`password/token/secret/apikey/privatekey`) antes de guardar el body de respuesta.
  **`performedBy` — corregido 2026-08-20**: antes era `req.user?.sub` (UUID crudo, ilegible en
  `/audit-log`) con `'anonymous'` fijo para login/register/refresh (nunca hay `req.user` en ese punto de la
  request). Ahora es `req.user?.email` — mismo payload del JWT, ya trae `email` — y para
  login/register/refresh decodifica (sin verificar firma, es el token que el propio servicio acaba de
  firmar en esta misma request, solo para loguear) el `email` del `accessToken` recién emitido en la
  respuesta, en vez de mostrar `'anonymous'` siempre. Filas ya escritas antes de este fix no se reescriben.
  **Bug real corregido en vivo (2026-08-19)**: `AuditEntryInput.recordId` siempre fue `string | null` (a propósito — no toda acción mutante tiene un recordId natural, ej. `POST /auth/login`), pero `AuditLog.recordId` en ambos `schema.prisma` era `String` no-nullable — cualquier acción sin `:id` en la ruta ni `.id` en la respuesta fallaba en silencio al escribir (atrapado y solo logueado como `WARN`, nunca rompía la request real, pero el audit trail quedaba vacío; en `auth-service` esto significaba que **ningún** login se auditaba nunca). Ambos schemas pasaron a `recordId String?` (migración `audit_log_record_id_nullable` en los 2 servicios).
  - `filters/` — `HttpExceptionFilter` (exportado, mismo caso que `LoggingInterceptor`: sin registrar globalmente todavía)
  - `circuit-breaker/` — factory de `opossum` para llamadas REST entre servicios (ADR-0003, sin mensajería async); esta versión ya trae el fix de import CommonJS (`import CircuitBreaker = require('opossum')`, `opossum` es CJS puro) que antes solo tenía la copia local de `core-service` — usado por `AyrshareService`/`NotificationsClient`/`ai-service`'s `OpenRouterClient`. **Ojo con un gotcha real (2026-08-18)**: envolver solo el `fetch()` en el breaker no basta — `fetch()` resuelve en cuanto llegan los headers, no cuando termina de bajar el body, así que el `response.json()` posterior queda sin protección de timeout si se hace fuera de la acción del breaker (causó un post marcado `error` en `core-service` mientras Ayrshare seguía publicando de verdad en segundo plano). `fetch()`+`response.json()` deben ir juntos dentro de la misma acción.
  - `types/` — enums compartidos (`Roles`, `Modules`, `Actions`) y `JwtPayload`. `PostStatus` **no** se migró — `core-service` mantiene su propia copia local con los 11 valores reales (la vieja versión de `commons/` solo tenía 6, desactualizada)

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
- `commons/` (paquete `@repo/ui`, workspace real con subpath exports reales: `@repo/ui`, `@repo/ui/ui`, `@repo/ui/theme`, `@repo/ui/state`, `@repo/ui/types`, `@repo/ui/config`, `@repo/ui/utils`) — a diferencia de `commons/` del backend, que expone un único barrel sin subpaths (ver arriba), este sí los usa.
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
