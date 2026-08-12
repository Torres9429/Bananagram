# Pipeline real de Ayrshare (publish + métricas) + endpoints backend para la Alexa Skill

> Plan guardado para implementación posterior. No ejecutado todavía.

## Contexto

La skill de Alexa se construye por fuera (equipo externo, Lambda ya en desarrollo contra un contrato
propio: `fetchUserByLinkCode`, `fetchCampaigns`, `fetchCampaignByName`, `fetchContentIdeas`). La skill
**solo consume cosas de nuestro backend** — no tiene persistencia propia relevante para esto: las ideas de
contenido únicamente se generan por voz (no hay forma de generarlas desde la plataforma web), así que
deben guardarse en nuestro Postgres (`ContentIdea`) para que la app web pueda mostrarlas y borrarlas
después — pero la lógica de esa persistencia vive enteramente en `alexa-service`, no en `core-service`
(ver decisión 6 más abajo: `core-service` solo aporta la base de datos física, ningún código). Lo único
que corresponde a este plan es construir, del lado de Bananagram, los endpoints con los que ese Lambda se
conecta — y, en paralelo, resolver que las métricas de campaña vengan de Ayrshare de verdad, no del
simulador (`decay-simulator.ts`), porque Ayrshare se integró específicamente para eso.

Una auditoría técnica ya existente (`docs/backend/auditoria-integracion-ayrshare.md`, 1090 líneas, leída
completa) ya resolvió casi todo el diseño de la parte de Ayrshare: dónde vive el módulo, qué campos de
Prisma faltan, cómo reescribir el scheduler, mappers por red, fórmula de engagement corregida, diseño del
endpoint de métricas por campaña con las queries SQL concretas. Un agente de diseño (Plan) más una
verificación directa del código confirmaron que el estado real hoy es más avanzado de lo que decía esa
auditoría en algunos puntos (`posts` ya tiene controller/service parcial, `media`/Cloudinary ya existe,
`campaigns`/`reports`/`ideas` ya son CRUD real, el gateway ya proxea todos esos prefijos) y sigue exacto en
lo más importante: **los cron de publicación/métricas nunca están registrados — no corren, ni simulan nada
hoy** — y no existe ninguna llamada real a Ayrshare para publicar o pedir analíticas.

También existe un documento interno "final" (`docs/skill/AlexaSkill-Diseno-Final.md`) que propone un
diseño distinto para el account-linking (OAuth2 contra `auth-service` en vez de LinkCode) — **esa parte
queda descartada para este plan**: el usuario confirmó que el contrato que gobierna el account-linking es
el que ya está usando el equipo externo del Lambda (LinkCode). En cambio, en la persistencia de ideas
(`ContentIdea`, no DynamoDB) ambos documentos coinciden con la corrección del usuario — se adopta.

Decisiones ya confirmadas con el usuario para esta fase:
1. Construir el pipeline completo de Ayrshare ahora (posts real, cron registrado, publish real, métricas
   reales, endpoint de agregación por campaña) — no una versión parcial.
2. Posts de **solo texto** por ahora — no se conecta `media`/Cloudinary al publish real todavía (la
   infraestructura ya existe, simplemente no se usa en esta fase).
3. El account-linking de Alexa sigue el contrato del equipo externo: **LinkCode** corto, de un solo uso,
   generado desde el frontend logueado, canjeado una vez por el Lambda — no OAuth2. Esto sigue siendo vía
   HTTP contra `auth-service` (base de datos separada, no afectada por la decisión 5).
4. **Corrección del usuario sobre ideas**: las ideas de contenido solo se generan desde la skill por voz —
   no existe (ni se va a construir) una forma de generarlas desde la plataforma web. Deben persistirse en
   `ContentIdea` (misma base física de Postgres que usa `core-service`). La plataforma web únicamente
   **visualiza y elimina** ideas ya generadas — nunca las crea.
5. **Corrección sobre arquitectura de `alexa-service`**: sigue siendo su propio
   microservicio, y para lo que sea genuinamente **propio de la skill** (ideas de contenido) tiene su
   propio Prisma Client apuntando a la **misma base de datos física** que `core-service`
   (`gestor_redes_core`), con lectura/escritura directa — no un BFF sobre HTTP para eso. `core-service`
   sigue siendo el único dueño del schema/migraciones; el de `alexa-service` es una copia de
   solo-generar-cliente, nunca de migrar.
6. **Corrección del usuario, acotando el alcance de la decisión 5**: "toda la lógica de la skill" se
   refiere a lo que es **exclusivo** de la skill — no a todo lo que la skill consume. `campaigns` es un
   concepto global de la aplicación (lo gestiona la web de verdad: crear, asignar equipo), no algo propio
   de la skill, así que **no** se combina con acceso directo a la BD desde `alexa-service`: se queda como
   endpoint HTTP en `core-service`, y `alexa-service` lo reutiliza (BFF normal). Lo mismo aplica a las
   métricas de campaña (Fase 5): también son un dato global (las usa `analytics-front`/`brands-front`),
   no algo exclusivo de la skill, así que `alexa-service` las consume por HTTP contra
   `GET /campaigns/:id/metrics` de `core-service`, sin Prisma propio para esto. **Resultado**: `ideas` es
   la única pieza que migra a acceso directo por Prisma en `alexa-service` (y se elimina de
   `core-service` por completo, ver Fase 6) — `campaigns`/`métricas` combinan el patrón BFF-sobre-HTTP de
   siempre, sin duplicar nada.

## Fase 0 — Migración de Prisma (aditiva)

Archivo: `apps/backend/services/core-service/prisma/schema.prisma`. Todos los campos ya están
especificados en la auditoría §2 (no inventar nombres nuevos):
- `SocialAccount`: `platformAccountId String?`, `disconnectedAt DateTime?`, `lastAuthenticatedAt DateTime?`.
- `PostSocialAccount`: `providerStatus String?`, `errorCode String?`, `retryCount Int @default(0)`,
  `lastSyncedAt DateTime?`, `submittedAt DateTime?`, `providerScheduledAt DateTime?`.
- `PostMetric`: `raw Json?`, `source String @default("simulated")`, `engagementBase String?`.
- `Brand`: `timezone String?` (nullable, fallback a un default de aplicación en código).
- Modelos nuevos `ProviderRequestLog` y `MetricSyncRun`, copiados literal de auditoría §2.

`pnpm db:generate` + `pnpm db:migrate` (solo afecta `core-service`). No toca `auth-service` en esta fase.

## Fase 1 — Patrón Strategy (`SocialProvider`) + registrar los cron jobs

Nuevo directorio `apps/backend/services/core-service/src/integrations/ayrshare/`:
- `social-provider.interface.ts` — contrato `publish(post, targets)` / `getAnalytics(socialPostId)`.
- `mock-social-provider.ts` — envuelve `simulateMetrics` de `src/metrics/decay-simulator.ts` (no se toca,
  se llama desde aquí) implementando la misma interfaz; `publish()` marca cada red `publicado` de
  inmediato con `socialPostId` fake.
- `ayrshare.module.ts` — `useFactory` resolviendo a `MockSocialProvider` o `AyrshareProvider` según
  `SOCIAL_PROVIDER=mock|ayrshare` (nueva env var, default `mock`; agregar a `.env.example` y a
  `globalEnv` de `turbo.json` — si no, Turborepo la filtra en silencio).

Modificar `apps/backend/services/core-service/src/app.module.ts`: agregar `ScheduleModule.forRoot()`
(`@nestjs/schedule`, ya está en `package.json`, nunca registrado) + un `SchedulerModule` y `CronModule`
nuevos que registren `PostSchedulerService`/`MetricsCronService` (hoy código muerto, confirmado por grep
que no están en ningún `@Module`).

## Fase 2 — Completar `posts`: aprobar/rechazar/programar/cancelar

`posts.controller.ts`/`posts.service.ts` ya existen (crear, submit-for-review, upload de media) — se
**extienden**, mismo patrón de guards que `campaigns.controller.ts` (`JwtAuthGuard`+`PermissionGuard`, sin
`BrandAccessGuard` porque `:id` no es un `brandId`; pertenencia se resuelve a mano en el service, como ya
hace `submitPostForReview`):
- `POST /posts/:id/approve` (`publicaciones:aprobar`), `POST /posts/:id/reject` (`publicaciones:rechazar`,
  requiere `comment`), `POST /posts/:id/schedule` (`publicaciones:editar`), `POST /posts/:id/cancel`
  (`publicaciones:editar`).
- El método de `schedule` agrega la validación nueva: por cada `PostSocialNetwork` del post, resolver
  `SocialAccount` de esa marca+red; si falta o está inactiva, `BadRequestException` listando qué redes
  faltan conectar. No crea `PostSocialAccount` todavía (lo hace el scheduler en Fase 4).
- DTOs nuevos: `reject-post.dto.ts` (`comment: string`), `schedule-post.dto.ts` (`scheduledAt?: string`).

Sin esto no hay posts en `PROGRAMADO` — bloquea la Fase 4 por completo.

## Fase 3 — `AyrshareService` real + mappers de métricas

En el mismo directorio `integrations/ayrshare/`:
- `ayrshare.service.ts` (implementa `SocialProvider` como `AyrshareProvider`) — reutiliza
  `getAyrshareConfig()` de `src/brands/ayrshare.util.ts` (ya existe, usado por `brands.service.ts`, no se
  reimplementa lectura de env vars). Envuelve `publish`/`getAnalytics` con `createCircuitBreaker()` de
  `apps/backend/commons/circuit-breaker/opossum.factory.ts` (primer consumidor real). Genera un
  `requestId` (uuid) antes de cada llamada y registra en `ProviderRequestLog` (Fase 0), antes y después.
- `mappers/{instagram,facebook,tiktok,x}.mapper.ts` + `mapper.registry.ts` — tabla exacta de auditoría §7,
  `null` si el campo no existe para esa red, nunca `0`.
- `engagement.util.ts` — `engagementBase = reach ?? views ?? impressions ?? null`; si no hay ninguno,
  `engagement = null` (nunca `0`), guardando cuál se usó.
- Mantener consistencia con el resto del proyecto: usar `fetch` nativo (como ya hace
  `brands.service.ts`/`social-accounts.service.ts`) en vez de agregar `@nestjs/axios` como dependencia
  nueva.

Fase 4/5 inyectan `SocialProvider` (token `'SocialProvider'`), nunca `AyrshareService` directo.

## Fase 4 — Reescribir `PostSchedulerService` (publicación real, multi-red)

`apps/backend/services/core-service/src/scheduler/post-scheduler.service.ts` — reescritura completa (no
parche, auditoría §4 es explícita en esto). Inyecta `SocialProvider` y `PrismaClient` por DI (no el
singleton importado directo que usan los cron viejos):
1. `findMany({ status: PROGRAMADO, scheduledAt: { lte: now } })`.
2. Transición a `PUBLICANDO` (`validateTransition` ya existente) + `PostStatusHistory`.
3. Re-resolver `PostSocialNetwork[] → SocialAccount[]` (por si se desconectó una red entre programar y que
   corra el cron).
4. `provider.publish(post, socialAccounts)` — una sola llamada, todas las redes.
5. Por red: `upsert` de `PostSocialAccount` (`status`, `socialPostId`, `publishedAt`, `providerStatus`,
   `errorCode`, `submittedAt`).
6. Estado agregado nuevo (`post-aggregate-status.util.ts`, función pura): todas `publicado` →
   `publicado`; todas `error` → `error`; mezcla → `parcial`; alguna `publicando` → se queda `publicando`.
7. Actualizar `Post.status` + `PostStatusHistory` con el resultado agregado.
8. Cada post en su propio `try/catch` — un fallo no detiene el resto del batch (hoy no lo tiene ninguno de
   los dos cron).

## Fase 5 — Métricas reales + endpoint de agregación por campaña

- `apps/backend/services/core-service/src/cron/metrics-cron.service.ts` — reescritura: inyecta
  `SocialProvider`+`PrismaClient` por DI; antes de crear `PostMetric`, verifica ventana de sync (¿ya hay
  captura de este `PostSocialAccount` en las últimas N horas?); usa `provider.getAnalytics(socialPostId)`
  en vez de `simulateMetrics` directo (en modo mock el comportamiento observable es idéntico al actual);
  pasa la respuesta por el mapper correspondiente; `PostMetric.create({ ...normalizado, raw, source:
  'simulated'|'ayrshare' })`; cada iteración en su propio `try/catch`; registra la corrida en
  `MetricSyncRun`.
- `src/score/score.service.ts` — corregir el hallazgo de mayor impacto de la auditoría (§8/§21): calcular
  engagement **por red primero** antes de promediar (nunca sumar numeradores de redes con denominador
  distinto), y usar solo la **última captura** por `PostSocialAccount` (patrón `DISTINCT ON`, auditoría
  §22.9, único lugar donde se justifica `$queryRaw`) en vez de promediar todo el histórico de 30 días.
- Nuevo `src/campaigns/campaign-metrics.service.ts` — implementa el diseño completo de auditoría §22:
  última captura por `PostSocialAccount` vía `DISTINCT ON`, agregación aditiva con las reservas de
  §22.3-22.4 (nunca promediar `engagementRate`, siempre desglose `byNetwork[]`), `dataStatus`
  (`lastSyncedAt`, `partial`, `missingNetworks`, `coveragePercentage`), nombres explícitos
  `posts`/`externalDeliveries` separados.
- `campaigns.controller.ts` — nuevo `GET /campaigns/:id/metrics` (`metricas:ver`), delegando al service
  nuevo; pertenencia validada igual que el resto de `campaigns` (sin `BrandAccessGuard`, resuelto a mano).

Este endpoint es el que consumirá `alexa-service` (Fase 6) para responder con datos reales de campaña.

## Fase 6 — Endpoints backend para el Lambda de Alexa (LinkCode + ideas por Prisma + campañas/métricas por HTTP)

**Arquitectura final de esta fase (afinada en varias rondas con el profesor y el usuario)**: `alexa-service`
combina los dos patrones, cada uno donde corresponde — no hay duplicación de lógica en ningún lado:
- **`ideas`** (exclusiva de la skill, ver decisión 4/6): acceso directo por Prisma a la misma base física
  de `core-service`. Se elimina por completo de `core-service` — `alexa-service` queda como único dueño.
- **`campaigns` y sus métricas** (conceptos globales de la app, no propios de la skill): siguen viviendo
  solo en `core-service`, y `alexa-service` los consume como cualquier otro cliente, por HTTP — patrón
  BFF normal, sin acceso a Postgres para esto.
- **Account-linking**: HTTP contra `auth-service` (base de datos distinta, no compartida) — sin cambios.

### `ideas` — acceso directo por Prisma (única pieza que se mueve a la BD compartida)

Mismo cuidado que ya toman `auth-service`/`core-service` entre sí (ver
`core-service/prisma/schema.prisma:16-27`, generator con `output` propio para que pnpm no resuelva ambos
Prisma Client al mismo folder por compartir versión de `@prisma/client`):
- Nuevo `apps/backend/services/alexa-service/prisma/schema.prisma` — mismo `datasource` que core-service
  (`url = env("DATABASE_URL_CORE")`, mismo valor de env var, misma base física), con **solo** el modelo
  `ContentIdea` (su `campaignId` es una FK "tonta", sin `@relation` — mismo patrón que ya usa el proyecto
  entre bases de auth-service/core-service — así que no hace falta declarar `Campaign`/`Brand`/`User` en
  este schema para nada).
- `generator client { output = "../node_modules/.prisma-client" }` — mismo patrón que ya usan
  `auth-service`/`core-service`, evita el choque de `output` ya documentado.
- `apps/backend/services/alexa-service/package.json` — agregar `@prisma/client` + `prisma` (dev).
- **Regla dura**: `alexa-service` **nunca** corre `prisma migrate` contra esta base — solo
  `prisma generate`. La dueña del schema y de las migraciones sigue siendo `core-service` en exclusiva.
- Env var nueva en `alexa-service`: `DATABASE_URL_CORE` (mismo valor que usa `core-service`) — agregar a
  `.env.example`/`turbo.json globalEnv`.
- **Eliminar de `core-service`**: `src/ideas/ideas.controller.ts`, `ideas.service.ts`, `ideas.module.ts`,
  `dto/*.ts` de ese módulo, y su import en `app.module.ts`. **El modelo `ContentIdea` NO se borra de
  `core-service/prisma/schema.prisma`** — sigue siendo la única fuente de verdad de migraciones sobre
  `gestor_redes_core`; lo que se elimina es el código de aplicación, no la definición de la tabla.
- **Gateway** (`apps/backend/gateway/src/main.ts`): el proxy que hoy apunta `/api/ideas` → `coreServiceUrl`
  cambia su `target` a `alexaServiceUrl` — mismo prefijo de URL para el cliente, dueño distinto detrás.
- `alexa-service/src/ideas/ideas.controller.ts` pasa a ser la API real de ideas para cualquier caller
  autenticado (web o skill) — mismo `JwtAuthGuard` que ya usa hoy; agregar `PermissionGuard` replicando el
  patrón del resto del proyecto (no existe slug `ideas` dedicado en el catálogo de RBAC — usar
  `campanas:ver`/`campanas:crear`/`campanas:eliminar` como el módulo más cercano, o extender el catálogo
  con un slug `ideas` nuevo — **decisión de producto pendiente, no bloqueante**).
- **Autorización de campaña al crear/borrar una idea**: como `alexa-service` ya no tiene `Campaign` en su
  propio Prisma Client, valida pertenencia llamando por HTTP a `core-service`
  (`GET /campaigns/:id`, que ya aplica sus propios guards/reglas de ownership y responde 403/404 si no
  corresponde) **antes** de hacer el `create`/`delete` de `ContentIdea` vía Prisma directo. Es la única
  llamada HTTP que le queda a `alexa-service` para el dominio de ideas, y es deliberada: reutiliza la
  regla de negocio de pertenencia que ya vive (correcta) en `core-service`, en vez de reimplementarla.

### `campaigns` y métricas — BFF normal sobre HTTP (sin cambios de fondo, sin Prisma propio)

- `alexa-service/src/campaigns/campaigns.service.ts`/`campaigns.controller.ts` (hoy clases vacías) —
  `fetchCampaigns`/`fetchCampaignByName` llaman por HTTP a `GET /campaigns` de `core-service` (ya filtra
  por pertenencia server-side, no hay que reimplementar ese filtro en ningún lado), reenviando el
  `Authorization: Bearer` del request entrante. Mismo patrón para `fetchCampaignMetrics`, contra
  `GET /campaigns/:id/metrics` (Fase 5) — sin lógica de agregación propia en `alexa-service`.
- `apps/backend/services/alexa-service/package.json` — agregar un cliente HTTP: se recomienda `fetch`
  nativo (mismo patrón que ya usa `brands.service.ts`/`social-accounts.service.ts` de `core-service`,
  consistente con la decisión de Fase 3) en vez de sumar `@nestjs/axios` como dependencia nueva.
- Env var nueva en `alexa-service`: `CORE_SERVICE_URL` — agregar a `.env.example`/`turbo.json globalEnv`.

**Account-linking — sin cambios respecto al diseño anterior, en `auth-service`** (base de datos distinta,
`gestor_redes_auth`, no tocada por esta decisión; mismo patrón que `PasswordResetToken`,
`auth-service/prisma/schema.prisma:158-168`):
- `schema.prisma` — nuevo modelo `AccountLinkCode { id, userId, code String @unique, expiresAt DateTime,
  usedAt DateTime?, createdAt }`, relación `User.accountLinkCodes`. Código de 4 dígitos (solo números,
  no UUID completo — un PIN se dicta por voz mucho más fácil que texto alfanumérico), expira en pocos
  minutos (10).
- `auth.controller.ts`/`auth.service.ts`/`auth.repository.ts` — dos endpoints nuevos siguiendo el mismo
  patrón que `password-reset`:
  - `POST /auth/link-code` (autenticado, `JwtAuthGuard`) — genera un código nuevo para el usuario actual,
    invalida cualquier código previo no usado del mismo usuario. Lo llama el frontend (web-shell o donde
    el usuario decida vincular Alexa).
  - `POST /auth/link-code/redeem` (público, lo llama el Lambda) — recibe `{ code }`, valida
    `expiresAt`/`usedAt`, marca `usedAt`, y responde con el mismo shape que login (`accessToken` +
    `refreshToken`) reutilizando la emisión de tokens ya existente en `AuthService.login` (sin password,
    a partir del `userId` resuelto por el código) — el Lambda guarda ese `accessToken`/`refreshToken` y lo
    manda como `Authorization: Bearer` en cada llamada siguiente a `alexa-service` (que sigue validando
    el JWT con `JwtAuthGuard`, ya aplicado hoy — eso no cambia, solo cambia de dónde saca los datos después
    de validar el token).

**Gateway**: agregar `pathFilter: '/api/alexa'` → `alexaServiceUrl` en
`apps/backend/gateway/src/main.ts` (patrón de línea única ya usado para el resto) solo si el Lambda va a
golpear el gateway en vez de `alexa-service` directo (puerto 3004 hoy no proxeado). Env var nueva en
`alexa-service`: `AUTH_SERVICE_URL` (para el redeem del LinkCode, que sí sigue siendo HTTP) — agregar a
`.env.example`/`turbo.json globalEnv`.

## Explícitamente fuera de alcance

- Módulo de `media`/storage: ya existe (Cloudinary), pero el publish real de esta fase no lo usa (posts de
  solo texto, decisión ya confirmada).
- Webhooks de Ayrshare: solo polling vía los cron de Fase 4/5 (auditoría §11).
- `CampaignMetricSnapshot`, `CampaignGoal`, score de campaña separado: diferidos (auditoría §22.8/12/13).
- Frontend: no se toca código de `apps/frontend/*` en esta fase (nadie construyó todavía una pantalla de
  "mis ideas" en brands-front/posts-front). **Nota para cuando se construya**: esa pantalla futura debe
  llamar a `alexa-service` (vía gateway, mismo prefijo `/api/ideas`), no a `core-service` — el módulo ya
  no existe ahí.
- El Lambda/skill en sí: se construye aparte por el equipo externo.
- `docs/skill/AlexaSkill-Diseno-Final.md`: solo se descarta la parte de **account-linking** (OAuth2) —
  la parte de persistencia de ideas en `ContentIdea` sí se adopta, coincide con la corrección del usuario.
- Un formulario/UI de creación manual de ideas en la plataforma web: no existe hoy y no se construye —
  las ideas solo se crean desde la skill, la web únicamente lista y elimina.

## Verificación

1. Con `SOCIAL_PROVIDER=mock` (default): crear un post de texto, aprobarlo, programarlo con
   `scheduledAt` en el pasado inmediato, esperar a que corra el cron (o disparar el método manualmente en
   un test) — confirmar que `Post.status` termina en `publicado`, se crearon `PostSocialAccount` por cada
   red, y que en el siguiente ciclo del cron de métricas aparecen filas nuevas en `PostMetric` con
   `source: 'simulated'`.
2. Cambiar a `SOCIAL_PROVIDER=ayrshare` contra el trial real, con una marca que ya tenga cuentas sociales
   conectadas — repetir el flujo y confirmar en Ayrshare (dashboard) que el post se publicó de verdad, y
   que `PostMetric.source` queda en `'ayrshare'` con `raw` poblado.
3. `GET /campaigns/:id/metrics` — confirmar resumen + desglose por red, `dataStatus` presente, y que
   `engagementRate` nunca aparece combinado entre redes con denominador distinto.
4. `POST /auth/link-code` autenticado → confirmar que devuelve un código corto; `POST
   /auth/link-code/redeem` con ese código (sin JWT) → confirmar que devuelve `accessToken`/`refreshToken`
   válidos para ese usuario, y que reusar el mismo código una segunda vez falla.
5. `alexa-service`: con el `accessToken` obtenido en el paso 4, llamar al endpoint real de campañas y
   confirmar que devuelve las campañas reales del usuario, no mock — y confirmar que la respuesta vino de
   una llamada HTTP real a `GET /campaigns` de `core-service` (revisar logs/`X-Request-ID`), no de una
   consulta Prisma dentro de `alexa-service` (no debería tener acceso a `Campaign` en absoluto).
6. Crear una idea vía `POST /api/ideas` (o el path real que quede) con el `accessToken` del paso 4 →
   confirmar que la fila aparece en la tabla `content_ideas` de Postgres (Adminer/psql), y que
   `GET /api/ideas?campaignId=` la devuelve de inmediato — todo servido por `alexa-service`, no por
   `core-service`. Borrarla y confirmar que desaparece.
7. Confirmar que `core-service` ya **no** responde nada en `/ideas` (404 o ruta inexistente) — prueba de
   que el módulo quedó eliminado de verdad, no solo duplicado.
8. Confirmar que `alexa-service` nunca ejecuta `prisma migrate` (revisar que no haya ningún script que lo
   dispare) — solo `prisma generate`; cualquier cambio de schema debe seguir haciéndose desde
   `core-service` exclusivamente.
9. `pnpm --filter @repo/core-service build` y `pnpm --filter @repo/auth-service build` y `pnpm --filter
   @repo/alexa-service build` sin errores de tipo tras los cambios.
