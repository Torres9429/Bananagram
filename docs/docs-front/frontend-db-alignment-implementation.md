# Implementación — Alineación del frontend a `modelo.txt`

> ℹ️ **CONTEXTO HISTÓRICO — registra el estado del 19-jul-2026, antes de commitear.** Este documento deja
> constancia explícita (línea 7-8) de que "no se hizo ningún commit; todos los cambios quedaron en el
> working tree para revisión". Desde entonces ese trabajo sí se commiteó y el frontend avanzó mucho más en
> conexión real al backend (~10 commits: login real, posts-front, campañas en brands-front, catálogos en
> admin-front, entre otros) — ver `.claude/INVENTORY.md` §0 para el estado de conexión actual, pocket por
> pocket. Su observación sobre los formularios de auth sin cablear sigue siendo válida **hoy** (verificado
> 2026-08-17): `ResetPasswordForm.tsx` y `ForgotPasswordForm.tsx` todavía traen el comentario explícito
> "Diseño sin backend: no se consume ninguna API todavía", y `RegisterForm.tsx` sigue resolviendo contra
> `MOCK_CATEGORIES`/`MOCK_SPECIALTIES`/etc. — de los formularios de `auth-front`, solo `LoginForm` quedó
> conectado al backend real.

Este documento registra **qué se implementó** a partir del análisis y las decisiones de producto
documentadas en [`docs/frontend-db-alignment.md`](./frontend-db-alignment.md). 

**Fecha**: 2026-07-19, en dos pasadas. **Alcance**: únicamente `apps/frontend/**`. `apps/backend/**` no se
tocó en ninguna de las dos (decisión explícita — se reescribirá a futuro). No se hizo ningún commit; todos
los cambios quedaron en el working tree para revisión.

- **§1-6**: primera pasada — las 12 decisiones de producto originales, implementadas en `@repo/ui` +
  las 6 apps.
- **§7**: segunda pasada — los puntos que la primera pasada dejó "fuera de alcance a propósito" y que el
  equipo pidió implementar después: unificación de mock stores entre `brands-front`/`posts-front`,
  `Media`/`PostMedia`, eliminación de componentes muertos, y la decisión (sin cambio de código) sobre
  slugs de módulo/acción.

**Verificación final** (ambas pasadas): `npx tsc --noEmit` pasa limpio (exit 0) en las 6 apps
(`web-shell`, `admin-front`, `auth-front`, `brands-front`, `posts-front`, `analytics-front`) y en el
paquete compartido `commons`. Un grep final sobre todo `apps/frontend` confirma que no queda
`brandProfileId`, `engagementRate` ni `brandIds` (sin `owned`) en código funcional (solo en comentarios que
documentan el cambio a propósito), que `MOCK_SOCIAL_ACCOUNTS`/`MOCK_CAMPAIGNS` no tienen definiciones
locales duplicadas fuera de `commons`, y que los componentes eliminados ya no existen en disco.

---

## 0. Las 12 decisiones de producto y cómo se implementaron

| # | Decisión | Implementación |
|---|---|---|
| 1 | `ownedBrandIds`/`brandIds`: eliminar de CM/Diseñador, derivar en tiempo real | `AuthState`/`JwtPayload`/`MockUser` de `@repo/ui` ya no tienen `brandIds` — ahora `ownedBrandIds`, poblado **solo** para rol Cliente. brands-front deriva la marca de un CM/Diseñador desde sus campañas asignadas (`Campaign.cmId`/`CampaignDesigner`), nunca desde la sesión. |
| 2 | `SocialNetworkCode`: nombres completos en minúsculas | Nuevo tipo canónico en `@repo/ui/types/social-network.types.ts` (`'instagram'\|'tiktok'\|'facebook'\|'x'\|'linkedin'\|'youtube'`). Las 4 apps que manejaban códigos cortos (`web-shell`, `brands-front`, `posts-front`, `analytics-front`) migraron sus literales y, donde tenía sentido, re-exportan el tipo en vez de mantener copias locales. |
| 3 | Estado por red (`PostSocialAccountStatus`) solo visible en `/posts/[id]` | Implementado exactamente así en posts-front: `/posts` y `/posts/approvals` siguen mostrando solo `Post.status` (10 valores); `/posts/[id]` agrega una sección nueva "Estado por red" con un chip por cada `PostSocialAccount`. |
| 4 | IDs `BigInt` (`PostStatusHistory.id`, `AuditLog.id`) como `string` | `PostStatusHistory.id: string` en `@repo/ui/types/post.types.ts`. `AuditLog` no tiene tipo compartido (es local a admin-front); `MockAuditEntry.id` ya era string en el mock. |
| 5 | Multi-select en `/posts/new`: una preview por red seleccionada | Implementado: `socialAccountIds: string[]` con chips toggle; una card de preview por cada red seleccionada; estado vacío si no hay ninguna seleccionada. |
| 6 | `Role.name`: slugs de `AppRole` (minúsculas), no labels cortos | admin-front dejó de usar `'CM'`/`'Diseñador'`/`'Cliente'`/`'Admin'` como identificador — ahora usa los slugs de `AppRole` (`community_manager`, `disenador`, etc.) con un mapa `ROLE_LABELS` solo para mostrar texto bonito en UI. `MOCK_ROLES` (código muerto que usaba una convención de permisos distinta y desincronizada) se eliminó. |
| 7 | Separar CM (1:1) de Diseñadores (N) en brands-front, eliminar Cliente del "team" | `MockCampaign.cmId` (directo) + `getCampaignCM()` resuelve el CM; `MOCK_CAMPAIGN_DESIGNERS: Record<campaignId, MockTeamMember[]>` reemplaza el viejo `MOCK_TEAM_BY_CAMPAIGN` mixto. El Cliente ya no aparece como team member — es `Campaign.createdBy`. |
| 8 | `Brand.profileType`: inglés, minúsculas | Sin cambio de valores (ya eran `'brand'\|'company'\|'organization'\|'creator'\|'personal'`) — se centralizó como `PROFILE_TYPES`/`ProfileType` en `@repo/ui/types/brand.types.ts`, y auth-front/brands-front dejaron de mantener copias locales duplicadas del union. |
| 9 | Mismo límite de caracteres para todas las redes en `/posts/new` | `CHAR_LIMITS` (mapa por red) → `POST_CHAR_LIMIT = 2200` (constante única, el límite de Instagram — el más restrictivo entre los que representan copy largo real en este dataset). |
| 10 | `impressions` vs `views`: usar `views` (el campo real de BD) | analytics-front eliminó `impressions` por completo y renombró cada aparición a `views` — se determinó que en este dominio `impressions` siempre significó "cuántas veces se vio la publicación", exactamente lo que ahora modela `views`; mantener ambos habría sido un duplicado sin distinción funcional. |
| 11 | `BrandScore.classification`: `string` abierto, no unión cerrada | `@repo/ui/types/score.types.ts` y `analytics-front`'s `ScoreSnapshot` ya no usan `'bajo'\|'medio'\|'alto'` como tipo — es `string`. `ScoreGauge` (`@repo/ui/ui`) ajustado con un color de fallback (gris) para clasificaciones no reconocidas. |
| 12 | Catálogo `SocialNetwork`: formulario propio, sobre una base extensible | Nuevo `CatalogItem` base (`{id, name, deletedAt?}`) en `@repo/ui/types/catalog.types.ts`; `SocialNetwork extends CatalogItem` agrega `code`/`baseEngagementRate`. admin-front tiene un componente nuevo, `SocialNetworkForm.tsx`, separado del genérico `CatalogList.tsx` (que Categorías/Especialidades siguen usando sin cambios). |

---

## 1. `@repo/ui` (`apps/frontend/commons/`) — hecho directamente, sin subagentes

Por ser la base de la que dependen las 6 apps, este paquete se actualizó primero y a mano (no delegado a
subagentes), para fijar un contrato estable antes de tocar las apps consumidoras.

**Archivos nuevos** (`src/types/`): `catalog.types.ts`, `social-network.types.ts`, `brand.types.ts`,
`campaign.types.ts`, `notification.types.ts`, `password-reset.types.ts`. Ver el detalle campo por campo de
cada uno en `.claude/INVENTORY.md` §2.1.

**Archivos reescritos**:
- `types/post.types.ts` — `PostStatus` (10 valores), `PostSocialAccountStatus` (nuevo),
  `PostMetric`/`PostSocialAccount` (nuevos, capas 2 y 3 del fan-out multi-red), `Post` (`brandId` en vez de
  `brandProfileId`, + `socialAccounts: PostSocialAccount[]`), `PostStatusHistory.id: string`.
- `types/score.types.ts` — `BrandScore` con `id`/`brandId` nuevos, `coverage` reordenada después de
  `frequency` con comentario explícito de que es informativa, `classification: string`.
- `types/auth.types.ts` — `UserStatus` (nuevo), `AuthUser`/`JwtPayload`/`MockUser` con `name`/`status`/
  `avatarUrl`, `ownedBrandIds` reemplazando `brandIds`.
- `types/index.ts` — barrel actualizado con los 6 archivos nuevos.
- `mocks/mock-users.ts`, `mocks/mock-tokens.ts`, `mocks/build-user-token.ts` — los 5 usuarios demo
  reconstruidos con `id` explícito (antes solo tenían email/rol; ahora `user-admin-001`, `user-cm-001`,
  `user-disenador-001`, `user-cliente-001`, `user-cliente-002`), `status: 'active'`, `ownedBrandIds` solo
  en los 2 usuarios Cliente (`['brand-001','brand-002']` para Roberto Fernández, `['brand-004']` para Alex
  Rivera). `buildTokenFromUser` ahora usa `user.id` como `sub` del JWT (antes usaba el email).
- `state/auth.slice.ts` — `initialState.ownedBrandIds: []`, `setCredentials` popula `name`/`status`/
  `avatarUrl` desde el payload, `selectOwnedBrandIds` reemplaza `selectBrandIds` (**rename breaking** — se
  verificó que ningún consumidor quedó con el nombre viejo).
- `ui/atoms/StatusChip/StatusChip.tsx` — `STATUS_COLORS`/`STATUS_LABELS` ampliados a los 10 valores
  (`publicando`: azul info; `parcial`: ámbar; `error`: rojo distinto de `rechazado`; `cancelado`: gris).
- `ui/atoms/ScoreGauge/ScoreGauge.tsx` — `classification: string` con `DEFAULT_COLOR` de fallback.
- `api/auth.api.ts` — `forgotPassword`/`resetPassword` agregados (mutations, respaldadas por
  `PasswordResetToken`), exportando `useForgotPasswordMutation`/`useResetPasswordMutation`.
- `hooks/useNotifications.ts` — el stub ahora tipa su arreglo vacío como `Notification[]` (del nuevo tipo)
  en vez de un tipo inline.

---

## 2. web-shell + admin-front + auth-front (1 agente)

### web-shell
- `interfaces/interface.ts` — `MockRecentPost.brandId` (rename); `SocialAccount` local (en realidad una
  lista de redes) renombrado a `SocialNetworkOption` para no chocar de nombre con el `SocialAccount` real.
- `lib/mock-data.ts` — todos los `brandProfileId:` → `brandId:`.
- `DashboardCM.tsx`, `DashboardCliente.tsx`, `DashboardDisenador.tsx` — `getSocialAccount(post.brandId)`.
- `MetricsSection.tsx` (landing) — códigos de red cortos → completos en minúsculas (hallazgo adicional vía
  grep, no estaba en el listado original de archivos pero era el mismo problema transversal).

### admin-front
- `MockUser` — `role: AppRole`, `status: UserStatus`, campo `brand` **eliminado**.
- `MOCK_ROLES`/`MockRole` — **eliminados** (código muerto confirmado por grep: no se usaban en ninguna página).
- `USER_STATUS_STYLE` — keys `pending`/`active`/`suspended` (agregado estilo ámbar para `pending`, antes
  inexistente).
- `MOCK_USERS` — roles como slugs de `AppRole`; el usuario que antes tenía `status: 'inactivo'` pasó a
  `status: 'pending'` con `lastLogin: 'Nunca'` (decisión de diseño: `pending` implica que nunca inició
  sesión, es semánticamente más correcto que forzarlo a `suspended`).
- `CREATABLE_ROLES` — ahora `[AppRole.COMMUNITY_MANAGER, AppRole.DISENADOR]`.
- `MOCK_AUDIT_LOG` — `date` → `createdAt` (ISO).
- `MOCK_SOCIAL_NETWORKS` — reescrito como `SocialNetwork[]` con los valores reales de `baseEngagementRate`
  del seed del backend (instagram 0.045, tiktok 0.09, facebook 0.02, x 0.015, linkedin 0.025, youtube 0.03).
- `CreateUserDialog.tsx` — `handleCreate()` crea con `status: 'pending'` (antes `'activo'` — bug real, el
  usuario nace sin password hasta activarse); campo "Perfil asignado" eliminado; select de rol itera
  `CREATABLE_ROLES` mostrando `ROLE_LABELS`.
- `users/page.tsx` — columna "Perfil" eliminada; rol mostrado vía `ROLE_LABELS[u.role]`.
- `audit-log/page.tsx` — renderiza `formatDate(e.createdAt)`.
- `catalogs/social-networks/page.tsx` — renderiza el nuevo `SocialNetworkForm.tsx` en vez de `CatalogList`.
- `SocialNetworkForm.tsx` (**nuevo**) — form + tabla dedicados: `name`, `code` (select de
  `SocialNetworkCode`), `baseEngagementRate` (capturado como % 0–100, guardado como fracción 0–1); estado
  activo/inactivo derivado de `deletedAt` (decisión de diseño: simplificación pragmática de soft-delete
  para un mock, sin timestamp real de borrado).

### auth-front
- `ResetPasswordForm.tsx` — ahora lee `token` vía `useSearchParams()` (mismo patrón que `ActivateForm.tsx`
  con `?email=`); muestra "Enlace inválido" si falta. No se cableó `useResetPasswordMutation` de verdad
  (la app sigue en modo mock end-to-end, per las instrucciones no era obligatorio).
- `reset-password/page.tsx` — envuelto en `<Suspense>` (requerido por `useSearchParams` en App Router).
- `RegisterForm.tsx` — `category` (string) → `categoryId`; `ProfileType` importado de `@repo/ui/types`.
- `mock-data.ts` — `MOCK_CATEGORIES` de `string[]` a `{id, name}[]`.
- `interfaces/interface.ts` — `ProfileType` local eliminado, re-exportado desde `@repo/ui/types`.

**Verificación**: `tsc --noEmit` limpio en las 3 apps. Sin `brandIds`/`brandProfileId` residual.

---

## 3. brands-front (1 agente)

Cambios en `interfaces/interface.ts` y `lib/mock-data.ts`: `MockProfile` (`type`→`profileType`,
`profiles`→`socialAccounts`, `category`→`categoryId`, + `ownerId`/`slug`/`logoUrl`/`primaryColor`
nuevos — `ownerId` mapeado a los ids reales de `@repo/ui/mocks/mock-users.ts`: `user-cliente-001` para
Zara/Nike/Spotify, `user-cliente-002` para el perfil personal de Alex); `SocialAccount.socialNetwork`→
`socialNetworkId` (con `getSocialNetwork()` como resolver nuevo); `MockCampaign` (+ `objective`,
`description`, `createdBy`, `cmId`); `MockCalendarEvent`/`MockCampaignPost.brandProfileId`→`socialAccountId`.

**El cambio central**: `MOCK_TEAM_BY_CAMPAIGN` (un arreglo mixto CM+Diseñadores+Cliente con `role: string`
libre) se reemplazó por `getCampaignCM()` (resuelve el CM 1:1 desde `MockCampaign.cmId` contra
`MOCK_AVAILABLE_CMS` — decisión de diseño: no se creó una estructura de almacenamiento separada, se
resuelve on-demand) + `MOCK_CAMPAIGN_DESIGNERS: Record<campaignId, MockTeamMember[]>` (N diseñadores, sin
entradas de Cliente). `getTeamAggregate()` se reescribió para combinar ambas fuentes.

Componentes/páginas actualizados: `CreateCampaignDialog.tsx` (setea `cmId`/`createdBy` directo, agrega
campos opcionales Objetivo/Descripción), `CampaignCard.tsx`, `ClientSection.tsx`, las páginas de
`team/page.tsx` (ambas variantes, `/brands/[id]/...` y `/profile/...`), `calendar/page.tsx` (ambas
variantes), `posts/page.tsx`, y **el fix del bug ya conocido** `POSTS_FRONT_URL` → `ZONE_URLS.postsFront`
en `profile/campaigns/[campaignId]/page.tsx` (se corrigió de paso porque el agente ya tenía ese archivo
abierto para el rename de `brandProfileId`).

Seed data: se asignó a Ana García (`u1`) como CM de las 5 campañas demo (antes `c3`/`c4`/`c5` no tenían
datos de equipo en absoluto).

**Verificación**: `tsc --noEmit` limpio. El único error de tipos encontrado durante el trabajo (`BrandScore`
sin `id`/`brandId`) se corrigió agregando esos campos a los mocks de score.

---

## 4. posts-front (1 agente) — el rediseño más profundo

`interfaces/interface.ts`: `SocialAccount` local ganó `brandId`/`followers`/`active` (conservando
`networkBg`/`networkColor` como campos de UI) y `socialNetworkId` en vez de `socialNetwork` crudo;
`MockCampaign` ganó `brandId`/`status`/`startDate?`/`endDate?`/`objective?`; `PostMetrics` → todos los
campos opcionales, `engagementRate`→`engagement`, `+views?`. **`MockPost`**: se eliminó `brandProfileId` y
el bloque `metrics` plano; se agregaron `brandId`, `ayrsharePostId?`, y
`socialAccounts: MockPostSocialAccount[]` (usando `PostSocialAccountStatus`/`PostMetric` importados
directo de `@repo/ui/types`, no reinventados).

`lib/mock-data.ts`: `MOCK_SOCIAL_ACCOUNTS` con el shape nuevo; `getPostNetworkInfo()` cambió de firma —
antes recibía el post completo (un solo `brandProfileId`), ahora recibe un `socialAccountId` específico,
ya que un post puede tener varios. `MOCK_POSTS[p5]` ("Reels sustentabilidad") se reescribió a propósito
para demostrar el caso `parcial`: Instagram `publicado` (con métricas completas incl. `views`) + TikTok
`error` (con `errorMessage`). `CHAR_LIMITS` (mapa por red) → `POST_CHAR_LIMIT = 2200` (decisión de diseño:
el límite de Instagram, el más restrictivo entre los que representan copy largo real en este dataset — se
descartó usar el de X/280 porque nunca se enforced como límite real de UX aquí).

`/posts/new/page.tsx`: `socialAccountIds: string[]` (multi-select por toggle, reemplaza el
`useState('bp1')` de selección única); al cambiar de campaña resetea a las cuentas disponibles de la nueva
campaña; una card de preview por red seleccionada; límite único sin importar cuántas/cuáles redes estén
activas.

`/posts/[id]/page.tsx`: nueva sección "Estado por red" iterando `post.socialAccounts` — chip local
(`PSA_STATUS_STYLES`, 5 valores de `PostSocialAccountStatus`, no reusa `StatusChip`) + `postUrl`/
`errorMessage` condicional.

`/posts/page.tsx`, `/posts/approvals/page.tsx`: `FILTERS` ampliado a los 10 valores de `PostStatus`;
resuelven red/marca desde `post.socialAccounts[0]` (decisión de diseño explícita: "cuenta representativa"
para las vistas de lista, sin mini-franjas de estado por red — eso vive solo en el detalle, por la decisión
de producto #3). `approvals/page.tsx` factorizó esta resolución en un componente local
`NetworkAvatarForPost` para no repetirla 3 veces.

**Verificación**: `tsc --noEmit` limpio. Componentes revisados pero sin cambios necesarios:
`RejectPostDialog.tsx`, `NetworkAvatar.tsx`, `CampaignDot.tsx`, `PostsTabs.tsx`, `Sidebar.tsx`.

---

## 5. analytics-front (1 agente)

`lib/analytics/types.ts`: `SocialNetworkCode` y `PostStatus` ahora **re-exportados directo de
`@repo/ui/types`** (decisión de diseño: en vez de mantener copias locales que puedan volver a divergir).
`SocialMetricFact`: `engagementRate`→`engagement`, `impressions` eliminado en favor de `views` (decisión
10, ver §0), `brandProfileId`→`socialAccountId` (este último no estaba en las instrucciones originales del
agente — se detectó en la revisión final de consistencia cruzada y se corrigió directamente, ver §6).
`ScoreSnapshot`: `coverage` reordenada después de `frequency` con el comentario de que es informativa;
`classification: string`.

**Hallazgo crítico corregido** (`coverage` tratada como 4º factor ponderado):
1. `buildScoreExplanation()` en `engine.ts` — `coverage` sacada del arreglo `components` que alimenta
   `positiveFactors`/`negativeFactors` (que ahora solo consideran consistency/engagement/frequency).
2. `ScoreExplanationPanel.tsx` — la barra de Cobertura se separó visualmente de las 3 barras ponderadas,
   con el copy "Cobertura (informativa — no pondera en el score)".

`network-config.ts`: todos los `Record<SocialNetworkCode,...>` migrados a claves completas en minúsculas;
`COMPARABLE_METRICS` con `key: 'engagement'`/`'views'`. `engine.ts`/`analytics.selectors.ts`:
`avgEngagementRate`→`avgEngagement` (rename completo por consistencia, no solo dejado igual).
`AnalyticsFilterDrawer.tsx`: `ALL_STATUSES` ampliado a 10 valores — se confirmó que este filtro **ya
estaba habilitado y funcional** (una corrección respecto al brief original, que asumía que estaba
deshabilitado).

**Verificación**: `tsc --noEmit` limpio. Nota del propio agente: `mock-data.ts`'s `getMockReachByNetwork()`,
`MOCK_KPIS`, `MOCK_ENGAGEMENT_SERIES`, `MOCK_SOCIAL_ACCOUNTS`, `MOCK_TOP_POSTS` son código muerto (no
importado por ningún componente/selector) — se dejaron tal cual, fuera del alcance instruido.

---

## 6. Corrección post-verificación (hecha directamente, sin subagente)

Al hacer la revisión final de consistencia cruzada (grep de `brandProfileId`/`engagementRate`/`brandIds`
sobre todo `apps/frontend`), se detectó que **analytics-front no había renombrado `brandProfileId`** —
el agente de analytics-front no tenía esa instrucción explícita en su prompt (el documento de análisis
original no lo marcaba como necesario ahí, solo `engagement`/`views`). Para mantener consistencia con el
resto del frontend ya renombrado (`socialAccountId` en brands-front y posts-front), se corrigió
directamente: `SocialMetricFact.brandProfileId`→`socialAccountId` (`lib/analytics/types.ts`),
`MockTopPost.brandProfileId`→`socialAccountId` (`interfaces/interface.ts`), y el `activeProfiles` de
`computeAudienceMetrics()` en `engine.ts`. `mock-data.ts` se actualizó con `sed` (28 ocurrencias). `tsc
--noEmit` se volvió a correr después — sigue limpio.

---

## 7. Segunda pasada lo que había quedado fuera de alcance, ya implementado

Después de la primera pasada (§1-6), el equipo revisó la lista de pendientes de la sección anterior y pidió
implementar 4 de los 5 puntos. Este es el registro de esa segunda pasada — mismo alcance (`apps/frontend/**`,
`apps/backend/**` sin tocar), misma verificación final (`tsc --noEmit` limpio en las 6 apps + `commons`).

### 7.1 Unificación de mock stores entre `brands-front`/`posts-front` — implementado

Se creó una fuente única compartida, `apps/frontend/commons/src/mocks/mock-world.ts` (paquete `@repo/ui`,
re-exportado desde el barrel raíz — se consume igual que `findUserByEmail`, vía `import { X } from
'@repo/ui'`). Exporta: `AVAILABLE_SOCIAL_NETWORKS`/`getSocialNetwork` (catálogo de redes con color de
acento), `MOCK_BRANDS: Brand[]`/`getBrand` (4 marcas: Zara MX, Nike MX, Spotify MX, Alex Rivera-personal),
`MOCK_SOCIAL_ACCOUNTS: SocialAccount[]`/`getSocialAccount`/`getSocialAccountsByBrand` (bp1-bp8), y
`MOCK_CAMPAIGNS: MockCampaignRecord[]`/`getCampaign`/`getSocialAccountsForCampaign`/
`campaignUsesSocialAccount` (c1-c5; `MockCampaignRecord extends Campaign` con `socialAccountIds: string[]`
extra — un atajo de mock documentado en el archivo, ya que modelo.txt no tiene un join explícito
Campaign↔SocialAccount, se infiere en la práctica de qué `SocialAccount` usa cada `Post` de la campaña).

Los valores canónicos son los que ya tenía `brands-front` (más completos: `cmId`/`createdBy`/`objective`/
`description` por campaña, `CampaignStatus` en inglés, `socialNetworkId` = código de red directo) — antes
`posts-front` tenía una copia divergente (p. ej. la cuenta de Instagram de Zara tenía `followers: 128000`
ahí vs. `1200000` en brands-front — la misma cuenta con números distintos; `MOCK_CAMPAIGNS` de posts-front
usaba `status: 'activa'|'planificada'` en español, un enum completamente distinto al real).

- **`brands-front`**: `lib/mock-data.ts` ahora importa todo lo anterior de `@repo/ui`. `MOCK_PROFILES`
  se reconstruye mapeando `MOCK_BRANDS` + capas locales encima (`color`, `activeCampaigns` — ahora
  **recalculado en vivo** contando campañas `active` reales, corrigiendo un número que estaba hardcodeado
  y desactualizado para Zara —, `score`, `socialAccounts` vía `getSocialAccountsByBrand`). `interfaces/interface.ts`
  ya no redefine `SocialAccount`/`SocialNetworkOption`, los re-exporta de `@repo/ui/types`. Cero cambios de
  call-site necesarios (cada consumidor seguía importando desde `../lib/mock-data`, que conserva los mismos
  nombres).
- **`posts-front`**: `lib/mock-data.ts` importa lo mismo; eliminó su catálogo local `SOCIAL_NETWORK_CATALOG`
  (`sn1..sn6`→código, ya no hace falta, el `socialNetworkId` compartido ya es el código directo), su propio
  `MOCK_SOCIAL_ACCOUNTS`/`MOCK_CAMPAIGNS`, y el objeto `MOCK_USER` (código muerto confirmado). Agregó
  `NETWORK_DISPLAY_COLORS` (colores de UI por red, ya no por cuenta individual — visual únicamente, no vive
  en el tipo compartido). `getPostNetworkInfo()` ahora resuelve el nombre de marca vía `getBrand(...)?.name`
  en vez de un campo `brandName` propio que ya no existe en el `SocialAccount` compartido.

### 7.2 Slugs de módulo/acción (`AppModule`/`AppAction`) — decisión documentada, sin cambio de código

`modelo.txt` no fija un idioma para `Module.slug`/`Action.slug` (son `String @unique` libres, sembrados por
seed). Decisión del equipo: el frontend se queda en inglés (`AppModule`/`AppAction` de `@repo/ui/types` ya
estaban así) — **no se toca para que coincida con el backend actual** (que usa slugs en español); si en
algún momento se alinean, será el backend el que se mueva al inglés cuando se reescriba, no al revés. No
hubo cambio de código porque el frontend ya cumplía la convención elegida — queda como decisión resuelta,
no como pendiente.

### 7.3 `Media`/`PostMedia` (biblioteca de adjuntos) — implementado en `posts-front`

Tipos nuevos en `@repo/ui/types/media.types.ts`: `Media {id, brandId, uploadedBy, fileName, originalName,
mimeType, url, size, width?, height?, duration?}`, `PostMedia {postId, mediaId, order}`. `Post` (en
`post.types.ts`) ganó `media?: PostMedia[]`.

`posts-front` es donde se implementó la UI real (el lugar natural: `/posts/new` ya tenía un placeholder
estático "Imagen adjunta" sin ningún dato detrás):
- `lib/mock-data.ts` — `MOCK_MEDIA_LIBRARY: Media[]` (6 archivos — 4 imágenes + 2 videos, con URLs de
  `picsum.photos` reales y cargables, repartidos entre las 4 marcas del mock-world) + `getMedia`/
  `getMediaLibraryByBrand`. `MockPost.media?: {mediaId, order}[]` (decisión de diseño: forma simplificada
  sin `postId` redundante, en vez de reusar `PostMedia[]` literal). Se poblaron 2 posts de ejemplo (`p1`,
  `p5`) con adjuntos para que se vea con datos reales.
- `/posts/new/page.tsx` — el placeholder estático se reemplazó por un picker real: chip "Adjuntar media"
  abre un `Dialog` con thumbnails de `MOCK_MEDIA_LIBRARY` filtrados por la marca de la campaña activa,
  selección múltiple por click, los seleccionados se muestran como chips de thumbnail 64×64 removibles
  (con badge "Video" en los que aplica) debajo del textarea, guardados en `selectedMediaIds: string[]`.
  Cada preview card por red (ya existente del rediseño multi-red) ahora muestra la primera imagen adjunta
  en vez del placeholder.
- `/posts/[id]/page.tsx` — fila de thumbnails (con link al archivo) cuando `post.media` está poblado.

No se construyó upload real ni validación de tipo de archivo — es una feature 100% mock, el objetivo era
que la relación tuviera representación visible y navegable, no un uploader funcional.

### 7.4 Componentes muertos — eliminados

Verificados con grep sobre **todo** `apps/frontend/` (no solo el app dueño) antes de borrar, para
confirmar cero consumidores inesperados:

- **`web-shell`**: `DashboardCliente.tsx`, `DashboardCM.tsx`, `DashboardDisenador.tsx` eliminados (ninguna
  ruta los renderizaba). En cascada, se limpiaron sus datos mock huérfanos en `lib/mock-data.ts`
  (`MOCK_SOCIAL_ACCOUNTS`/`getSocialAccount` local, `MOCK_DASHBOARD`, `MOCK_POSTS_BY_STATUS`,
  `getMockPostsByNetwork`, `MOCK_CLIENTE_DASHBOARD`, `MOCK_DISENADOR_DASHBOARD`) y sus tipos en
  `interfaces/interface.ts` (`MockCampaignSummary`, `SocialNetworkOption` local, `MockRecentPost`). Se
  conservó `MOCK_ADMIN_DASHBOARD` (sigue en uso por `DashboardAdmin`, la única ruta real).
- **`analytics-front`**: `lib/mock-data.ts` perdió `getMockReachByNetwork()`, `MOCK_KPIS`,
  `MOCK_ENGAGEMENT_SERIES`, su `MOCK_SOCIAL_ACCOUNTS` local + `getSocialAccount()`, `MOCK_TOP_POSTS` (todos
  sin consumidores). Se eliminó el componente `ActivityTimeline.tsx` completo (no importado en ningún
  lado). Limpieza en cascada en `interfaces/interface.ts` (`MockEngagementPoint`, `SocialAccount` local,
  `MockTopPost`). **No se tocó** `selectTimeline`/`buildTimeline`/`TimelineEvent` (en
  `store/analytics.selectors.ts` y `lib/analytics/engine.ts`/`types.ts`) — quedaron huérfanos tras borrar
  `ActivityTimeline.tsx`, pero viven en archivos core de engine/selectors (no en scaffolding de mocks) y no
  estaban en la lista autorizada — se deja como decisión pendiente del equipo, no se borró unilateralmente.

**Verificación de esta segunda pasada**: `tsc --noEmit` limpio en las 6 apps. Grep de consistencia confirma
que `MOCK_SOCIAL_ACCOUNTS`/`MOCK_CAMPAIGNS` ya no tienen definiciones locales duplicadas fuera de
`commons` (solo imports/re-exports), que no quedan status de campaña en español, y que los 3 dashboards y
`ActivityTimeline.tsx` ya no existen en disco.
