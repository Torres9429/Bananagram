# Límites de servicio — separación de `modelo.txt` por microservicio

> Documento de análisis, complementario a `docs/base/modelo2.txt` (el schema
> separado por servicio). No se tocó código de `apps/backend/` al elaborarlo.
> Se mantienen exactamente los 4 microservicios actuales (auth, brands,
> content, analytics) — no se agrega un 5º ni se fusionan dos en uno.

## Principio rector

Para cada dato o pieza de lógica que hoy cruza dominios, la pregunta se hizo
en este orden:

1. **¿Le pertenece de verdad a otro servicio?** → se reubica la propiedad
   ahí (ejemplo: `Campaign` se consolida en brands-service, ver más abajo).
2. **¿La referencia es genuinamente irreducible** (identidad, o un límite
   operativo real entre servicios — p. ej. el ciclo de vida de un `Post` es
   una responsabilidad distinta de la analítica que se calcula sobre él)?
   → se resuelve vía HTTP síncrono a través del circuit breaker existente
   (`apps/backend/commons/circuit-breaker/opossum.factory.ts`, implementado
   pero sin usar hoy), nunca por `SELECT`/join directo entre bases de datos.

La llamada HTTP entre servicios **no es el mecanismo por defecto** para todo
lo que cruza una FK — es el último recurso, documentado explícitamente caso
por caso en la tabla de la sección 2.

## 1. Mapa de propiedad por servicio

| Servicio | Modelos (fuente de verdad) |
|---|---|
| **auth-service** (3001) | `Role`, `Module`, `Action`, `RolePermission`, `RefreshToken`, `Notification`, `Category`, `Specialty`, `User`, `UserCategory`, `UserSpecialty`, `PasswordResetToken` |
| **brands-service** (3002) | `SocialNetwork`, `Brand`, `SocialAccount`, `Campaign`, `CampaignDesigner`, `CampaignCategory` |
| **content-service** (3003) | `Post` (+ snapshot `brandName`/`campaignName`), `PostStatusHistory`, `PostSocialAccount`, `Media`, `PostMedia`, `ContentIdea` |
| **analytics-service** (3005) | `PostMetric`, `BrandScore`, `Report` |
| **cross-cutting** | `AuditLog` — cada servicio tiene su propia copia local (sección 4, punto 6) |

### Resolución de la contradicción sobre Campaigns

Hoy conviven **tres versiones distintas** de dónde vive `Campaign`:

- `docs/architecture.md:9` asigna explícitamente "campañas y equipo" a
  **brands-service**.
- `docs/database.md:13` agrupa `campaigns`, `campaign_team` y
  `campaign_categories` bajo el dominio **"Contenido"**, junto con `posts` y
  `post_status_history` — implica content-service.
- `docs/swagger/*.yaml` tiene 6 archivos placeholder
  (`auth-service.yaml`, `brands-service.yaml`, `campaigns-service.yaml`,
  `metrics-service.yaml`, `posts-service.yaml`, `reports-service.yaml`) —
  separa `campaigns` y `posts` en dos archivos distintos, sin mapear a
  ninguno de los dos anteriores con claridad, y sin contenido real (son solo
  un comentario placeholder cada uno).

**Decisión: `Campaign` pertenece a brands-service**, a favor de
`architecture.md`. Razonamiento:

- `Campaign` es un constructo de equipo/planeación (`cmId`, `CampaignDesigner`,
  `createdBy`, `CampaignCategory`) — la misma naturaleza que `Brand`
  (ownership, quién es responsable de qué).
- `Post` es el objeto de contenido con su propio ciclo de vida (máquina de
  estados, fan-out multi-red, cron de publicación) — un dominio operativo
  distinto.
- `Post.campaignId` es **opcional** en `modelo.txt` — señal de que `Post`
  solo *referencia* una campaña, nunca la contiene. Si `Campaign` fuera
  parte del dominio de contenido, lo esperable sería la relación inversa.

**Pendiente, no resuelto en este documento**: `docs/database.md` debería
mover la fila `campaigns/campaign_team/campaign_categories` de "Contenido" a
"Marcas", y los 6 placeholders de `docs/swagger/*.yaml` deberían
consolidarse/renombrarse a los 4 servicios reales (`campaigns-service.yaml`
→ contenido de brands-service; `posts-service.yaml` → content-service;
`metrics-service.yaml` + `reports-service.yaml` → analytics-service).

## 2. Cadenas de FK cruzadas — estrategia por cadena

| # | Cadena | Dirección | Estrategia | Razón |
|---|---|---|---|---|
| 1 | `Brand.ownerId → User` | brands → auth | FK sin constraint. Validar propiedad = comparar `ownerId` contra el `userId` del JWT (sin llamada). Mostrar nombre/email del dueño = HTTP GET puntual. | ADR-0002 ya embebe identidad en el JWT; solo el *display* necesita una lectura en vivo, y es de bajo volumen (vistas de detalle de marca). |
| 2 | `Campaign.cmId`, `CampaignDesigner.userId`, `Campaign.createdBy → User` | brands → auth | FK sin constraint + HTTP en ambas direcciones: (i) resolver nombres para mostrar, (ii) brands-service pide a auth-service la lista de CM/Diseñadores elegibles por categoría al armar el equipo. | `docs/frontend-db-alignment.md` ya estableció que el equipo de campaña vive en `Campaign`/`CampaignDesigner`, nunca denormalizado en `User` — este es el equivalente a nivel de backend de esa misma regla. |
| 3 | `Post.createdBy`, `PostStatusHistory.changedBy`, `Media.uploadedBy`, `Report.requestedBy → User` | content/analytics → auth | Escritura: FK poblada desde el JWT, sin llamada. Lectura: **endpoint nuevo** `GET /internal/users?ids=...` (bulk) en auth-service, para evitar N+1 al renderizar listas. | El camino de escritura es gratis; el de lectura requiere una pieza nueva — se deja marcado como trabajo real, no se asume que ya existe. |
| 4 | `Post.brandId`, `Post.campaignId → Brand/Campaign` | content → brands | Híbrido: validación **en vivo** por HTTP al crear el Post (correctness-critical — debe confirmar que la marca/campaña existe y el requester tiene acceso), más un **snapshot** (`brandName`, `campaignName`) cacheado en `Post` para listas/calendario. | Las vistas de calendario/lista son de lectura frecuente — resolver el nombre por HTTP en cada render no escala ni a volumen de hackathon; la escritura sí debe quedarse en vivo por seguridad. |
| 5 | `PostSocialAccount.socialAccountId → SocialAccount` | content → brands | Híbrido: validación en vivo al crear la fila (debe confirmar que la cuenta existe, está activa y pertenece a la marca antes del fan-out a Ayrshare), más snapshot de `handle`/código de red para display. | Misma lógica que #4 — la corrección en la escritura es crítica, el display no necesita frescura en cada lectura. |
| 6 | `PostMetric.postSocialAccountId → PostSocialAccount` (analytics ↔ content, y transitivamente ↔ brands vía `SocialAccount`) | analytics → content | **Endpoints internos batch nuevos** en content-service (p. ej. `GET /internal/posts/published?since=...`) y en brands-service, pensados para el cron/score — nunca `prisma.post.findMany`/`prisma.brandProfile.count` directo. `PostMetric` guarda `postSocialAccountId` como FK sin constraint. | Es la cadena **ya violada en código hoy**: `score.service.ts` y `metrics-cron.service.ts` leen `Post`/`BrandProfile` directo por Prisma. Es también el ejemplo que motivó la corrección de este plan — "si un micro usa algo de marcas, esa parte se junta [con brands]": la responsabilidad de exponer esos datos se reubica en el servicio dueño, en vez de dejar el dato accesible desde fuera. |
| 7 | `BrandScore.brandId`, `Report.brandId → Brand` | analytics → brands | FK sin constraint + HTTP puntual para resolver el nombre de la marca (encabezados de reporte, pantallas de score). | Llamadas poco frecuentes (generación de reporte, vista de score) — no justifica más que un HTTP simple vía el circuit breaker existente. |
| 8 | `AuditLog.performedBy → User` | los 4 servicios → auth | FK sin constraint, poblada desde el JWT al escribir (sin llamada). Lectura de nombre reutiliza el mismo bulk endpoint de la cadena #3, si algún día se construye una vista unificada. | Cubierto por la decisión de AuditLog en la sección 4. |
| 9 | `SocialNetwork.baseEngagementRate` (brands → analytics, cron) | analytics → brands | **Una sola llamada HTTP por corrida de cron** (no por post) para traer el catálogo completo a memoria. No se construye una capa de caché persistente nueva. | ADR-0003 descarta mensajería async, así que un mecanismo de "push al escribir" no está disponible; una caché persistida abre una pregunta de staleness que las ADRs no responden hoy. Un solo pull por corrida es el cambio más chico que evita N+1 sin agregar una capa nueva — queda anotado que una caché persistida sería más resiliente a caídas de brands-service, si se decide invertir en eso más adelante. |

## 3. Pendientes conocidos, no resueltos en este documento

- `docs/database.md` necesita mover `campaigns`, `campaign_team` y
  `campaign_categories` de la fila "Contenido" a la fila "Marcas" (sección 1).
- Los 6 placeholders de `docs/swagger/*.yaml` deben consolidarse/renombrarse
  a los 4 servicios reales (sección 1).
- `score.service.ts` y `metrics-cron.service.ts` (analytics-service) siguen
  violando el límite de servicio hoy — necesitan que content-service y
  brands-service construyan primero los endpoints internos batch de la
  cadena #6 antes de poder corregirse de verdad.
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
- Aún no se decide si `Category` es dueño de auth-service o brands-service
  (ver sección 4, punto 7) — es la única llamada de juicio genuinamente
  abierta de este análisis.

## 4. Decisiones de arquitectura confirmadas

1. **Campañas pertenecen a brands-service**, no a content-service — ver
   sección 1. Es el caso más directo del principio rector: reubicar, no
   parchar.
2. **Lecturas cruzadas de analytics-service hacia Post/BrandProfile** (la
   violación ya existente en código) se resuelven reubicando la
   responsabilidad: content-service y brands-service construyen y son
   dueños de endpoints internos batch nuevos pensados para lo que el
   cron/score de analytics necesita (cadena #6). Analytics deja de tocar
   esas tablas por completo.
3. **Notificaciones**: llamada HTTP síncrona desde brands/content/analytics
   hacia un endpoint interno de auth-service (dueño de `Notification`) al
   ocurrir el evento. Es irreducible — el evento nace donde nace, no se
   puede reubicar. No se revive un 5º microservicio (`notifications-service`,
   mencionado como posibilidad en
   `docs/especificacion-funcional-roles.md:271` pero descartado aquí).
4. **Post ↔ Brand/Campaign para listas/calendario**: snapshot cacheado
   (`brandName`, `campaignName`) en `Post`, en vez de resolver en vivo por
   HTTP en cada render. Eventual consistency documentada, no bug (cadena #4).
5. **`SocialNetwork.baseEngagementRate`**: una sola llamada HTTP por corrida
   de cron de analytics-service, no por post, sin caché persistida nueva
   (cadena #9).
6. **`AuditLog`**: cada servicio escribe su propia tabla local, poblada
   directo desde el `userId` del JWT — sin llamada cruzada para escribir.
   Una vista unificada de auditoría, si se necesita, queda como trabajo
   futuro de lectura/agregación, no como problema de propiedad hoy.
7. **`Category`** (única llamada de juicio abierta): se propone dueño
   **auth-service**, junto a `Role`/`Module`/`Action`, porque reutiliza una
   dependencia que casi todo servicio ya necesita hacia auth. La alternativa
   —brands-service, mayor consumidor real vía `Brand` + `Campaign`— es
   igual de defendible. Cambiar esta decisión es mover una sección de
   `docs/base/modelo2.txt`, no rediseñar el archivo.
