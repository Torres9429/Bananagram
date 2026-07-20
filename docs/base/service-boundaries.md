# Límites de servicio — separación de `modelo.txt` por microservicio

> Documento de análisis, complementario a `docs/base/modelo2.txt` (el schema
> separado por servicio). No se tocó el modelo maestro `docs/base/modelo.txt`
> al elaborarlo — se mantiene intacto como referencia.
>
> La organización final del backend es de **3 microservicios**: `auth-service`,
> `core-service` (fusiona lo que antes eran `brands-service` + `content-service`
> + `analytics-service`) y `alexa-service` (BFF de la Alexa Skill, **sin base
> de datos propia** — no es dueño de ninguna tabla, solo consume las APIs de
> los otros dos). Este documento reemplaza una versión anterior que asumía 4
> microservicios con datos propios cada uno.

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
| **auth-service** (3001) | `Role`, `Module`, `Action`, `RolePermission`, `RefreshToken`, `Notification`, `Category`, `Specialty`, `User`, `UserCategory`, `UserSpecialty`, `PasswordResetToken` |
| **core-service** (3002) | `SocialNetwork`, `Brand`, `SocialAccount`, `Campaign`, `CampaignDesigner`, `CampaignCategory`, `Post`, `PostStatusHistory`, `PostSocialAccount`, `Media`, `PostMedia`, `ContentIdea`, `PostMetric`, `BrandScore`, `Report` |
| **alexa-service** (3004) | **ninguno** — sin schema/DB propio. Consume: |
| | ↳ de **core-service**: `GET /campaigns/mine`, `GET /campaigns/:id/metrics-summary`, `GET /campaigns/:id/top-content`, `GET /campaigns/:id/summary`, `POST/GET /campaigns/:id/ideas`, `DELETE /ideas/:id` |
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
`ContentIdea.campaignId`, el cron de métricas leyendo
`SocialNetwork.baseEngagementRate`) **desaparecen como cadenas cruzadas**: son
joins/queries normales de Prisma dentro de `core-service`. Esto además
resuelve de raíz la violación que existía en código real
(`score.service.ts`/`metrics-cron.service.ts` leían `Post`/`BrandProfile`
cruzando límites de servicio) — bajo este modelo esa lectura es local y
legítima, y los endpoints internos batch que se planeaban para evitarla ya
no son necesarios.

Lo único que sigue siendo una FK cruzada real a nivel de modelo de datos es
identidad (auth-service ↔ core-service):

| # | Cadena | Dirección | Estrategia | Razón |
|---|---|---|---|---|
| 1 | `Brand.ownerId → User` | core → auth | FK sin constraint. Validar propiedad = comparar `ownerId` contra el `userId` del JWT (sin llamada). Mostrar nombre/email del dueño = HTTP GET puntual. | ADR-0002 ya embebe identidad en el JWT; solo el *display* necesita una lectura en vivo, y es de bajo volumen (vistas de detalle de marca). |
| 2 | `Campaign.cmId`, `CampaignDesigner.userId`, `Campaign.createdBy → User` | core → auth | FK sin constraint + HTTP en ambas direcciones: (i) resolver nombres para mostrar, (ii) core-service pide a auth-service la lista de CM/Diseñadores elegibles por categoría al armar el equipo. | `docs/docs-front/frontend-db-alignment.md` ya estableció que el equipo de campaña vive en `Campaign`/`CampaignDesigner`, nunca denormalizado en `User` — este es el equivalente a nivel de backend de esa misma regla. |
| 3 | `Post.createdBy`, `PostStatusHistory.changedBy`, `Media.uploadedBy`, `Report.requestedBy`, `ContentIdea.createdBy → User` | core → auth | Escritura: FK poblada desde el JWT, sin llamada. Lectura: **endpoint nuevo** `GET /internal/users?ids=...` (bulk) en auth-service, para evitar N+1 al renderizar listas. | El camino de escritura es gratis; el de lectura requiere una pieza nueva — se deja marcado como trabajo real, no se asume que ya existe. |
| 4 | `Brand.categoryId`, `Campaign→CampaignCategory.categoryId → Category` | core → auth | FK sin constraint; resolver vía HTTP si la vista necesita el nombre de la categoría. | Ver nota de `Category` en la sección auth-service de `modelo2.txt` — llamada de juicio, no hecho cerrado (punto 6 más abajo). |
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
| `POST/GET /campaigns/:id/ideas` | core-service | `SaveIdeaIntent`, `SaveCustomIdeaIntent`, `GetSavedIdeasIntent` |
| `DELETE /ideas/:id` | core-service | `DeleteIdeaIntent` |

Ver `docs/skill/AlexaSkill-Diseno-Final.md` para el detalle completo de la
skill.

## 3. Pendientes conocidos, no resueltos en este documento

- `docs/todos/database.md` necesita reflejar que Marcas/Contenido/Analítica
  viven todas en `core-service` (sección 1), y agregar `content_ideas` como
  tabla del dominio de Contenido.
- Los 6 placeholders de `docs/swagger/*.yaml` deben consolidarse a 3
  servicios reales (`auth-service.yaml`, `core-service.yaml`,
  `alexa-service.yaml`).
- core-service todavía no expone los endpoints que `alexa-service` necesita
  consumir (`GET /campaigns/mine`, `.../metrics-summary`, `.../top-content`,
  `.../summary`, CRUD de `.../ideas`) — son trabajo real pendiente, no algo
  que ya exista.
- El cálculo real del **Score Digital** no existe en ningún lado todavía
  (hoy es un snapshot mock estático en frontend); `getMyCampaigns()` no
  filtra por usuario autenticado; el matching CM↔categoría
  (`getAvailableCMsForCategory`) es hoy lógica de frontend, candidata a
  moverse a backend — los tres puntos ya señalados en
  `docs/docs-front/frontend-functional-documentation.md` §17.2–17.3, se
  referencian aquí como deuda de backend, no se rediseñan en este documento.
- `docs/profile-domain-and-analytics-v2-impact-analysis.md` (v3) es una
  propuesta de rediseño de dominio **separada y no adoptada** (Brand→Profile,
  el usuario *es* un perfil, campañas con `socialAccountIds` explícito). El
  propio documento difiere su alineación de backend a una
  **"Fase G (futura), si se decide"** — se anota aquí como antecedente a
  vigilar; `modelo2.txt` sigue el modelo Brand vigente de `docs/base/modelo.txt`.
- Aún no se decide si `Category` es dueño de auth-service o core-service
  (ver sección 4, punto 6) — es la única llamada de juicio genuinamente
  abierta de este análisis.

## 4. Decisiones de arquitectura confirmadas

1. **`core-service` fusiona brands+content+analytics**: toda la data de
   negocio del sistema (marcas, redes sociales, campañas, publicaciones,
   medios, métricas, score, reportes, ideas de contenido) vive en un solo
   servicio con una sola base de datos. Resuelve de raíz la ambigüedad
   histórica sobre dónde vivía `Campaign` (ver nota en sección 1) y la
   violación ya existente en código de `analytics` leyendo `Post`/
   `BrandProfile` cruzando límites de servicio.
2. **`alexa-service` no tiene base de datos propia.** Es un BFF puro: recibe
   los intents del Lambda de la Alexa Skill y los traduce en llamadas HTTP a
   `core-service` (datos de negocio) y `auth-service` (identidad,
   account-linking). `ContentIdea` — pensado originalmente como dominio de
   un futuro servicio dedicado a Alexa — se queda en `core-service`, no en
   `alexa-service`.
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
6. **`Category`** (única llamada de juicio abierta): se propone dueño
   **auth-service**, junto a `Role`/`Module`/`Action`, porque reutiliza una
   dependencia que casi todo servicio ya necesita hacia auth. La alternativa
   —core-service, mayor consumidor real vía `Brand` + `Campaign`— es igual
   de defendible. Cambiar esta decisión es mover una sección de
   `docs/base/modelo2.txt`, no rediseñar el archivo.
