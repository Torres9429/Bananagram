# Límites de servicio — separación de `modelo.txt` por microservicio

> Documento de análisis, complementario a `docs/base/modelo2.txt` (el schema
> separado por servicio). No se tocó el modelo maestro `docs/base/modelo.txt`
> al elaborarlo — se mantiene intacto como referencia.
>
> La organización final del backend es de **3 microservicios**: `auth-service`,
> `core-service` (fusiona lo que antes eran `brands-service` + `content-service`
> + `analytics-service`) y `alexa-service` (BFF de la Alexa Skill). Este
> documento reemplaza una versión anterior que asumía 4 microservicios con
> datos propios cada uno.
>
> **Actualización 2026-08-14**: `alexa-service` dejó de ser un BFF sin datos
> propios. El dominio `ContentIdea` se mudó entero ahí (antes vivía en
> `core-service`) — `alexa-service` tiene su propio `prisma/schema.prisma`
> (solo ese modelo) con acceso **directo** (no HTTP) a la misma base física
> de `core-service` (`gestor_redes_core`); nunca corre `prisma migrate` desde
> ahí, `core-service` sigue siendo el dueño exclusivo de la migración. Para
> todo lo demás (campañas, marcas, métricas, score, account-linking)
> `alexa-service` sigue siendo un BFF puro por HTTP contra
> `core-service`/`auth-service`, sin cambios respecto a lo descrito abajo.

## Principio rector

Para cada dato o pieza de lógica que hoy cruza dominios, la pregunta se hizo
en este orden:

1. **¿Le pertenece de verdad a otro servicio?** → se reubica la propiedad
   ahí. Con la fusión en `core-service`, la mayoría de estos casos
   (marcas ↔ campañas ↔ publicaciones ↔ analítica) ya no cruzan servicio
   alguno: son el mismo proceso y la misma base de datos.
2. **¿La referencia es genuinamente irreducible** (identidad, un límite
   operativo real entre servicios)? → se resuelve vía HTTP síncrono a
   través del circuit breaker existente
   (`apps/backend/commons/circuit-breaker/opossum.factory.ts`, implementado
   pero sin usar hoy), nunca por `SELECT`/join directo entre bases de datos.

La llamada HTTP entre servicios **no es el mecanismo por defecto** — es el
último recurso, documentado explícitamente caso por caso en la sección 2.

## 1. Mapa de propiedad por servicio

| Servicio | Modelos (fuente de verdad) |
|---|---|
| **auth-service** (3001) | `Role`, `Module`, `Action`, `RolePermission`, `RefreshToken`, `Notification`, `User`, `PasswordResetToken` |
| **core-service** (3002) | `Category`, `Specialty`, `SocialNetwork`, `UserProfile`, `UserProfileCategory`, `UserProfileSpecialty`, `Brand`, `SocialAccount`, `Campaign`, `CampaignDesigner`, `CampaignCategory`, `Post`, `PostStatusHistory`, `PostSocialAccount`, `Media`, `PostMedia`, `PostMetric`, `BrandScore`, `Report` |
| **alexa-service** (3004) | `ContentIdea` — **único dueño de este dominio en todo el sistema** (se movió desde `core-service`, ver nota 2026-08-14 arriba). No tiene un `prisma migrate` propio: su `schema.prisma` declara solo `ContentIdea` y apunta por `DATABASE_URL_CORE` a la misma base física de `core-service` (`gestor_redes_core`), con acceso directo de lectura/escritura (sin HTTP, sin pasar por `core-service`). Para todo lo demás no tiene schema/DB propio. Consume: |
| | ↳ de **core-service**: `GET /campaigns/mine`, `GET /campaigns/:id/metrics-summary`, `GET /campaigns/:id/top-content`, `GET /campaigns/:id/summary` |
| | ↳ de **auth-service**: `GET /oauth/authorize`, `POST /oauth/token` (account-linking de la Alexa Skill) |
| **cross-cutting** | `AuditLog` — auth-service y core-service tienen cada uno su propia copia local (sección 4, punto 5) |

### Nota histórica: la contradicción sobre `Campaign` (ya no aplica)

Antes de la fusión existían tres versiones distintas de dónde vivía
`Campaign` (`docs/todos/architecture.md` la asignaba a brands-service,
`docs/todos/database.md` la agrupaba bajo "Contenido" junto a `posts`, y los
6 placeholders de `docs/swagger/*.yaml` la separaban en un archivo aparte sin
resolver la ambigüedad). Con `Campaign` y `Post` en el mismo `core-service`,
la pregunta queda sin objeto — es el mismo servicio de todas formas. Se deja
esta nota solo como antecedente de por qué `modelo2.txt` documentaba
`Campaign` con tanto detalle de propiedad en versiones anteriores.

## 2. Cadenas de FK cruzadas — estrategia por cadena

Con la fusión, las cadenas que antes cruzaban brands ↔ content ↔ analytics
(validación de `Post.brandId`/`campaignId`, `PostSocialAccount.socialAccountId`,
`PostMetric.postSocialAccountId`, `BrandScore.brandId`, `Report.brandId`,
el cron de métricas leyendo `SocialNetwork.baseEngagementRate`) **desaparecen
como cadenas cruzadas**: son joins/queries normales de Prisma dentro de
`core-service`. Esto además resuelve de raíz la violación que existía en
código real (`score.service.ts`/`metrics-cron.service.ts` leían `Post`/
`BrandProfile` cruzando límites de servicio) — bajo este modelo esa lectura
es local y legítima, y los endpoints internos batch que se planeaban para
evitarla ya no son necesarios.

`ContentIdea.campaignId` es la excepción: desde que `ContentIdea` se mudó a
`alexa-service` (2026-08-14) vuelve a ser una referencia cruzada — pero no
se resuelve por HTTP ni por `@relation` de Prisma (el modelo `Campaign` no
existe en el `schema.prisma` de `alexa-service`), sino por acceso directo de
`alexa-service` a la misma base física de `core-service` vía su propio
Prisma Client. Es una FK "sin constraint" en el sentido estricto (sin
`@relation` declarado, sin validación de integridad referencial entre
schemas), documentada aquí y en `docs/base/modelo2.txt`.

Lo único que sigue siendo una FK cruzada real a nivel de modelo de datos es
identidad (auth-service ↔ core-service):

| # | Cadena | Dirección | Estrategia | Razón |
|---|---|---|---|---|
| 1 | `Brand.ownerId → User` | core → auth | FK sin constraint. Validar propiedad = comparar `ownerId` contra el `userId` del JWT (sin llamada). Mostrar nombre/email del dueño = HTTP GET puntual. | ADR-0002 ya embebe identidad en el JWT; solo el *display* necesita una lectura en vivo, y es de bajo volumen (vistas de detalle de marca). |
| 2 | `Campaign.cmId`, `CampaignDesigner.userId`, `Campaign.createdBy → User` | core → auth | **Implementado 2026-08-01, distinto de lo que decía esta fila antes**: FK sin constraint, sin HTTP en ningún sentido. `UserProfile.roleName` (denormalizado, sincronizado one-way vía `POST /internal/user-profiles` al registrar/completar perfil) es lo que `CampaignsService.assertUserHasRole` valida al crear una campaña o asignar un diseñador, y también lo que filtran `GET /campaigns/eligible-community-managers`/`eligible-designers` (devuelven `userId`/`name`/`avatarUrl`, ya no hace falta resolver nombres por HTTP tampoco). | Evita HTTP síncrono en el camino caliente de crear campañas/asignar equipo — el costo es que `roleName` puede desincronizarse si el rol de un usuario cambia después en `auth-service` (nada lo re-sincroniza hoy, ver nota en `modelo2.txt`). El matching por categoría (no solo por rol) sigue sin implementarse — ver §3. |
| 3 | `Post.createdBy`, `PostStatusHistory.changedBy`, `Media.uploadedBy`, `Report.requestedBy` → User | core → auth | Escritura: FK poblada desde el JWT, sin llamada. Lectura: **endpoint nuevo** `GET /internal/users?ids=...` (bulk) en auth-service, para evitar N+1 al renderizar listas. | El camino de escritura es gratis; el de lectura requiere una pieza nueva — se deja marcado como trabajo real, no se asume que ya existe. |
| 3b | `ContentIdea.createdBy → User` | alexa-service → auth | Mismo criterio que la fila #3 (FK poblada desde el JWT al escribir, sin llamada). Se separa de la fila #3 porque desde 2026-08-14 `ContentIdea` ya no vive en `core-service` sino en `alexa-service` — el servicio de origen de la cadena cambió aunque el mecanismo no. | `ContentIdea` es el único modelo de `core → auth` de la fila #3 que se movió de servicio; el resto sigue en `core-service`. |
| 4 | `Brand.categoryId`, `Campaign→CampaignCategory.categoryId → Category` | core → core | Ya no es FK cruzada: categorías viven en core-service junto con brand/campaign. |
| 5 | `AuditLog.performedBy → User` | auth-service y core-service → auth | FK sin constraint, poblada desde el JWT al escribir (sin llamada). Lectura de nombre reutiliza el mismo bulk endpoint de la cadena #3, si algún día se construye una vista unificada. | Cubierto por la decisión de `AuditLog` en la sección 4. |

Y la relación de **alexa-service** con los otros dos, que no es una FK sino
consumo puro de API (no hay columnas propias que resolver):

| Endpoint consumido | Servicio dueño | Usado por (intent de la skill) |
|---|---|---|
| `GET /oauth/authorize`, `POST /oauth/token` | auth-service | Account-linking (fuera de los intents de voz) |
| `GET /campaigns/mine` | core-service | `LaunchRequest`, `GetActiveCampaignsIntent` |
| `GET /campaigns/:id/metrics-summary` | core-service | `GetCampaignMetricsIntent`, saludo al entrar a una campaña |
| `GET /campaigns/:id/top-content` | core-service | `GetTopContentIntent` |
| `GET /campaigns/:id/summary` | core-service | `GetCampaignSummaryIntent`, `GetIdeaRecommendationsIntent` |

`SaveIdeaIntent`, `SaveCustomIdeaIntent`, `GetSavedIdeasIntent` y
`DeleteIdeaIntent` **ya no están en esta tabla**: desde que `ContentIdea` se
mudó a `alexa-service` (2026-08-14), esos intents se resuelven con el propio
`IdeasController`/`IdeasService` de `alexa-service`
(`apps/backend/services/alexa-service/src/ideas/`, CRUD completo sobre
`content_idea` vía su Prisma Client local) — no hay llamada HTTP a
`core-service` para ideas. El gateway rutea `/api/ideas/*` a
`ALEXA_SERVICE_URL`, no a `CORE_SERVICE_URL` (`apps/backend/gateway/src/main.ts`).

El contrato vigente de las 6 funciones de la skill (`fetchUserByLinkCode`,
`fetchCampaigns`, `fetchContentIdeas`, `fetchSavedIdeas`, `saveIdeaToBackend`,
`deleteIdeaFromBackend`) está en
`docs/todos/2026-08-10-ayrshare-pipeline-alexa-endpoints-plan.md` —
`docs/skill/AlexaSkill-Diseno-Final.md` quedó descartado (diseño anterior,
con el Lambda llamando a Claude directo).

## 3. Pendientes conocidos, no resueltos en este documento

- `docs/todos/database.md` necesita reflejar que Marcas/Contenido/Analítica
  viven todas en `core-service` (sección 1). `content_ideas` es la excepción
  a anotar ahí: la tabla vive físicamente en la base de `core-service`
  (`gestor_redes_core`), pero su schema/dueño es `alexa-service` desde
  2026-08-14 (ver sección 1 y 4.2 de este documento) — no es una tabla más
  del dominio de Contenido de `core-service`.
- Los 6 placeholders de `docs/swagger/*.yaml` deben consolidarse a 3
  servicios reales (`auth-service.yaml`, `core-service.yaml`,
  `alexa-service.yaml`).
- Sin confirmar contra el código actual de `core-service` en este documento
  si `GET /campaigns/mine`, `.../metrics-summary`, `.../top-content` y
  `.../summary` ya están expuestos tal cual con esos nombres — no se auditó
  como parte de esta actualización (2026-08-17), solo se corrigió lo de
  `ContentIdea`/ideas. El CRUD de ideas **ya no aplica aquí**: vive entero en
  `alexa-service`, no es algo que `core-service` deba exponer (ver sección 1
  y 2 arriba).
- El cálculo real del **Score Digital** no existe en ningún lado todavía
  (hoy es un snapshot mock estático en frontend); `getMyCampaigns()` no
  filtra por usuario autenticado; el matching CM↔categoría
  (`getAvailableCMsForCategory`) es hoy lógica de frontend, candidata a
  moverse a backend — los tres puntos ya señalados en
  `docs/docs-front/frontend-functional-documentation.md` §17.2–17.3, se
  referencian aquí como deuda de backend, no se rediseñan en este documento.
  **Actualización 2026-08-01**: el backend ya expone selectores reales
  (`GET /campaigns/eligible-community-managers`/`eligible-designers`, ver
  fila #2 de la tabla de arriba) pero **solo filtran por rol**
  (`UserProfile.roleName`), no por categoría — el matching CM↔categoría en
  sí sigue sin moverse del frontend (regla de negocio #8: es orientativo, no
  restrictivo, así que no bloquea nada, pero tampoco se usa para acotar la
  lista todavía).
- `docs/profile-domain-and-analytics-v2-impact-analysis.md` (v3) es una
  propuesta de rediseño de dominio **separada y no adoptada** (Brand→Profile,
  el usuario *es* un perfil, campañas con `socialAccountIds` explícito). El
  propio documento difiere su alineación de backend a una
  **"Fase G (futura), si se decide"** — se anota aquí como antecedente a
  vigilar; `modelo2.txt` sigue el modelo Brand vigente de `docs/base/modelo.txt`.
- `Category`, `Specialty` y `SocialNetwork` ya se consideran catálogo base
   de `core-service`; `auth-service` queda como dueño solo de identidad y
   acceso.

## 4. Decisiones de arquitectura confirmadas

1. **`core-service` fusiona brands+content+analytics**: toda la data de
   negocio del sistema (marcas, redes sociales, campañas, publicaciones,
   medios, métricas, score, reportes) vive en un solo servicio con una sola
   base de datos. Resuelve de raíz la ambigüedad histórica sobre dónde vivía
   `Campaign` (ver nota en sección 1) y la violación ya existente en código
   de `analytics` leyendo `Post`/`BrandProfile` cruzando límites de servicio.
   Las ideas de contenido (`ContentIdea`) son la excepción, ya no forman
   parte de esta fusión desde 2026-08-14 — ver punto 2 siguiente.
2. **`alexa-service` no tiene una base de datos propia que migre, pero desde
   2026-08-14 sí es dueño de un modelo: `ContentIdea`.** Para
   campañas/marcas/métricas/score/account-linking sigue siendo un BFF puro:
   recibe los intents del Lambda de la Alexa Skill y los traduce en llamadas
   HTTP a `core-service` (datos de negocio) y `auth-service` (identidad,
   account-linking). Pero `ContentIdea` — pensado originalmente como dominio
   de un futuro servicio dedicado a Alexa — terminó mudándose entero ahí
   (antes vivía en `core-service`): `alexa-service` tiene su propio
   `prisma/schema.prisma` (solo ese modelo) con acceso **directo** de
   lectura/escritura a la misma base física de `core-service`
   (`gestor_redes_core`, vía `DATABASE_URL_CORE`), sin pasar por HTTP y sin
   correr `prisma migrate` desde ahí — `core-service` sigue siendo el dueño
   exclusivo de esa migración. Es el único dominio de todo el sistema donde
   `alexa-service` es la fuente de verdad en vez de consumir la API de otro
   servicio.
3. **Notificaciones**: llamada HTTP síncrona desde core-service hacia un
   endpoint interno de auth-service (dueño de `Notification`) al ocurrir el
   evento. Es irreducible — el evento nace donde nace, no se puede reubicar.
   No se revive un microservicio aparte (`notifications-service`,
   mencionado como posibilidad en
   `docs/especificacion-funcional-roles.md:271` pero descartado aquí).
4. **`SocialNetwork.baseEngagementRate`**: antes requería una llamada HTTP
   por corrida de cron (analytics-service → brands-service); con la fusión
   es una lectura local normal dentro de core-service.
5. **`AuditLog`**: auth-service y core-service escriben cada uno su propia
   tabla local, poblada directo desde el `userId` del JWT — sin llamada
   cruzada para escribir. Una vista unificada de auditoría, si se necesita,
   queda como trabajo futuro de lectura/agregación, no como problema de
   propiedad hoy.
6. **Catálogos base**: `Category`, `Specialty` y `SocialNetwork` viven en
   `core-service`, no en `auth-service`. Esto hace coherente el primer slice
   del dominio y evita cruzar la misma dependencia por HTTP.
