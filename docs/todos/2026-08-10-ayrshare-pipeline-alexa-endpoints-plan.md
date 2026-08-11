# Pipeline real de Ayrshare (publish + métricas) + endpoints backend para la Alexa Skill

> Plan guardado para implementación posterior. No ejecutado todavía.

## Contexto

La skill de Alexa se construye por fuera (equipo externo, Lambda ya en desarrollo contra un contrato
propio: `fetchUserByLinkCode`, `fetchCampaigns`, `fetchCampaignByName`, `fetchContentIdeas`, con las ideas
dictadas por voz guardándose en la DynamoDB propia del Lambda). Lo único que corresponde a este plan es
construir, del lado de Bananagram, los endpoints con los que ese Lambda se conecta — y, en paralelo,
resolver que las métricas de campaña vengan de Ayrshare de verdad, no del simulador (`decay-simulator.ts`),
porque Ayrshare se integró específicamente para eso.

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
diseño distinto (OAuth2 + persistencia de ideas en `ContentIdea`) — **descartado para este plan**: el
usuario confirmó que el contrato que gobierna es el que ya está usando el equipo externo del Lambda
(LinkCode + DynamoDB propia), no el documento interno.

Decisiones ya confirmadas con el usuario para esta fase:
1. Construir el pipeline completo de Ayrshare ahora (posts real, cron registrado, publish real, métricas
   reales, endpoint de agregación por campaña) — no una versión parcial.
2. Posts de **solo texto** por ahora — no se conecta `media`/Cloudinary al publish real todavía (la
   infraestructura ya existe, simplemente no se usa en esta fase).
3. El account-linking de Alexa sigue el contrato del equipo externo: **LinkCode** corto, de un solo uso,
   generado desde el frontend logueado, canjeado una vez por el Lambda — no OAuth2.
4. Las ideas dictadas por voz se guardan en la DynamoDB del propio Lambda — el backend de Bananagram solo
   expone **lectura** de `ContentIdea` (las creadas desde la app web), nunca recibe escrituras desde
   Alexa para ideas.

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

## Fase 6 — Endpoints backend para el Lambda de Alexa (LinkCode + BFF de lectura)

**Account-linking — nuevo, en `auth-service`** (mismo patrón que `PasswordResetToken`,
`auth-service/prisma/schema.prisma:158-168`, ya existente: token corto, `userId`, `expiresAt`, `usedAt`):
- `schema.prisma` — nuevo modelo `AccountLinkCode { id, userId, code String @unique, expiresAt DateTime,
  usedAt DateTime?, createdAt }`, relación `User.accountLinkCodes`. Código corto (6-8 caracteres
  alfanuméricos, generado en el service, no UUID completo — el usuario lo puede copiar/pegar o dictar
  fácilmente), expira en pocos minutos (p. ej. 10).
- `auth.controller.ts`/`auth.service.ts`/`auth.repository.ts` — dos endpoints nuevos siguiendo el mismo
  patrón que `password-reset`:
  - `POST /auth/link-code` (autenticado, `JwtAuthGuard`) — genera un código nuevo para el usuario actual,
    invalida cualquier código previo no usado del mismo usuario. Lo llama el frontend (web-shell o donde
    el usuario decida vincular Alexa).
  - `POST /auth/link-code/redeem` (público, lo llama el Lambda) — recibe `{ code }`, valida
    `expiresAt`/`usedAt`, marca `usedAt`, y responde con el mismo shape que login (`accessToken` +
    `refreshToken`) reutilizando la emisión de tokens ya existente en `AuthService.login` (sin password,
    a partir del `userId` resuelto por el código) — el Lambda guarda ese `accessToken`/`refreshToken`
    igual que cualquier otro cliente y los manda como `Authorization: Bearer` en cada llamada siguiente.

**BFF real en `alexa-service`** (hoy `campaigns.controller.ts`/`ideas.controller.ts` son clases vacías, sin
cliente HTTP en `package.json` — confirmado):
- `package.json` — agregar `axios` (o `@nestjs/axios`, según lo que ya se decida en Fase 3 para
  consistencia; se recomienda `fetch` nativo para no agregar dependencia nueva).
- `src/campaigns/campaigns.service.ts`/`campaigns.controller.ts` — implementar `fetchCampaigns`
  (`GET /campaigns` de core-service, ya filtra por pertenencia vía el JWT) y `fetchCampaignByName`
  (filtro por nombre, en el propio BFF o agregando `?name=` opcional a `GET /campaigns` de core-service).
  Reenvía el `Authorization: Bearer` del request entrante.
- `src/ideas/ideas.service.ts`/`ideas.controller.ts` — implementar `fetchContentIdeas` (`GET
  /campaigns/:id/ideas` o `GET /ideas?campaignId=` de core-service, ya CRUD real) — **solo lectura**, no
  se agrega ningún endpoint de escritura de ideas en `alexa-service` (las ideas por voz se guardan en la
  DynamoDB del Lambda, no aquí).
- Métricas para voz: el BFF llama al `GET /campaigns/:id/metrics` construido en Fase 5.

**Gateway**: agregar `pathFilter: '/api/alexa'` → `alexaServiceUrl` en
`apps/backend/gateway/src/main.ts` (patrón de línea única ya usado para el resto) solo si el Lambda va a
golpear el gateway en vez de `alexa-service` directo (puerto 3004 hoy no proxeado). Env vars nuevas en
`alexa-service`: `CORE_SERVICE_URL`, `AUTH_SERVICE_URL` — agregar a `.env.example`/`turbo.json globalEnv`.

## Explícitamente fuera de alcance

- Módulo de `media`/storage: ya existe (Cloudinary), pero el publish real de esta fase no lo usa (posts de
  solo texto, decisión ya confirmada).
- Webhooks de Ayrshare: solo polling vía los cron de Fase 4/5 (auditoría §11).
- `CampaignMetricSnapshot`, `CampaignGoal`, score de campaña separado: diferidos (auditoría §22.8/12/13).
- Frontend: nada de esto se conecta a `apps/frontend/*` en esta fase.
- El Lambda/skill en sí: se construye aparte por el equipo externo.
- `docs/skill/AlexaSkill-Diseno-Final.md` (OAuth2 + ContentIdea para ideas de voz): descartado para esta
  fase por decisión explícita del usuario, aunque quede documentado en el repo.

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
5. `alexa-service`: con el `accessToken` obtenido en el paso 4, llamar `GET /campaigns/mine`-equivalente
   (o el endpoint real que se implemente) y confirmar que devuelve las campañas reales del usuario, no
   mock.
6. `pnpm --filter @repo/core-service build` y `pnpm --filter @repo/auth-service build` y `pnpm --filter
   @repo/alexa-service build` sin errores de tipo tras los cambios.
