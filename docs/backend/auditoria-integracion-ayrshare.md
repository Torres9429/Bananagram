# Auditoría técnica — Preparación para integración real con Ayrshare

> Auditoría, no implementación. Basada en lectura directa del código real (no de `modelo2.txt` como
> referencia, sino de los `schema.prisma`, servicios, controllers y tests tal como existen hoy,
> 2026-07-28). Cada hallazgo cita archivo y línea donde aplica. Contexto de alcance: `ADR-0003` declara
> explícitamente *"complejidad operativa fuera del alcance del hackathon"* — este documento respeta esa
> restricción y evita recomendar infraestructura que el proyecto no necesita todavía (colas, vistas
> materializadas, cifrado a nivel de vault, etc.), señalándolo explícitamente donde aplica.

## Veredicto ejecutivo

| Pregunta | Respuesta corta |
|---|---|
| ¿El modelo de datos soporta multi-red? | **Sí, ya está bien diseñado** — `PostSocialAccount` ya es la entidad intermedia Post↔Red que la integración necesita. No hay que inventarla. |
| ¿El código runtime respeta ese diseño? | **No.** `PostSchedulerService` (cron, cada minuto) publica marcando `Post.status = publicado` directo, sin tocar `PostSocialAccount`, sin llamar a ninguna red. El schema está listo; el código que lo usa, no. |
| ¿Los crons de métricas/publicación corren hoy? | **No corren en absoluto.** Ni `MetricsCronService` ni `PostSchedulerService` están registrados en ningún `@Module` — no hay `ScheduleModule.forRoot()` en `app.module.ts` de `core-service`. Son código muerto, no simulación activa. |
| ¿Falta algún módulo bloqueante? | **`brands`** — no existe ni como carpeta. Es prerequisito duro para todo lo demás (ya lo habíamos identificado en conversación previa). |
| ¿Hace falta una tabla nueva grande (snapshots, colas, etc.)? | **No todavía.** Con el volumen esperado de un hackathon/MVP, agregación dinámica desde `PostMetric` alcanza. Se detalla cuándo sí valdría la pena. |
| ¿Qué es obligatorio antes de tocar Ayrshare? | `brands` real + `posts` real (controller/service sobre la máquina de estados ya escrita) + registrar los cron en un módulo real. Sin esto, no hay dónde enganchar la llamada a Ayrshare. |

---

## 1. Arquitectura y distribución de responsabilidades

**Dónde debe vivir**: dentro de `core-service`, no como servicio aparte. Razón: toda la data que Ayrshare
toca (`Brand`, `SocialAccount`, `Post`, `PostSocialAccount`, `PostMetric`) ya vive en la BD de
`core-service` (`gestor_redes_core`). Separar la integración a un microservicio nuevo obligaría a llamadas
HTTP internas para algo que hoy es una consulta Prisma local — contradice ADR-0003 (síncrono, sin
mensajería, mínima complejidad operativa) sin ganar nada a cambio.

**Módulo propuesto**: `core-service/src/integrations/ayrshare/` (nombre coherente con que ya existe
`src/auth/`, `src/guards/`, `src/strategies/` como carpetas de infraestructura, no de dominio). Contenido:
- `ayrshare.service.ts` — cliente HTTP encapsulado (crear profile, generar link, publicar, pedir
  analíticas, borrar profile).
- `ayrshare.module.ts` — expone el service para que `posts`, `brands`, `cron` lo inyecten.
- `mappers/` — un adaptador por red (ver §7).
- `ayrshare.controller.ts` — **solo** si se decide exponer el webhook aquí (ver §11); si no hay webhook
  en el MVP, este archivo no hace falta.

**Responsabilidades por capa**:
| Capa | Responsabilidad | Lo que NO debe hacer |
|---|---|---|
| Gateway | Proxy puro (ya lo es, ver `apps/backend/gateway/src/main.ts:20-28`) | No debe empezar a validar ni transformar payloads de Ayrshare — mismo principio que ya sigue con `catalogs`. |
| `posts.controller.ts` (a crear) | Recibir request, delegar a service | No debe llamar a `AyrshareService` directo — pasa por `PostsService`. |
| `posts.service.ts` (a crear) | Orquestar: validar transición (`validateTransition`, ya existe) → llamar `AyrshareService.publish()` → escribir `PostSocialAccount` por red | Es donde vive la lógica, siguiendo el patrón ya establecido en `catalogs` (excepciones lanzadas desde el service, no repository — ver `docs/backend/guia-nuevos-modulos-backend.md` §5). |
| Cron (`MetricsCronService`, `PostSchedulerService`) | Disparar la sincronización periódica | No debe contener lógica de negocio de publicación — llama a los services de dominio. |
| `AyrshareService` | Única puerta de salida HTTP hacia Ayrshare | No debe conocer `Brand`/`Campaign` — recibe IDs/keys ya resueltos, regresa DTOs crudos tipados. |

**Alexa-service**: debe consumir **solo** endpoints ya procesados de `core-service` (p. ej.
`GET /campaigns/:id/metrics`), nunca hablar con Ayrshare directo ni conocer `ayrshareProfileKey`.
Confirma el patrón ya usado: `alexa-service` no tiene BD propia y sus módulos (`campaigns/`, `ideas/`) son
BFF puro — mismo criterio aplica aquí, sin excepción.

**`commons/` — uso actual, correcto**: revisado el contenido real (`apps/backend/commons/`):
`guards/jwt-auth.guard.ts` y `guards/permission.guard.ts` son genéricos sin lógica de negocio;
`circuit-breaker/opossum.factory.ts` es un factory puro (`timeout: 5000, errorThresholdPercentage: 50,
resetTimeout: 30000`); `types/*.enum.ts` son enums compartidos. No hay lógica de negocio filtrada ahí —
está limpio. El `AyrshareService` **debe** envolver sus llamadas con `createCircuitBreaker()` de este
factory, reutilizándolo tal cual (es exactamente el caso de uso para el que existe, hoy sin ningún
consumidor real).

**Dependencias indebidas**: ninguna detectada hoy entre servicios — pero ojo, `PermissionGuard` (lee
`user.permissions[module]`) y `JwtAuthGuard` de `commons/` **no están aplicados en ningún controller
real todavía** (solo `catalogs` usa `JwtAuthGuard`, ninguno usa `PermissionGuard`). Esto es relevante para
§14.

---

## 2. Modelos de Prisma y base de datos

**Hallazgo central**: el schema **no** asume que una publicación interna es 1:1 con una publicación
externa — ya existe `PostSocialAccount` como entidad intermedia (`schema.prisma:306-326` de
`core-service`), con `@@unique([postId, socialAccountId])`. Esto es exactamente lo que la sección 3 del
análisis pide verificar, y **ya está bien resuelto**. Lo que falta son campos, no modelos nuevos, salvo
uno (`ProviderRequestLog`, justificado abajo).

También vale aclarar algo que a primera vista parece un error y no lo es: `Post.ayrsharePostId` (el id
del **job** de Ayrshare que agrupa el envío a varias redes en una sola llamada) y
`PostSocialAccount.socialPostId` (el id que cada red individual regresa) **son cosas distintas y ambas
necesarias** — no es duplicación, es la jerarquía correcta (1 llamada a Ayrshare → N publicaciones por
red).

### Cambios recomendados

| Modelo | Campo/relación | Tipo Prisma | Nulable | Índice/restricción | Motivo | ¿Migración? | Impacto |
|---|---|---|---|---|---|---|---|
| `SocialAccount` | `platformAccountId` | `String?` | Sí | — | Id que Ayrshare/la red asigna a la cuenta conectada — mapear webhooks/eventos de vuelta sin depender de `handle` (frágil, cambia sin avisar) | Sí, aditiva | Bajo |
| `SocialAccount` | `disconnectedAt` | `DateTime?` | Sí | — | Detectar cuándo una cuenta dejó de estar activa (vs. `active: false` que no dice cuándo pasó) | Sí, aditiva | Bajo |
| `SocialAccount` | `lastAuthenticatedAt` | `DateTime?` | Sí | — | TikTok exige reautorización anual (confirmado en doc de Ayrshare) — sin esto no hay forma de avisar antes de que expire | Sí, aditiva | Bajo |
| `PostSocialAccount` | `providerStatus` | `String?` | Sí | — | Estado **crudo** que reporta Ayrshare, separado del enum interno (`PostSocialAccountStatus`) — para depurar cuando divergen | Sí, aditiva | Bajo |
| `PostSocialAccount` | `errorCode` | `String?` | Sí | — | Clasificar errores (`rate_limit`, `token_expired`, `invalid_media`...) sin parsear `errorMessage` en texto libre — necesario para §16 (qué reintentar) | Sí, aditiva | Bajo |
| `PostSocialAccount` | `retryCount` | `Int @default(0)` | No | — | Contador de reintentos — hoy no existe en ningún lado | Sí, aditiva | Bajo |
| `PostSocialAccount` | `lastSyncedAt` | `DateTime?` | Sí | — | Última vez que se consultó su estado real a Ayrshare (distinto de `publishedAt`) | Sí, aditiva | Bajo |
| `PostMetric` | `raw` | `Json?` | Sí | — | Conservar la respuesta cruda de Ayrshare — varios campos tienen ventana de vida corta (TikTok expira a los 7 días de inactividad, X a los 30) | Sí, aditiva | Bajo |
| `PostMetric` | `source` | `String @default("simulated")` | No | índice sugerido si se filtra por esto seguido | **Crítico**: distinguir filas generadas por `decay-simulator.ts` de filas reales de Ayrshare. Si conviven en la misma tabla sin marcarlas, un reporte puede mezclar datos falsos con reales sin que nadie lo note | Sí, aditiva + backfill (`update ... set source='simulated'` sobre filas existentes) | Medio — es el cambio con más impacto en corrección de datos |
| `PostMetric` | `engagementBase` | `String?` (`'reach'|'views'|'impressions'`) | Sí | — | Qué denominador se usó para calcular `engagement` en esa fila — necesario porque no todas las redes exponen `reach` (ver §8) | Sí, aditiva | Bajo |
| — | *(nuevo modelo)* `ProviderRequestLog` | ver detalle abajo | — | índice en `(entityType, entityId)` y en `createdAt` | Trazabilidad de cada llamada saliente a Ayrshare — distinto de `AuditLog` (que audita mutaciones de dominio, no llamadas HTTP a terceros) | Sí, tabla nueva | Bajo (aditivo, no toca nada existente) |
| — | *(nuevo modelo)* `MetricSyncRun` | ver detalle abajo | — | — | Registrar cada corrida del cron (ver §10/§17) | Sí, tabla nueva | Bajo |

**`ProviderRequestLog` — propuesta mínima** (nombre coherente con `PostStatusHistory`/`AuditLog`, que ya
son los únicos modelos "de bitácora" del proyecto):
```prisma
model ProviderRequestLog {
  id            String   @id @default(uuid())
  provider      String   @default("ayrshare")
  operation     String   // 'publish' | 'analytics' | 'connectProfile' | ...
  entityType    String   // 'post' | 'socialAccount' | 'brand'
  entityId      String
  requestId     String?  // correlation id, para cruzar con logs
  httpStatus    Int?
  succeeded     Boolean
  errorCode     String?
  durationMs    Int?
  createdAt     DateTime @default(now())

  @@index([entityType, entityId])
  @@map("provider_request_logs")
}
```
**Nunca** guardar aquí el body completo de la request/response (puede traer datos de terceros o, peor,
la API key si algún día se loguea por error) — solo metadatos. Ver §17 para qué sí/no debe registrarse.

**`MetricSyncRun` — propuesta mínima**:
```prisma
model MetricSyncRun {
  id              String    @id @default(uuid())
  startedAt       DateTime  @default(now())
  finishedAt      DateTime?
  itemsProcessed  Int       @default(0)
  itemsFailed     Int       @default(0)
  status          String    // 'running' | 'completed' | 'failed'

  @@map("metric_sync_runs")
}
```

**Lo que evalué y decidí NO recomendar ahora** (justificación explícita, no omisión):
- `CampaignMetricSnapshot`: no hace falta con el volumen actual — ver §22.8, análisis completo ahí.
- `CampaignGoal` como tabla normalizada: `Campaign.objective` ya es texto libre; una tabla aparte es
  sobreingeniería mientras no haya más de un objetivo medible por campaña — ver §22.12.
- Campos `impressions`/`clicks`/`saves`/`reactions`/`watchTime` como columnas propias en `PostMetric`:
  son específicos de 1-2 redes cada uno (ver tabla de §7) — van en `raw`, no como columnas normalizadas.
  Agregar una columna por cada métrica que exista en alguna red es exactamente el antipatrón que el
  propio pedido de auditoría advierte evitar.
- Cifrado a nivel de aplicación para `ayrshareProfileKey`: no es un secreto del mismo nivel que
  `AYRSHARE_API_KEY` (es un identificador de scoping que se manda junto con la key maestra, no un
  credential por sí solo) — basta con excluirlo de cualquier DTO de respuesta al frontend. Ver §6.

---

## 3. Publicaciones multired

Ya cubierto en gran parte en §2. Resumen de qué sí y qué no soporta el diseño actual:

| Requisito | ¿Lo soporta hoy? |
|---|---|
| 1 publicación interna, N redes | ✅ vía `PostSocialAccount` |
| Resultado distinto por red | ✅ `PostSocialAccountStatus` es por fila, no por `Post` |
| Éxito en una red, falla en otra | ✅ el schema lo permite; **el estado agregado de `Post` no se calcula desde esto todavía** (ver §4) |
| Ids externos distintos por red | ✅ `socialPostId` es por `PostSocialAccount` |
| Fechas de publicación distintas por red | ✅ `publishedAt` es por `PostSocialAccount` (además del de `Post`, que sería la fecha "solicitada") |
| Métricas independientes por red | ✅ `PostMetric` cuelga de `PostSocialAccount`, no de `Post` |
| Reintentos independientes por red | ❌ falta `retryCount` (agregado en §2) |
| Contenido adaptado por red | ❌ `Post.content` es único — si el producto quiere texto distinto por red (p. ej. hashtags de TikTok vs. caption de Instagram), haría falta un campo `content` también en `PostSocialAccount` que sobreescriba el de `Post` cuando exista. **Esto es una decisión de producto pendiente, no un bug** — si no se necesita para el MVP, no lo agreguen todavía. |

---

## 4. Estados y máquina de estados

Revisado `post-state-machine.ts` y `transitions.map.ts` completos. La máquina cubre bien el tramo de
aprobación (`borrador→en_revision→aprobado/rechazado→borrador`) y dispara `programado→publicando→
publicado/parcial/error/cancelado` para el tramo de publicación — el enum ya anticipa multi-red (`parcial`
existe justo para el caso "2 de 3 redes publicaron bien").

**Inconsistencia real encontrada**: `PostSchedulerService.publishScheduledPosts()` (cron cada minuto,
`scheduler/post-scheduler.service.ts:10-22`) **ignora la máquina de estados por completo** — toma posts en
`programado` y los marca `publicado` directo, sin pasar por `publicando`, sin crear ni actualizar ningún
`PostSocialAccount`, sin invocar `validateTransition()`. Es decir: el único lugar del código que hoy
"publica" un post no llama a la función que valida transiciones que el propio proyecto ya escribió. Esto
**tiene que reescribirse por completo**, no ajustarse — la versión real debe:
1. Tomar posts en `programado` con `scheduledAt <= now`.
2. Cambiar a `publicando`.
3. Llamar `AyrshareService.publish()` una vez (todas las redes en la misma llamada, así funciona la API
   de Ayrshare).
4. Por cada red en la respuesta, crear/actualizar su `PostSocialAccount` con el resultado individual.
5. Calcular el estado agregado de `Post` a partir de los resultados por red (ver siguiente punto) y
   escribir en `PostStatusHistory`.

**Estrategia de estado agregado** (no existe hoy, hay que definirla): con N `PostSocialAccount` por post,
`Post.status` debería derivarse así:
- Todas en `publicado` → `Post.status = publicado`.
- Todas en `error` → `Post.status = error`.
- Mezcla de `publicado`/`error` → `Post.status = parcial`.
- Alguna sigue en `publicando` → `Post.status = publicando` (aún no se resuelve).

Esto se calcula, no se persiste como fuente de verdad aparte — es una función pura sobre
`post.socialAccounts.map(sa => sa.status)`, ejecutada cada vez que se actualiza un `PostSocialAccount`.

---

## 5. Cliente HTTP y comunicación con Ayrshare

**Ya existe infraestructura reutilizable**: `commons/circuit-breaker/opossum.factory.ts` — genérico, sin
ningún consumidor real hoy. `AyrshareService` debe ser su primer uso real.

**Qué necesita el cliente concretamente**:
- HTTP client: usar `@nestjs/axios` (`HttpModule`) — no está instalado todavía en `core-service`
  (verificar `package.json` antes de asumir), es la opción estándar de Nest y ya se usaría el mismo
  patrón que el resto del proyecto (Nest-idiomático, ver `docs/backend/guia-nuevos-modulos-backend.md`).
- Timeout + reintentos + backoff exponencial: envolver cada llamada con `createCircuitBreaker()` —
  ya trae `timeout: 5000`; agregar reintentos con backoff **fuera** del circuit breaker (el breaker cuenta
  fallos, no debe reintentar él mismo o distorsiona el conteo de `errorThresholdPercentage`).
- Idempotencia: ver §16 — usar un `requestId`/idempotency key propio (UUID generado antes de llamar),
  no confiar en que Ayrshare deduplique.
- Correlation ID: el gateway ya propaga `X-Request-ID` (`CorrelationIdMiddleware`, mencionado en
  `CLAUDE.md`) — el `AyrshareService` debe seguir logueando bajo ese mismo id, no generar uno nuevo.
- DTOs separados de los modelos Prisma: sí, necesario — la respuesta cruda de Ayrshare nunca debe
  regresarse tal cual desde un controller (arrastra campos que no queremos exponer, y cambia si Ayrshare
  cambia su API). Un `AyrshareAnalyticsResponseDto` interno, distinto del `PostMetric` de Prisma.
- Logs estructurados: usar el mismo patrón que ya usan los cron actuales (`Logger` de Nest,
  `this.logger.log(...)`), no `console.log`.

**Variables de entorno** (ninguna existe todavía en `.env`/`docker-compose`, hay que agregarlas):
```
AYRSHARE_API_KEY=            # solo en core-service, nunca al frontend (mismo tratamiento que ANTHROPIC_API_KEY en CLAUDE.md)
AYRSHARE_BASE_URL=https://api.ayrshare.com
AYRSHARE_TIMEOUT_MS=5000
AYRSHARE_MAX_RETRIES=2
AYRSHARE_WEBHOOK_SECRET=     # solo si se adopta webhook (§11)
```
Recordatorio de `CLAUDE.md`: si se agrega una env var nueva, hay que sumarla a `turbo.json` →
`globalEnv`, o Turborepo (modo `strict` desde v2) la filtra en silencio y el síntoma es un error de
"Environment variable not found" que no tiene nada que ver con el código.

---

## 6. Perfiles, cuentas y credenciales

Mapeo confirmado contra el schema real:
- Usuario (`auth-service.User`) → Marca (`Brand.ownerId`, sin `@relation` real, comparado en
  `BrandAccessGuard`) → Profile de Ayrshare (`Brand.ayrshareProfileKey`) → Cuenta social
  (`SocialAccount`, N por `Brand`, una por red gracias a `@@unique([brandId, socialNetworkId])`,
  `schema.prisma:158-177`).

| Requisito | Estado |
|---|---|
| Una marca, varias cuentas de la misma red (2 cuentas de Instagram) | ❌ el `@@unique([brandId, socialNetworkId])` actual lo impide — **decisión de producto pendiente**: ¿alguna marca necesita 2 cuentas de la misma red? Si no, dejarlo así es correcto (evita ambigüedad de "a cuál le publico"). Si sí, hay que quitar ese unique y resolver a cuál cuenta apunta cada post explícitamente. |
| Marcas distintas, profiles de Ayrshare distintos | ✅ `ayrshareProfileKey` es único por `Brand` |
| Desvincular una cuenta | Parcial — existe `active Boolean` y `deletedAt`, falta el flujo real (llamar a Ayrshare para desconectar, no solo marcar localmente) |
| Detectar conexión expirada | ❌ falta — cubierto por los campos nuevos de §2 (`disconnectedAt`, `lastAuthenticatedAt`) |
| Última sincronización | ❌ falta `lastSyncedAt` (agregado en §2) |
| Activar/desactivar conexión | ✅ `active` ya existe |
| Cuenta sandbox vs. producción | **No aplica a nivel de fila** — el estado "auditado/sandbox" es del lado de la app de Ayrshare/TikTok completa, no por cuenta individual conectada (confirmado en la conversación previa sobre TikTok) — no modelar esto en `SocialAccount`. |
| Rotar credenciales | No aplica del lado nuestro — Ayrshare gestiona el token OAuth de cada red; nosotros solo guardamos `ayrshareProfileKey`, que no rota. |
| Limitar quién puede publicar por una conexión | Cubierto por RBAC general (§14), no por el modelo `SocialAccount` en sí. |

**Sobre proteger el `profileKey`**: no es un secreto del mismo nivel que la API key maestra — es más
parecido a un identificador de tenant que se manda junto con la key real en cada llamada. Aun así:
nunca debe regresarse en ningún DTO de respuesta al frontend (excluirlo explícitamente al serializar
`Brand`), y nunca debe loguearse texto completo en `ProviderRequestLog` (§2) — solo un hash corto o los
últimos 4 caracteres si hace falta para debug.

---

## 7. Normalización de métricas

Confirmado con la doc real de Ayrshare (ya investigado en conversación previa) que cada red nombra las
métricas distinto y algunas ni las expone. Diseño de la capa:

```
Respuesta cruda Ayrshare → AyrshareMetricsAdapter (factory/registro por red)
    → { InstagramMetricsMapper | FacebookMetricsMapper | TikTokMetricsMapper | XMetricsMapper }
    → shape normalizado { likes, comments, shares, views, reach, engagementBase }
    → PostMetric.create({ ...normalizado, raw: respuestaCruda, source: 'ayrshare' })
```

Cada mapper es una función pura `(rawResponse) => NormalizedMetric` — sin estado, fácil de testear
unitariamente (ver §18). Un registro/factory (`Record<SocialNetworkCode, MetricsMapper>`) selecciona cuál
usar según `socialAccount.socialNetwork.code`.

| Concepto normalizado | Instagram | Facebook | TikTok | X/Twitter |
|---|---|---|---|---|
| likes | `likeCount` | `likeCount` | `likeCount` | `publicMetrics.likeCount` |
| comments | `commentsCount` | `commentsCount` | `commentsCount` | `publicMetrics.replyCount` |
| shares | `sharesCount` | `sharesCount` | `shareCount` | `publicMetrics.retweetCount` |
| views | `viewsCount`/reels | `mediaView` | `videoViews` | `publicMetrics.impressionCount` |
| reach | `reachCount` | ❌ no existe | `reach` | ❌ no existe |

**Manejo de casos** (respuesta a lo pedido explícitamente):
- **Campo inexistente para esa red** → el mapper devuelve `null` para ese campo, nunca `0` (0 es "medido y
  vale cero", `null` es "no disponible" — distinción que ya se pedía en §22.16 también).
- **Valores nulos** → se persisten como `null` en `PostMetric`, no se sustituyen por 0 ni se omite la fila.
- **Nombres distintos, mismo concepto** → responsabilidad exclusiva del mapper, nunca del código que
  llama (el consumidor solo ve el shape normalizado).
- **Tipos numéricos inconsistentes** (algunas APIs regresan string, otras number) → el mapper hace el
  `Number(...)`/validación, nunca Prisma directo sobre el raw.
- **Reels/Stories/Video vs. post normal** → mismo mapper por red, rama interna según
  `mediaProductType`/`mediaType` si la red lo distingue (ya viene en la respuesta de Instagram) —
  no ameritan mapper separado, sí ameritan un `switch` interno documentado.
- **Cambios en la API de la red** → aislados dentro del mapper correspondiente; el resto del sistema no se
  entera. Es la razón de ser de esta capa.
- **Respuestas por varias redes en una sola llamada de sync** → el cron itera `PostSocialAccount[]`, no
  `Post[]` — una llamada de análisis, un mapper, una fila de `PostMetric` por cada `PostSocialAccount`.

**Campos nuevos evaluados y su destino**:
| Campo candidato | Decisión |
|---|---|
| `impressions` | No columna propia — ya cubierto por `views` en la mayoría de redes; donde difiera de verdad, va en `raw` |
| `clicks` | No columna propia (solo relevante si algún día hay contenido con links rastreables) — `raw` |
| `saves` | No columna propia (solo Instagram lo expone de forma clara) — `raw` |
| `reactions` (desglose like/love/wow) | No — es específico de Facebook, y ya se resume en `likes` — `raw` |
| `watchTime` | No — específico de video/TikTok — `raw` |
| `engagementRate` | Ya existe como `engagement` |
| `engagementBase` | **Sí, agregar** (ver §2) — es la única adición normalizada nueva que realmente hace falta |
| `raw` | **Sí, agregar** (ver §2) |
| `source`/`provider` | **Sí, agregar `source`** (ver §2) — `provider` no hace falta todavía porque solo hay un proveedor (Ayrshare); agregarlo sería especular sobre un futuro multi-proveedor que no está en alcance |
| `schemaVersion` | No — sobreingeniería para un solo proveedor y un MVP; si algún día cambia el shape normalizado de forma incompatible, se resuelve con una migración, no con versionado en runtime |
| `externalPostId` | Ya existe indirectamente vía la relación `postSocialAccountId → PostSocialAccount.socialPostId` — no duplicar en `PostMetric` |

---

## 8. Cálculo de engagement y score digital

Revisado `decay-simulator.ts` y `score.service.ts` completos. La fórmula real hoy:
```
engagement = reach > 0 ? ((likes + comments + shares) / reach) * 100 : 0
```
(`decay-simulator.ts:14`, y el mismo patrón conceptual en `score.service.ts:30-32` sobre el promedio de
`engagement` ya calculado).

**Qué pasa con datos reales, caso por caso**:
| Caso | Comportamiento actual | Problema | Política propuesta |
|---|---|---|---|
| `reach` es `null` (Facebook, X) | Rompería la comparación `reach > 0` (TypeScript ni compila con `null`, y en runtime `null > 0` es `false`) | El post queda con `engagement = 0`, indistinguible de "tuvo cero interacciones" | `engagement = null` si no hay `reach` **y** no se define un fallback — nunca `0` |
| `reach` es `0` real | Ya se maneja bien (cae al `else` → 0) | — | Mantener |
| Solo hay `views`/`impressions`, no `reach` | No contemplado hoy | Se perdería el dato de engagement para esa red por completo | Usar `views`/`impressions` como base cuando `reach` no exista, **y guardar cuál se usó** en `engagementBase` (§2) — así un reporte puede advertir "este % no es comparable 1:1 con el de Instagram" |
| Un post con varias redes | `score.service.ts:26-29` promedia **todas** las métricas de todas las redes juntas | Mezcla denominadores distintos (reach de Instagram con impressions de X) en un solo promedio — **esto sí produce comparaciones/engañosas**, confirmado | Calcular engagement **por red primero**, y el score solo promedia los `engagement` ya normalizados por red — nunca sumar numeradores de redes distintas antes de dividir |
| Métricas capturadas en momentos distintos | El cron corre cada 6h y siempre hace `create` (nunca `update`) — se acumulan capturas | Correcto para histórico, pero `score.service.ts` no filtra "última captura por red", promedia **todas las capturas históricas** de los últimos 30 días como si fueran independientes | Ver §9 — hay que tomar la última captura válida por `PostSocialAccount`, no todas |
| El proveedor corrige valores (bajan) | No contemplado | Un `likes` que baja de una captura a otra generaría "crecimiento negativo" sin explicación | Aceptar que puede pasar (Ayrshare/las redes corrigen conteos) — no hay nada que "arreglar" en el dato, solo no asumir monotonicidad creciente en ningún cálculo de crecimiento (§22.10) |

**Distinción de conceptos** (pedida explícitamente):
- **Engagement absoluto** = `likes + comments + shares` (un número, sin denominador).
- **Engagement rate** = ese número entre `reach`/`views`/`impressions` (lo que hoy se llama `engagement`
  en `PostMetric`, en porcentaje).
- **Score digital** = fórmula ponderada de marca (`consistency×0.30 + engagement×0.40 + coverage×0.20 +
  frequency×0.10`, `score.service.ts:49`) — usa el *promedio* de engagement rate como uno de 4 insumos,
  no es lo mismo que el engagement rate en sí.
- **Score agregado por marca**: ya existe (`BrandScore`, por `brandId`).
- **Score agregado por periodo**: ya existe implícitamente (el cálculo toma `thirtyDaysAgo` como ventana,
  `score.service.ts:8`) pero no se persiste el periodo usado junto al resultado — `BrandScore` no guarda
  `periodStart`/`periodEnd`, solo `snapshotDate` (la fecha en que se calculó, no el rango que cubre). Vale
  la pena agregar esos 2 campos si van a comparar scores de distintas ventanas más adelante.

**Veredicto**: sí, la fórmula actual produciría comparaciones engañosas en cuanto entren datos reales
multi-red — no por estar mal escrita, sino porque fue diseñada cuando todo era simulado con un solo
`baseEngagementRate` por red y nunca se topó con `reach = null`. Hay que tocarla antes de conectar
Ayrshare, no después.

---

## 9. Históricos y capturas de métricas

`PostMetric` representa **una captura histórica** (snapshot), nunca un acumulado ni una diferencia — cada
fila tiene su propio `capturedAt` y el cron siempre hace `create` (`metrics-cron.service.ts:25`), nunca
`update`. Esto es correcto y deliberado para conservar histórico, pero **hoy nada impide duplicados**: si
el cron corre dos veces en la misma ventana de 6h (reinicio del proceso, doble deploy, etc.), se crean dos
filas idénticas para el mismo `PostSocialAccount` con `capturedAt` casi igual.

**Restricción recomendada**: no un `@@unique` estricto sobre `(postSocialAccountId, capturedAt)` (la
fecha exacta nunca va a coincidir dos veces por accidente), sino a nivel de lógica de negocio: antes de
crear, verificar si ya existe una captura para ese `PostSocialAccount` dentro de la ventana de sync actual
(p. ej. últimas 5 horas si el cron corre cada 6). Es una consulta, no una constraint de BD — una
constraint real requeriría truncar `capturedAt` a la hora, lo cual complica más de lo que ayuda para el
volumen actual.

**Frecuencia de 6 horas — consecuencias**: con una campaña de 30 días y 10 posts multi-red (3 redes c/u),
son `10 × 3 × 4 capturas/día × 30 días = 3,600 filas` por campaña — trivial para Postgres, no amerita
partición ni limpieza automática todavía. Si el proyecto crece a cientos de campañas activas
simultáneas, ahí sí valdría revisar retención — no antes.

**No hace falta** (evaluado y descartado, con volumen actual): agregación diaria pre-calculada, limpieza
automática de históricos, `isLatest` boolean en `PostMetric`. Si estos se necesitan, es por rendimiento de
consulta, no por corrección — y `DISTINCT ON` de Postgres (ver §22.9) resuelve "última captura" sin
necesitar ningún campo ni tabla extra.

**Sí hace falta**: `MetricSyncRun` (§2) para saber si el cron corrió y qué tan bien, y una marca de última
sincronización exitosa — cubierta por `finishedAt` + `status` de ese mismo modelo, no necesita campo
aparte en otro lado.

---

## 10. Cron jobs y procesamiento asíncrono

**Hallazgo más importante de toda la auditoría de esta sección**: ni `MetricsCronService` ni
`PostSchedulerService` están registrados en ningún `@Module`. `app.module.ts` de `core-service` solo
importa `CatalogsModule`. Tampoco existe `ScheduleModule.forRoot()` en ningún lado del árbol de módulos
(confirmado por búsqueda exhaustiva). Consecuencia concreta: **los `@Cron()` de ambos archivos nunca se
ejecutan hoy**, ni en dev ni en producción — no es que estén simulando datos activamente, es que están
completamente inertes. Todo lo que se ha hablado en esta conversación sobre "el cron que simula métricas
cada 6 horas" describe código que existe pero no corre.

**Qué hacer con `decay-simulator.ts`**: no eliminar — aislarlo detrás de un flag/estrategia (ver §19,
`MockSocialProvider` vs `AyrshareProvider`) para seguir generando datos de demo sin gastar el trial de
Ayrshare. Debe dejar de ser lo único que exista, pero sigue siendo útil.

**División en lotes / límites del plan**: con el trial Launch (10 profiles, 130 accounts — visto en
conversación previa), el volumen es tan bajo que un solo `for` secuencial (como ya hace
`metrics-cron.service.ts:19-26`) es suficiente — no hace falta batching real todavía. Si el número de
`SocialAccount` activas crece, ahí sí conviene paginar en lotes de ~20 con una pequeña pausa entre lotes
para no chocar con rate limits.

**Evitar doble ejecución concurrente**: con un solo proceso de `core-service` corriendo (no hay réplicas
horizontales mencionadas en ningún lado del proyecto, es un monorepo de hackathon con `pnpm dev`), esto
**no es un riesgo real todavía** — `@nestjs/schedule` ya evita que el mismo proceso reentre al mismo cron
si la ejecución anterior no terminó (comportamiento por defecto). Si algún día se corre en Docker con más
de una réplica, ahí sí se necesitaría un lock distribuido (p. ej. `pg_advisory_lock`) — no antes.

**¿Cola tipo BullMQ?** — **No se recomienda**, y aquí está la justificación pedida explícitamente: el
volumen actual (10 profiles, decenas de posts, un cron cada 6h) no genera ni concurrencia ni necesidad de
reintentos distribuidos que un cron simple con `try/catch` por item no resuelva. BullMQ agrega una
dependencia de Redis, un worker separado, y complejidad operativa que ADR-0003 explícitamente descarta
para este proyecto. Reevaluar solo si: (a) el número de publicaciones a sincronizar por corrida supera
cientos, o (b) se necesita reintento con backoff que sobreviva un restart del proceso — ninguna de las
dos aplica hoy.

**Qué sí falta, concreto**:
1. Registrar `MetricsCronService` y `PostSchedulerService` en un módulo real (`CronModule` o
   directo en `AppModule`) — sin esto nada de lo demás importa.
2. Agregar `ScheduleModule.forRoot()` en `AppModule`.
3. Reintentar solo los `PostSocialAccount`/`SocialAccount` que fallaron en la corrida anterior, no
   reprocesar todo — usar `retryCount`/`lastSyncedAt` (§2) como filtro.
4. Registrar cada corrida en `MetricSyncRun` (§2/§9).
5. Un fallo en un item **no debe** detener el `for` completo — ya está bien encapsulado hoy porque el
   loop no tiene `try/catch` individual (`metrics-cron.service.ts:19-26`): si un item truena, tira todo el
   resto del batch. Hay que envolver cada iteración en su propio `try/catch` y seguir con el resto.

---

## 11. Webhooks

**No hay soporte de webhooks en el código hoy** — ni endpoint, ni tabla, ni mención. Confirmado por
búsqueda en todo el árbol de `core-service`/`gateway`.

**¿Se puede lanzar el MVP sin webhooks?** Sí — con polling (el cron cada 6h ya cubre esto
conceptualmente). Limitaciones reales de depender solo de polling:
- Latencia de hasta 6 horas para saber si un post falló o se publicó — para un producto donde el CM
  quiere ver "publicado ✅" poco después de que pasa, es notorio.
- TikTok específicamente: un post en `pending` (privado) no dispara nada — sin webhook, solo te enteras
  la próxima vez que el cron pregunte.
- Cuenta desconectada por el usuario del lado de la red social: sin webhook, tarda hasta la próxima
  corrida del cron en detectarse (y solo si el cron efectivamente intenta usar esa cuenta).

**Si se adopta webhook más adelante**, lo mínimo:
- Endpoint público nuevo, agregado al gateway (`pathFilter: '/api/webhooks/ayrshare'`) — siguiendo
  exactamente el patrón ya usado para `/api/catalogs` en `gateway/src/main.ts`.
- Validación de firma **obligatoria** antes de tocar BD — es la única entrada no autenticada por JWT que
  tendría el sistema, y sin validar firma cualquiera podría simular "post publicado".
- `WebhookEvent` (tabla nueva, deferida hasta que se decida adoptar webhooks) con un unique sobre el id
  de evento que mande Ayrshare, para deduplicar reintentos/replays del lado de ellos.
- Responder rápido (200 inmediato) y procesar después — no bloquear la respuesta HTTP con la lógica de
  actualizar `PostSocialAccount`.

**Recomendación concreta para el MVP dentro del trial de 28 días**: arrancar solo con polling. Webhooks
agregan una superficie de seguridad nueva (endpoint público) que no vale la pena resolver bien bajo
presión de tiempo — mejor un cron más frecuente (cada 1h en vez de 6, solo para posts recién publicados)
que un webhook mal asegurado.

---

## 12. Archivos y contenido multimedia

Revisado `Media`/`PostMedia` en el schema (`schema.prisma:329-364`). Guarda `url`, `mimeType`, `size`,
`width`/`height`/`duration` — pero **no hay ningún módulo/servicio que suba archivos todavía** (no existe
carpeta `media/` en `core-service/src`, solo el modelo Prisma). Es decir: antes de que Ayrshare pueda
publicar una imagen/video, primero tiene que existir el módulo de `media` completo (subida real,
almacenamiento, generación de URL pública) — **esto es otro prerequisito no mencionado hasta ahora en la
conversación**, del mismo tipo que `brands`.

**Punto crítico para Ayrshare específicamente**: Ayrshare requiere URLs **públicamente accesibles** (no
requieren auth) para poder descargar el media y publicarlo — si el almacenamiento elegido más adelante usa
URLs firmadas con expiración corta (común en S3/Cloudinary por seguridad), hay que asegurar que la URL
tenga vida suficiente para que Ayrshare la consuma antes de que expire, o servir el archivo desde una ruta
pública sin firma. Esto no se puede resolver hoy porque **no hay decisión tomada todavía de dónde se va a
alojar el media** — es una decisión de infraestructura pendiente, anterior a la integración de Ayrshare en
sí.

---

## 13. Programación y zonas horarias

`Post.scheduledAt`/`publishedAt` son `DateTime` (Prisma los guarda en UTC en Postgres por defecto,
`timestamp` sin timezone explícito en el schema — revisar si el tipo de columna real en la migración usa
`timestamptz`, recomendado agregarlo si no). **No hay ningún campo `timezone` en `Brand`, `Campaign` ni
`Post`** — si el frontend manda "programa esto para las 9am" sin más contexto, hoy no hay forma de saber si
es 9am `America/Mexico_City` o UTC.

**Campos a agregar** (de los que pide la sección 13, evaluados uno por uno):
| Campo propuesto | ¿Agregar? | Dónde |
|---|---|---|
| `scheduledFor` | Ya existe como `Post.scheduledAt` — no duplicar con otro nombre |
| `submittedAt` | Sí — momento en que se mandó la solicitud a Ayrshare (distinto de `scheduledAt`, que es cuándo debería publicarse) → en `PostSocialAccount` |
| `publishedAt` | Ya existe en ambos niveles (`Post` y `PostSocialAccount`) |
| `cancelledAt` | Sí, si se va a soportar cancelar programaciones — hoy `PostStatus.CANCELADO` existe pero no hay timestamp de cuándo pasó eso → agregar a `PostStatusHistory` (ya tiene `createdAt`, que cumple esta función — no hace falta campo nuevo, ya está cubierto ahí) |
| `timezone` | Sí — falta por completo. Recomendado en `Brand` (zona horaria por defecto de esa marca/cliente), no en cada `Post` individual, salvo que el producto quiera permitir mezclar zonas horarias dentro de la misma marca (poco probable) |
| `providerScheduledAt` | Sí — la fecha que Ayrshare *confirma* que va a publicar, puede diferir de la solicitada por redondeos/límites de su lado → `PostSocialAccount` |

---

## 14. Seguridad y permisos

**RBAC ya existe y funciona de punta a punta** del lado de emisión: `auth-service` calcula
`permissions: Record<string, string[]>` desde `role_permissions` y lo mete en el JWT
(`auth.service.ts:40-56`); `core-service/src/strategies/jwt.strategy.ts` decodifica y regresa el payload
completo tal cual como `req.user` (`validate(payload) { return payload; }`) — así que `PermissionGuard.
canActivate()` (que lee `user.permissions[module]`, `commons/guards/permission.guard.ts:17-18`) **ya
funcionaría hoy sin cambios** si se aplicara a algún controller. El problema no es infraestructura
faltante, es que **nadie lo usa todavía** — ni un solo controller en el proyecto tiene
`@UseGuards(PermissionGuard)` ni `@RequirePermission(...)`.

**Módulos/acciones de RBAC existentes** (`commons/types/modules.enum.ts` y `actions.enum.ts`):
- Módulos: `marcas, publicaciones, calendario, campanas, metricas, score, reportes, usuarios,
  privilegios`.
- Acciones: `ver, crear, editar, eliminar, aprobar, rechazar, exportar, configurar, asignar`.

**Gap real para lo que pide la sección 14**: los permisos que pide (`post:create`, `social-account:
connect`, `provider:sync`, etc.) no mapean 1:1 con el enum actual — no existe acción `publicar`,
`conectar`, `desconectar`, ni `sincronizar`. Dos caminos, ninguno "correcto" de forma obvia — es
decisión de producto:
1. Reusar lo que ya existe: `social-account:connect` ≈ `marcas:editar` (conectar una red es editar la
   marca); `provider:sync` ≈ `metricas:ver` o una ejecución interna sin permiso de usuario (el cron corre
   como sistema, no como un usuario con JWT).
2. Extender el enum con acciones nuevas (`conectar`, `desconectar`, `publicar`) si el negocio quiere
   distinguir "quién puede editar el nombre de la marca" de "quién puede conectar/desconectar sus redes"
   — son permisos claramente distintos en la práctica aunque hoy compartirían la misma acción genérica.

**Quién puede publicar en una marca ajena**: cubierto por `BrandAccessGuard` (ya escrito, ver
`core-service/src/guards/brand-access.guard.ts`) — pero **tampoco está aplicado a ningún controller
todavía** (confirmado en `CLAUDE.md` y por búsqueda directa). Debe aplicarse en el controller de `posts`
y `brands` en cuanto existan, junto con `JwtAuthGuard` y `PermissionGuard`.

**Riesgo de SSRF**: si en algún punto el sistema acepta una URL de imagen/video del usuario y el backend
la descarga/procesa (en vez de solo reenviar la URL a Ayrshare), hay que validar que no apunte a
`localhost`/IPs internas/metadata de la nube. Si el flujo es "el usuario sube el archivo, nosotros lo
alojamos, mandamos nuestra propia URL a Ayrshare" (lo más probable dado que `Media.url` ya sugiere eso),
este riesgo no aplica porque nunca se descarga una URL arbitraria del usuario — solo se generan URLs
propias. Confirmar esto como decisión explícita cuando se construya el módulo `media` (§12).

**Exposición de respuestas crudas**: ningún DTO debe regresar `PostMetric.raw` ni
`ProviderRequestLog` completo a un endpoint de frontend sin filtrar — son para debug interno, no para
la UI.

---

## 15. Gateway y contratos de API

Gateway actual (`gateway/src/main.ts`) solo proxea 3 prefijos: `/api/auth`, `/api/me`, `/api/catalogs`.
Ninguno de `brands`/`campaigns`/`posts`/`metrics`/`reports` está expuesto todavía — coherente con que
ninguno de esos módulos tiene controller real.

**Al construirlos, agregar una línea de proxy por prefijo** (patrón ya establecido, una línea, sin tocar
nada más del gateway):
```ts
app.use(createProxyMiddleware({ pathFilter: '/api/brands', target: coreServiceUrl, changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/posts', target: coreServiceUrl, changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/campaigns', target: coreServiceUrl, changeOrigin: true }));
```

**Lógica en gateway vs. core-service**: el gateway debe seguir siendo proxy puro — **ninguna** lógica de
Ayrshare (ni siquiera el webhook, si se adopta) debe validarse ahí más allá del ruteo; la validación de
firma del webhook vive en `core-service`, el gateway solo reenvía el POST tal cual (igual que ya hace con
body streaming para `catalogs`).

**DTOs actuales**: no existen DTOs para `posts`/`brands` todavía (los de `campaigns`/`reports`/`ideas` sí
existen como archivos — `create-campaign.dto.ts`, etc. — pero están huérfanos, ningún controller los
usa, confirmado: los controllers de esos 3 módulos están vacíos, `@Controller('campaigns') export class
CampaignsController {}` sin un solo método). Cuando se escriban los DTOs reales de `posts`, deben soportar
desde el día 1: selección de redes (`socialAccountIds: string[]`), contenido opcionalmente distinto por
red (si se decide en §3), y fecha de programación con `timezone` explícito (§13).

---

## 16. Manejo de errores e idempotencia

**Clasificación de errores** (propuesta, mapeando a lo que Ayrshare puede regresar):
| Tipo | Reintentar? | Ejemplo |
|---|---|---|
| Validación interna (DTO inválido) | No | Falta `content` |
| Autenticación con Ayrshare (API key inválida) | No — es un error de configuración, no transitorio | 401 de Ayrshare |
| Cuenta social desconectada | No automáticamente — requiere que el usuario reconecte | Ayrshare regresa error de token expirado para esa red |
| Contenido rechazado por una red (formato, longitud) | No | TikTok rechaza un video muy largo |
| Rate limit | **Sí**, con backoff | 429 de Ayrshare |
| Timeout / error temporal de red | **Sí**, con backoff | Timeout del circuit breaker |
| Error permanente del proveedor (5xx sostenido) | Limitado (el circuit breaker ya corta esto solo) | — |
| Parcialmente exitoso (2 de 3 redes ok) | Reintentar **solo** las redes que fallaron, no las 3 | — |

**Evitar publicaciones duplicadas por timeout**: el caso feo es "mandamos el POST, se cayó la conexión
antes de recibir respuesta, pero Ayrshare sí lo procesó — si reintentamos ciegamente, se publica 2 veces".
Estrategia: generar un `requestId` (UUID) **antes** de llamar a Ayrshare y guardarlo en
`ProviderRequestLog` (§2) antes de la llamada, no después. Si el proceso se cae a medias, al reiniciar se
puede verificar "¿ya existe un `ProviderRequestLog` con este `requestId` en estado `succeeded=true`?"
antes de reintentar — evita reenviar si ya se confirmó éxito, aunque el proceso local no se haya enterado.

**Evitar métricas duplicadas**: cubierto en §9 (ventana de sync antes de crear).

**Restricciones únicas necesarias en BD**: `@@unique([postId, socialAccountId])` en `PostSocialAccount` ya
existe y ya cubre "no puede haber 2 entregas para el mismo post+red". No se necesita ninguna constraint
única adicional para idempotencia de publicación — la lógica de "ya se procesó" vive en
`ProviderRequestLog`, no en una constraint de la tabla de dominio.

---

## 17. Observabilidad y auditoría

Ya existen: `AuditLog` (por servicio, inmutable, solo INSERT — confirmado en ambos `schema.prisma`),
`LoggingInterceptor` y `AuditInterceptor` en `commons/interceptors/` (genéricos, sin uso confirmado en
ningún controller todavía, mismo patrón que los guards no aplicados de §14).

**¿`AuditLog` alcanza para las llamadas a Ayrshare?** No — `AuditLog` audita mutaciones de **dominio**
(quién cambió qué registro de negocio), con columnas `before`/`after` pensadas para diffs de entidades
Prisma. Una llamada HTTP a un tercero no es una mutación de entidad, es una interacción externa con su
propio ciclo de vida (request → response → posible reintento). Por eso se propuso `ProviderRequestLog`
en §2 — complementa a `AuditLog`, no lo reemplaza ni lo duplica.

**Qué sí/no registrar** (respuesta directa a lo pedido): operación, usuario, marca, publicación, redes
seleccionadas, id de Ayrshare, status HTTP, duración, resultado, intento número N — todo eso en
`ProviderRequestLog`. **Nunca**: API key, `ayrshareProfileKey` completo, contenido completo del post,
token de nada — si hace falta correlacionar, usar el `id` interno (`postId`, `brandId`), no el contenido.

---

## 18. Pruebas

**Estado real, no asumido**: revisé los 4 archivos de test que existen
(`apps/backend/test/auth.integration.spec.ts`, `apps/backend/test/posts-flow.spec.ts`,
`apps/e2e/src/full-flow.e2e.spec.ts`) — **los tres son placeholders literales**, cada `it(...)` es
`expect(true).toBe(true)` o un comentario `// TODO: implementar con supertest`. No hay ni un solo test
real ejecutándose hoy en el proyecto, ni de `auth` (que sí está terminado) ni de nada más. Esto es
relevante porque cualquier plan de pruebas para Ayrshare empieza literalmente desde cero, sin un ejemplo
real existente que copiar dentro del repo — solo el helper (`auth.helper.ts`, si genera JWTs de prueba
correctamente, y `db.helper.ts`, que sí limpia tablas reales de ambas bases) están listos para usarse.

**Propuesta de pruebas por capa**:
| Tipo | Qué cubre | Con mocks o real |
|---|---|---|
| Unitarias | Mappers por red (§7), cálculo de engagement con `reach=null` (§8), `validateTransition` (ya debería tener tests y no los tiene), agregación de estado por red (§4) | Puro, sin red ni BD |
| Integración | `PostsService.publish()` completo contra Postgres real (`db.helper.ts` ya limpia ambas BDs) | Mock de `AyrshareService` (nunca llamar a la API real en CI) |
| E2E | Flujo completo gateway→core-service→Postgres | Mock de Ayrshare a nivel de HTTP (interceptar con `nock`/similar) |
| Manual/sandbox | Un publish real contra el trial, una vez, para validar que el mapeo de campos es correcto | Real, pero solo manual, no en CI — el trial tiene límites de plan (§20) que no se deben gastar en cada corrida de CI |

**Casos específicos a cubrir** (de los pedidos explícitamente): idempotencia (reintentar tras timeout no
duplica), webhooks duplicados (si se adoptan), expiración de conexión, éxito parcial multi-red, cron con
fallo parcial no detiene el resto — todos unitarios/integración, ninguno necesita Ayrshare real.

**Partes difíciles de probar hoy por acoplamiento**: `score.service.ts` y `metrics-cron.service.ts`
importan `prisma` directo desde `../prisma/client` (singleton global, `prisma/client.ts:5-7`) en vez de
inyectarlo por constructor — dificulta mockear Prisma en un test unitario puro (hay que mockear el módulo
completo, no solo pasar un mock al constructor). No es bloqueante, pero vale la pena inyectar `PrismaClient`
por DI en los servicios nuevos (`AyrshareService`, `PostsService`) en vez de repetir el patrón de import
directo — mismo espíritu que ya siguen bien `CatalogsService`/`AuthService` (sí usan DI).

---

## 19. Configuración por ambientes

**Propuesta concreta** (usando el patrón Strategy, ya sugerido en la sección 19 del pedido, adaptado a
NestJS): una interfaz `SocialProvider` con métodos `publish()`, `getAnalytics()`, `connectProfile()`;
dos implementaciones, `MockSocialProvider` (envuelve la lógica que hoy vive en `decay-simulator.ts`,
adaptada a la misma interfaz) y `AyrshareProvider` (llama a la API real). Cuál se inyecta se decide por
`SOCIAL_PROVIDER=mock|ayrshare` en env, resuelto en el `module` con un factory provider
(`useFactory`) — patrón estándar de Nest, no hace falta nada custom.

Esto resuelve directamente lo pedido: "el simulador actual no debe mezclarse con la implementación
productiva" — quedan como 2 clases que implementan el mismo contrato, nunca una llamando a la otra.

| Ambiente | Provider | Nota |
|---|---|---|
| Desarrollo local | `mock` por defecto | No gasta el trial mientras se itera en UI/lógica de negocio ajena a Ayrshare |
| CI | `mock` siempre | Nunca se debe llamar a Ayrshare real desde un pipeline automatizado |
| Staging/pruebas de integración | `ayrshare` (trial) | Aquí sí se valida contra la API real, manualmente |
| Producción | `ayrshare` (plan pagado) | — |

---

## 20. Límites del plan y costos

Retomando lo ya confirmado sobre el plan Launch (10 profiles, 130 accounts totales, trial de 28 días):
control de límites debe vivir en **una sola capa**, dentro de `AyrshareService` o justo antes de llamarlo
— no repartido entre controller y cron. Concretamente:
- Antes de crear un `Brand` nuevo con conexión a Ayrshare: verificar cuántos `Brand.ayrshareProfileKey`
  no-nulos existen ya (`count`) contra el tope de 10 — mejor fallar rápido con un mensaje claro que dejar
  que Ayrshare regrese un 4xx genérico.
- El cron de métricas, corriendo cada 6h sobre pocas decenas de `PostSocialAccount`, está muy lejos de
  cualquier rate limit razonable — no hace falta throttling adicional todavía.
- Sincronización manual (si el frontend algún día ofrece un botón "actualizar métricas ahora"): sí
  debería tener un rate limit interno simple (p. ej. no más de 1 vez cada 5 minutos por marca) para que
  un usuario no agote el cupo de la API a fuerza de clicks.

**A confirmar con la documentación/plan, no asumido aquí**: el rate limit exacto de requests/minuto del
plan Launch (no lo encontré especificado en la doc pública revisada) — antes de escribir el cliente HTTP,
alguien debe confirmarlo directo con soporte de Ayrshare o la doc de su cuenta ya activa.

---

## 21. Compatibilidad con la implementación actual — hallazgos consolidados

Lista concreta de lo detectado en esta auditoría (no especulativo, todo verificado leyendo el archivo):

| Hallazgo | Archivo | Severidad |
|---|---|---|
| `MetricsCronService` y `PostSchedulerService` no están registrados en ningún módulo — nunca corren | `core-service/src/app.module.ts` | **Alta** — hay que arreglarlo para que cualquier cosa de métricas/publicación funcione, con o sin Ayrshare |
| `PostSchedulerService.publishScheduledPosts()` ignora la máquina de estados y el modelo multi-red — solo cambia `Post.status` | `core-service/src/scheduler/post-scheduler.service.ts:10-22` | **Alta** — hay que reescribirlo, no parchearlo |
| `campaigns`, `reports`, `ideas` son controllers/services literalmente vacíos (sin un solo método) | `core-service/src/{campaigns,reports,ideas}/*.controller.ts` | Media — ya sabido, confirmado con lectura directa |
| `posts` no tiene controller/service/module — solo la máquina de estados | `core-service/src/posts/` | **Alta** — bloqueante para publicar nada real |
| `brands` no existe ni como carpeta | `core-service/src/` | **Alta** — ya identificado en conversación previa, confirmado de nuevo |
| `media` no tiene ningún módulo/servicio (solo modelo Prisma) | `core-service/src/` (carpeta inexistente) | Media — bloqueante para publicar contenido con imagen/video, no mencionado antes en esta conversación |
| `PermissionGuard` y `BrandAccessGuard` existen y funcionan pero no están aplicados en ningún controller | `commons/guards/permission.guard.ts`, `core-service/src/guards/brand-access.guard.ts` | Media |
| Todos los tests existentes son placeholders (`expect(true).toBe(true)`) | `apps/backend/test/*.spec.ts`, `apps/e2e/src/*.e2e.spec.ts` | Media |
| El seed (`packages/seed/src/index.js`) solo carga RBAC + usuarios + `UserProfile` — no hay `Brand`/`SocialAccount`/`Campaign`/`Post` de prueba | `packages/seed/src/index.js` | Baja-media — hace falta ampliarlo para poder probar el flujo completo sin crear todo a mano |
| `score.service.ts` promedia `engagement` de todas las redes sin normalizar el denominador | `core-service/src/score/score.service.ts:26-32` | Alta (una vez con datos reales) |
| Gateway solo proxea `auth`, `me`, `catalogs` | `gateway/src/main.ts` | Esperado, no es un bug — falta agregar rutas conforme se construyan módulos |
| DTOs de `campaigns`/`reports`/`ideas` existen como archivos pero están huérfanos (ningún controller los usa) | `core-service/src/{campaigns,reports,ideas}/dto/*.ts` | Baja — confirma que son stubs de andamiaje, no trabajo a medio hacer perdido |

No se encontraron: mocks de Ayrshare, TODOs mencionando Ayrshare, migraciones relacionadas, ni código
muerto relacionado a esta integración más allá de lo ya listado — es decir, la integración parte de cero
real, sin nada que reconciliar de intentos previos.

---

## 22. Obtención y consolidación de métricas por campaña

### 22.1 Relación entre campañas, publicaciones y publicaciones externas

Confirmado el flujo real que soporta el schema:
```
Campaign
  └── Post (N)              [Post.campaignId → Campaign]
       └── PostSocialAccount (N por Post, una por red)   [ya existe, es la "ExternalPost"]
            └── PostMetric (N capturas históricas)
```
Esto **ya representa correctamente** la jerarquía que la sección 22 pide verificar — la única pieza que
falta no es estructural, es de **consulta**: hoy nada en el código (ni `score.service.ts` ni ningún otro
archivo) hace este join completo Campaign→Post→PostSocialAccount→PostMetric agregando por campaña. Existe
el dato, no existe el query.

**¿Se mezclan/duplican métricas entre redes de un mismo post?** No a nivel de almacenamiento (cada
`PostMetric` apunta a un `PostSocialAccountId` específico, nunca a `Post` directo) — el riesgo de mezcla
está solo en el **código de agregación que aún no existe**, si se escribe mal (ver §22.4).

### 22.2 Fuente de las métricas de campaña

| Opción | Ventaja | Desventaja | Costo de consulta | Recomendación |
|---|---|---|---|---|
| Dinámico en cada consulta | Siempre actualizado, cero riesgo de inconsistencia | Costo de consulta crece con el número de posts de la campaña | Bajo con el volumen actual (decenas de posts por campaña) | ✅ **Recomendado ahora** |
| Agregados precalculados (`CampaignMetricSnapshot`) | Consulta instantánea sin importar volumen | Puede quedar desactualizado; hay que decidir cuándo recalcular | Alto costo de mantenimiento para el beneficio actual | Diferir — ver §22.8 |
| Híbrido (dinámico + snapshots periódicos) | Lo mejor de ambos una vez que hace falta histórico congelado | Complejidad doble | — | Adoptar **solo** cuando existan reportes que necesiten congelar un resultado pasado (§22.19), no antes |

**Justificación de no sobreingeniería**: con el volumen actual (pocas campañas, pocos posts cada una,
Prisma corriendo contra Postgres local) un query dinámico con los `include` correctos resuelve esto en
milisegundos. Precalcular agregados hoy sería resolver un problema de performance que no existe todavía.

### 22.3 Métricas mínimas de una campaña

| Métrica | ¿Confiable hoy? | Fuente | ¿Suma directa? |
|---|---|---|---|
| Total de publicaciones (internas) | ✅ | `count(Post)` por `campaignId` | Sí (son conteos, no audiencias) |
| Programadas/publicadas/fallidas/parciales | ✅ | `count(Post)` agrupado por `status` | Sí |
| Likes/comments/shares totales | ✅ (con la última captura por red, §22.9) | `PostMetric` vía `PostSocialAccount` | Sí, son aditivas |
| Guardados (`saves`) | Parcial — solo Instagram lo expone claro (§7), vive en `raw`, no en columna | — | No agregable de forma general todavía |
| Views/impressions totales | ✅ pero con matiz | `PostMetric.views` | Sí se pueden sumar, **pero no representan personas únicas** — aclarar en la UI |
| Reach total | ⚠️ | `PostMetric.reach` | **No sumar directo entre posts/redes** — mismo usuario puede estar en el reach de varios posts (ver §22.3 más abajo) |
| Clics totales | ❌ | No hay campo hoy, iría en `raw` si la red lo expone | — |
| Interacciones totales | ✅ | `likes+comments+shares` (+`saves` cuando aplique) | Sí, es la suma de las aditivas |
| Engagement rate de campaña | ✅ con fórmula correcta (§22.4) | Derivado | **No promediar tasas individuales** |
| Rendimiento promedio por publicación | ✅ | `interacciones totales / count(posts publicados)` | Derivado |
| Mejor publicación / mejor red | ✅ | `ORDER BY interacciones DESC LIMIT 1` agrupado | — |
| Cumplimiento de frecuencia | Parcial — depende de que `Campaign` tenga un objetivo de frecuencia definido (hoy no lo tiene, ver §22.12) | — | — |
| Score digital de campaña | ❌ no existe hoy, ver §22.13 | — | — |

**Riesgo de duplicidad de audiencia — explicado**: si la misma persona ve el post de Instagram y también
el de TikTok de la misma campaña, sumar `reach` de ambos cuenta a esa persona 2 veces — el "reach total de
campaña" no es "personas únicas alcanzadas", es "suma de exposiciones únicas por publicación". Hay que
nombrarlo así en cualquier UI/reporte (`reachTotal` con nota, no `uniqueReach`) para no prometer un dato
que el sistema no puede calcular sin acceso a audiencias cruzadas entre redes (que ninguna API pública
ofrece).

### 22.4 Reglas de agregación

| Métrica | Clasificación | Regla |
|---|---|---|
| likes, comments, shares | Aditiva | Sumar directo sobre la última captura de cada `PostSocialAccount` |
| views | Aditiva, pero no-única | Sumar, aclarar que son reproducciones no personas |
| reach | Aditiva con reserva | Sumar solo como "suma de exposiciones", nunca presentar como "alcance único de campaña" |
| engagementRate | **Derivada, no promediable** | `totalInteracciones / totalDenominador`, nunca `promedio(engagementRate_i)` — promediar tasas con denominadores distintos (una con reach de 200, otra con reach de 50,000) pesa igual algo que debería pesar 250x menos |
| followers | Snapshot de perfil, no de publicación | No se sim/agrega por campaña — es un dato de `SocialAccount` en un momento dado, se reporta aparte, nunca sumado a las métricas de posts |

**Fórmula recomendada**:
```
campaignEngagementRate = totalInteractions / totalDenominator
```
donde `totalDenominator` = suma de `reach` de las redes que sí lo exponen + suma de `views` de las que no
— **inconsistente entre sí si se mezclan ambos en un solo número**. Recomendación real: **no colapsar en
un solo `campaignEngagementRate` global** — reportar el engagement rate **por red** (cada una con su
propio denominador consistente) y, si de verdad se quiere un número único de campaña, dejarlo basado
únicamente en las redes que comparten el mismo tipo de denominador, marcando explícitamente cuáles quedaron
fuera (mismo principio que `engagementBase`, §2/§8).

### 22.5 Campañas multired — forma de respuesta

Sí, el endpoint de campaña debe devolver 2 niveles — resumen general + desglose por red — exactamente
como en el ejemplo del pedido. Lo que **no** debe ir en el resumen general: `engagementRate` combinado
entre redes con distinto denominador (queda solo dentro de `byNetwork`), y `reach` sin la aclaración de
que no es audiencia única.

### 22.6 Publicaciones multired y conteos

Confirmado que hace falta esta distinción explícita en cualquier respuesta de API:
```
totalPostsInternos       = count(Post)
totalPublicacionesExternas = count(PostSocialAccount)
publicacionesExitosas    = count(PostSocialAccount where status = publicado)
publicacionesFallidas    = count(PostSocialAccount where status = error)
```
Nombrar el campo `externalDeliveries`/`publicacionesExternas` explícitamente distinto de `posts` en
cualquier DTO — es una decisión de nombres barata que evita un bug de percepción (reportar "3
publicaciones" cuando el equipo creó 1 contenido).

### 22.7 Ventana temporal de la campaña

**Decisión de negocio explícitamente pendiente** (no resuelta por el código ni por este documento):
¿las métricas de una campaña finalizada siguen creciendo con interacciones posteriores, o se congelan en
la fecha de fin? El caso del ejemplo (post publicado el último día, la mayoría de interacciones llegan
la semana siguiente) es real y common — Instagram/TikTok siguen dando engagement días después de
publicado. Sugerencia (no impuesta): mostrar **ambos** — "métricas al cierre de campaña" (`endDate`) y
"métricas acumuladas a la fecha" (ahora) — pero esto lo debe decidir producto, no ingeniería.

### 22.8 Snapshots de métricas de campaña — veredicto

**No se recomienda `CampaignMetricSnapshot` todavía.** Justificación punto por punto de lo pedido:
- ¿El histórico se puede obtener desde `PostMetric`? Sí — cada captura ya tiene `capturedAt`, alcanza para
  graficar evolución sin tabla nueva.
- ¿El costo de agregación es aceptable? Sí, con el volumen actual (§22.2).
- ¿Se necesitan gráficas de evolución? Si sí, se construyen agrupando `PostMetric.capturedAt` por día —
  no requiere snapshot de campaña, requiere una consulta agrupada (§14 del pedido, ver §22.9).
- ¿Se necesita congelar campañas terminadas? Aquí es donde **sí** empezaría a justificarse un snapshot —
  pero solo si el producto decide que un reporte de campaña cerrada no debe cambiar nunca más (§22.7). Si
  esa decisión se toma que sí, el modelo del ejemplo (`CampaignMetricSnapshot`) es razonable tal cual lo
  plantea el pedido original — pero se crea **cuando se tome esa decisión de producto**, no antes.

### 22.9 Última captura frente a histórico

Confirmado el riesgo señalado en el pedido: sumar todas las capturas de `PostMetric` de un
`PostSocialAccount` sería incorrecto (`likes` es un contador acumulado por captura, no incremental — cada
fila ya trae el total a esa fecha, no una diferencia). La solución más simple y segura en Prisma+Postgres:

```sql
SELECT DISTINCT ON (post_social_account_id) *
FROM post_metrics
WHERE post_social_account_id IN (...)
ORDER BY post_social_account_id, captured_at DESC;
```
`DISTINCT ON` de Postgres es la herramienta correcta aquí — Prisma no tiene un equivalente nativo en su
query builder, así que esto es uno de los pocos lugares donde **sí se justifica SQL nativo**
(`prisma.$queryRaw`), en vez de traer todas las capturas a Node y filtrar en memoria (funciona con el
volumen actual, pero `DISTINCT ON` es igual de simple y no tiene ese límite). No se necesita `isLatest`
boolean, tabla separada, ni vista materializada — todas serían más complejas que este query para el
mismo resultado.

### 22.10 Métricas incrementales y crecimiento

Para calcular crecimiento durante un periodo (`likes al final − likes al inicio`), sí se necesitan 2
capturas de `PostMetric`: la más cercana (por debajo) a la fecha de inicio y la más reciente. Esto ya es
posible con el histórico que el cron genera cada 6h — no requiere ningún campo/tabla nueva, solo el mismo
patrón de `DISTINCT ON` pero acotado por rango de fecha en vez de "la más reciente sin límite". Casos
donde una métrica puede **bajar**: la red corrige un conteo, o el usuario borra el post (aunque
`PostSocialAccount` no tenga `deletedAt` propio hoy — ver siguiente sección) — el sistema no debe asumir
monotonicidad creciente en ningún cálculo de "velocidad de interacción".

### 22.11 Publicaciones eliminadas, fallidas o excluidas

| Estado | ¿Cuenta en total de contenidos? | ¿Cuenta en cumplimiento? | ¿Conserva histórico si se borra? |
|---|---|---|---|
| `borrador`/`en_revision` | No (no son publicaciones reales todavía) | No | — |
| `aprobado`/`programado` | Sí, como "planeadas" | Sí | — |
| `publicado` | Sí | Sí | Sí, siempre |
| `parcial` | Sí, con nota de qué red falló | Sí, parcialmente | Sí para las redes exitosas |
| `error`/`cancelado` | Sí, para métricas **operativas** (cumplimiento), no de **rendimiento** (no tienen `PostMetric`) | Cuenta como incumplimiento, no como logro | Sí (queda el intento registrado) |

`Post.deletedAt` ya existe (soft delete estándar del proyecto) — si un post se "elimina", sus
`PostSocialAccount`/`PostMetric` deben conservarse igual (no hay cascada de soft-delete automática en
Prisma, hay que hacerlo explícito en el service si algún día se soporta borrar un post publicado, algo que
hoy no tiene ni endpoint).

**Separación pedida explícitamente**:
- Métricas de rendimiento = likes/comments/shares/reach/views (solo de posts `publicado`/`parcial`).
- Métricas operativas = conteos de estado (cuántos fallaron, cuántos a tiempo).
- Métricas de cumplimiento = frecuencia vs. objetivo, solo si `Campaign` define un objetivo (§22.12).

### 22.12 Objetivos de campaña y KPIs

Hoy `Campaign.objective` es `String?` libre — no hay ningún campo medible. Evaluado igual que en §2: una
tabla `CampaignGoal` normalizada es **prematura** para el alcance actual (un solo objetivo de texto libre
por campaña, sin evidencia de que el producto necesite múltiples KPIs medibles por campaña todavía). Si
más adelante sí se necesita, la fórmula de cumplimiento sería directa:
```
porcentajeCumplimiento = valorActual / valorObjetivo * 100
```
con `valorActual` viniendo de la misma agregación de §22.3-22.4. No construir la tabla hasta que exista
un caso de uso concreto (p. ej. el frontend ya diseñando una pantalla de "progreso de objetivos").

### 22.13 Score digital por campaña

El `score.service.ts` actual está diseñado para `brandId`, no para campaña — reutilizarlo tal cual sería
incorrecto porque usa variables que no aplican de la misma forma a una campaña acotada en el tiempo
(p. ej. `consistency` mide "posts en horario pico / total", que tiene sentido para el histórico completo
de una marca pero es ruidoso con pocos posts de una campaña corta). **No reutilizar automáticamente** —
si se pide un score de campaña, debe ser una fórmula separada y más simple (probablemente solo
`engagement` + `frecuencia`, sin `consistency` ni `coverage`, que dependen de volumen que una campaña
corta no tiene) — y debe documentarse como una métrica distinta, no "el mismo score aplicado a otro
`id`".

### 22.14 Comparación entre campañas

Comparar totales crudos favorece campañas más largas/con más posts/redes — confirmado, es un riesgo real
si se expone tal cual en un dashboard. Indicadores normalizados recomendados: interacciones por
publicación, interacciones por día de duración, % de cumplimiento de objetivo (si existe), engagement
rate por red (nunca combinado). No se requiere ningún modelo nuevo para esto — son cálculos sobre los
datos que ya se agregan en §22.3-22.4, divididos por `count(posts)` o por duración en días.

### 22.15 Endpoint de métricas de campaña

Contrato propuesto, comparado contra las convenciones reales del proyecto (Nest + Swagger + DTOs con
`class-validator`, ver `docs/backend/guia-nuevos-modulos-backend.md`):
```
GET /campaigns/:campaignId/metrics?from=&to=&network=&groupBy=&includeHistory=
```
Response — mismo shape conceptual que propone el pedido original, con dos ajustes sobre lo ya analizado:
`byNetwork[].engagementRate` en vez de un `summary.engagementRate` combinado (§22.4), y `dataStatus`
(§22.16) siempre presente, no opcional. No implementar el DTO todavía — este contrato debe validarse
contra lo que el frontend de `analytics-front`/`brands-front` realmente necesita antes de fijarlo (no hay
ese consumo mapeado en `apps/frontend` todavía, sigue en modo mock).

### 22.16 Calidad y completitud de datos

Regla explícita, ya aplicada en todo este documento: **`null` = no disponible, `0` = medido y es cero** —
nunca colapsar ambos. Indicadores propuestos en `dataStatus`: `lastSyncedAt` (de `MetricSyncRun`, §2),
`partial: boolean`, `missingNetworks: string[]` (redes sin `reach` o sin ninguna captura reciente),
`coveragePercentage` (qué % de los `PostSocialAccount` de la campaña tienen al menos 1 `PostMetric`).

### 22.17 Sincronización de métricas por campaña

**La unidad correcta de procesamiento del cron es `PostSocialAccount`/`SocialAccount`, nunca
`Campaign`.** Confirmado el riesgo que señala el pedido: si el cron sincronizara "por campaña", y una
misma publicación estuviera asociada a más de una agrupación (no aplica hoy porque `Post.campaignId` es
único y opcional, pero sí aplicaría si el producto permite compartir posts entre campañas en el futuro),
se llamaría a Ayrshare 2 veces para la misma publicación externa. Diseño correcto:
```
Sincronización externa (cron) = itera PostSocialAccount publicados, llama Ayrshare 1 vez por cada uno
Agregación por campaña = query interna posterior, nunca dispara llamadas a Ayrshare
```
Estas dos cosas deben estar en archivos/servicios distintos (`AyrshareSyncService` vs.
`CampaignMetricsService`, por ejemplo) para que quede imposible mezclar ambas responsabilidades por
accidente.

### 22.18 Rendimiento de consultas

Con el volumen actual, no hay riesgo real de N+1 si se usa `include` de Prisma correctamente (traer
`Campaign → posts → socialAccounts → metrics` en un solo query anidado, no un loop de queries por post).
Índices a confirmar que existan (revisar la migración real, no asumir): `Post.campaignId`,
`PostSocialAccount.postId`, `PostSocialAccount.socialAccountId`, `PostMetric.postSocialAccountId` — todos
son FKs, y Prisma/Postgres normalmente indexan FKs automáticamente, pero vale confirmarlo en la migración
generada antes de asumir que el índice existe. No se recomienda caché ni vista materializada — no hay
evidencia de volumen que lo justifique, y agregar cualquiera de las dos ahora sería resolver un problema
hipotético a costa de complejidad real.

### 22.19 Reportes de campaña

El módulo `reports` es hoy un stub vacío (§21) — cuando se construya, debe decidir explícitamente si un
reporte generado es un **snapshot congelado** (guardar el resultado calculado + fecha de corte, para que
no cambie después) o un **cálculo en vivo** cada vez que se descarga. Dado que `Report.fileUrl` ya
sugiere que se genera un archivo físico (CSV/PDF, `ReportFormat` enum ya existe), lo coherente es que sea
snapshot: se calcula una vez al generar el archivo, se guarda el archivo, y ese archivo no cambia aunque
las métricas sigan evolucionando — igual que cualquier reporte financiero/PDF no se "actualiza solo".

### 22.20 Pruebas de métricas de campaña

Todos los casos listados en el pedido (campaña con 1 red, con varias, entrega parcial, reach nulo,
selección de última captura, cero vs. null, cambio de campaña de un post, etc.) son pruebas
**unitarias/integración puras sobre Postgres real** — ninguna requiere Ayrshare real ni mocks elaborados,
solo `db.helper.ts` (ya existe) sembrando `PostMetric` con distintos escenarios y verificando el resultado
del query de agregación. Es la parte de esta integración más barata de probar bien — no depende de
terceros en absoluto.

---

## Diseño consolidado de métricas por campaña

- **Fuente de datos**: `PostMetric`, última captura por `PostSocialAccount` (vía `DISTINCT ON`).
- **Relaciones usadas**: `Campaign → Post → PostSocialAccount → PostMetric` (ya existen todas).
- **Fórmulas**: aditivas para likes/comments/shares/views/reach (con las reservas de §22.3-22.4);
  `engagementRate` derivada de totales, nunca promedio de tasas; nada de score de campaña reutilizando
  `score.service.ts` tal cual.
- **Reglas de agregación**: por red primero, combinar después solo cuando el denominador es compatible.
- **Comportamiento multired**: resumen + desglose por red, nunca un solo número que mezcle denominadores.
- **Valores nulos**: `null` ≠ `0`, siempre explícito en la respuesta (`dataStatus`).
- **Ventana temporal**: decisión de negocio pendiente (§22.7), no resuelta por este documento.
- **Fecha de corte**: relevante solo para reportes generados (snapshot), no para la consulta en vivo.
- **Estrategia histórica**: dinámica ahora, snapshot de campaña diferido hasta que exista necesidad real
  de congelar resultados (§22.8).

## Matriz de agregación de métricas

| Métrica | Fuente | Operación | ¿Agregable entre redes? | Tratamiento de null | Observaciones |
|---|---|---|---|---|---|
| likes | `PostMetric.likes` | Suma | Sí | Excluir de la suma, no tratar como 0 | Aditiva pura |
| comments | `PostMetric.comments` | Suma | Sí | Igual que likes | Aditiva pura |
| shares | `PostMetric.shares` | Suma | Sí | Igual que likes | Aditiva pura |
| saves | `raw` (solo Instagram) | Suma parcial | No de forma general | No aplica (no normalizado) | Queda fuera del resumen general hasta que se normalice para más redes |
| views | `PostMetric.views` | Suma | Sí, con nota | Excluir | No son personas únicas |
| impressions | `raw`/`views` según red | Suma | Sí, con nota | Excluir | Se solapa conceptualmente con `views` según la red |
| reach | `PostMetric.reach` | Suma | Con reserva fuerte | Excluir (no ceros falsos) | Puede duplicar audiencia entre posts/redes |
| clicks | No existe hoy | — | — | — | Fuera de alcance hasta que exista contenido con links rastreables |
| interactions | Derivada (`likes+comments+shares[+saves]`) | Suma de aditivas | Sí | Se recalcula si algún componente es null | — |
| engagement rate | Derivada | `totalInteractions / totalDenominador` | **No promediar tasas** | `null` si no hay denominador | Reportar por red, no combinado |
| followers | `SocialAccount.followers` | Snapshot, no suma sobre posts | No aplica a nivel post | — | Es dato de cuenta, no de campaña |
| publicaciones (internas) | `count(Post)` | Conteo | Sí | — | Contenidos, no entregas |
| publicaciones exitosas/fallidas | `count(PostSocialAccount)` por status | Conteo | Sí | — | Entregas por red, no contenidos |

## Flujo de obtención de métricas por campaña (paso a paso)

1. Ayrshare devuelve métricas de una publicación externa (respuesta a `getAnalytics(socialPostId)`).
2. Se identifica a qué `PostSocialAccount` corresponde (por `socialPostId` o por el id de request que se
   guardó al publicar).
3. Se guarda la respuesta cruda en `PostMetric.raw` (§2).
4. El mapper de esa red (§7) normaliza a `{likes, comments, shares, views, reach, engagementBase}`.
5. Se crea la fila de `PostMetric` (captura histórica, nunca se actualiza una existente).
6. No se marca "última" de forma persistida — se calcula al consultar, vía `DISTINCT ON` (§22.9).
7. `PostSocialAccount` ya está relacionado con `Post` desde que se creó (paso de publicación, no de
   métricas).
8. `Post.campaignId` ya conecta con `Campaign` desde que se creó el post.
9. Al pedir métricas de campaña: se seleccionan las últimas capturas de todos los `PostSocialAccount` de
   todos los `Post` de esa `Campaign`.
10. Se agregan según la matriz de arriba (aditivas suman, `reach` con reserva, nada de promediar tasas).
11. Se calcula el desglose por red agrupando el mismo resultado por `socialNetworkId`.
12. Se calculan las métricas generales combinables (conteos, interacciones) — nunca `engagementRate`
    combinado.
13. Objetivos/score de campaña: **fuera de alcance hasta que existan** (§22.12/22.13).
14. Se informa completitud (`dataStatus`) comparando cuántos `PostSocialAccount` tienen al menos 1
    `PostMetric` reciente contra el total esperado.
15. Se devuelve — dinámico en cada request, sin persistir un resultado (salvo que sea para un `Report`
    generado, ahí sí se congela, §22.19).

## Consultas requeridas (conceptual)

- **Resumen general**: `Campaign.findUnique({ include: { posts: { include: { socialAccounts: {
  include: { metrics: { orderBy: { capturedAt: 'desc' }, take: 1 } } } } } } })` + reducción en código, o
  el equivalente en `$queryRaw` con `DISTINCT ON` si el volumen crece y este `include` anidado empieza a
  pesar.
- **Por red**: mismo resultado, agrupado por `socialAccount.socialNetworkId` en memoria (volumen bajo) o
  `GROUP BY` en SQL nativo si crece.
- **Evolución diaria**: `GROUP BY date_trunc('day', capturedAt)` sobre `PostMetric` filtrado por los
  `postSocialAccountId` de la campaña — SQL nativo, Prisma no tiene `date_trunc` nativo en su query
  builder.
- **Mejores publicaciones**: `ORDER BY (likes+comments+shares) DESC LIMIT N` sobre la última captura de
  cada `PostSocialAccount` de la campaña.
- **Última sincronización**: `MetricSyncRun` más reciente con `status = completed` (§2/§9).
- **Campañas con información incompleta**: comparar `count(PostSocialAccount con status=publicado)`
  contra `count(PostSocialAccount con al menos 1 PostMetric en las últimas N horas)`.

## Veredicto específico sobre campañas

- **¿El esquema actual puede obtener métricas por campaña?** Sí, sin cambios estructurales — las
  relaciones ya existen y son correctas.
- **¿Las relaciones actuales son suficientes?** Sí.
- **¿`PostMetric` está conectado al nivel correcto?** Sí — cuelga de `PostSocialAccount`, no de `Post`,
  que es exactamente el nivel correcto para no mezclar redes.
- **¿Se necesita una entidad de "publicación externa"?** No, ya existe: es `PostSocialAccount`.
- **¿Se requieren snapshots de campaña?** No todavía — diferir hasta que exista necesidad real de
  congelar resultados (reportes históricos que no deban cambiar).
- **¿Las consultas pueden hacerse dinámicamente?** Sí, con el volumen actual.
- **Cambios obligatorios**: registrar los cron en un módulo real (§10); reescribir
  `PostSchedulerService` para respetar multi-red (§4); construir `posts`, `brands`, `media` (bloqueantes,
  no específicos de campañas pero sin ellos no hay datos que agregar); corregir `score.service.ts` para no
  promediar denominadores distintos (§8).
- **Cambios opcionales**: `CampaignMetricSnapshot`, `CampaignGoal`, score de campaña separado, webhooks —
  todos diferibles sin bloquear un MVP funcional.
- **Decisiones de negocio pendientes** (ninguna resuelta por ingeniería): ventana temporal de campaña
  finalizada (§22.7), si un `engagementRate` combinado de campaña se muestra alguna vez o se queda solo
  por red, si se permiten 2 cuentas de la misma red por marca (§6), si el contenido se adapta por red
  (§3).
