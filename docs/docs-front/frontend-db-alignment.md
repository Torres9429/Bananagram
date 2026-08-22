# Alineación del frontend con el modelo de datos estable (`modelo.txt`)

Este documento compara, campo por campo, los mocks/tipos/interfaces actuales de **todo el frontend**
(`apps/frontend/**`) contra el nuevo schema de Prisma estable en
[`modelo.txt`](base/modelo.txt). El objetivo: alinear los mocks a la forma real de la base
de datos ahora que el frontend no consume nada real todavía (son puros datos), para que cuando se conecte
el backend real el cambio sea mínimo.

**Fuera de alcance a propósito**: `apps/backend/**` no se tocó ni se analizó — se reescribirá después.

**Cómo se hizo**: 4 subagentes leyeron `modelo.txt` completo y todo el código fuente de cada zona en
paralelo — `@repo/ui`+`web-shell`, `admin-front`+`auth-front`, `brands-front`+`posts-front`,
`analytics-front` — y compararon campo por campo. Este documento consolida sus 4 reportes, empezando por
los hallazgos que cruzan varias apps (los más importantes, y los que hay que resolver primero porque todo
lo demás depende de ellos) y terminando con el detalle específico de cada app.

---

## 0. Cómo leer este documento

1. **Sección 1 — Hallazgos transversales**: 6 problemas que aparecen en más de una app. Resolverlos primero
   (idealmente en `@repo/ui/types`, la única fuente compartida) reduce el trabajo repetido en cada app.
2. **Secciones 2–8 — Detalle por paquete**: cambios específicos de cada app, en 3 categorías:
   _Renombrar campos_ (el campo existe pero con otro nombre/forma), _Campos faltantes_ (no existe nada
   parecido todavía), _Campos/valores obsoletos_ (existe algo que ya no corresponde a ninguna relación real
   del nuevo modelo).
3. **Sección 9 — Decisiones que requieren al humano**: preguntas que los agentes deliberadamente NO
   resolvieron solas porque son decisiones de producto/equipo, no mapeos mecánicos.
4. **Sección 10 — Orden de trabajo sugerido**.

---

## 1. Hallazgos transversales (afectan a varias apps — resolver primero)

### 1.1 🔴 Post ya no es 1:1 con una red social — ahora es fan-out multi-red

Este es el cambio estructural más grande de todo `modelo.txt`, y afecta a **`@repo/ui`, web-shell,
brands-front, posts-front y analytics-front** por igual.

- **Antes (todo el frontend actual)**: cada `Post` tiene un único `brandProfileId: string` (una sola red
  social por publicación).
- **Ahora (`modelo.txt`)**: el modelo se separa en 3 capas:
  - **Capa 1 — `Post`** (`brandId`, `campaignId?`, `content`, `status`, `scheduledAt?`, `publishedAt?`,
    `createdBy`, `ayrsharePostId?`): **agnóstico de red**, ya no tiene ningún campo de red social.
  - **Capa 2 — `PostSocialAccount`** (NUEVO modelo): `{id, postId, socialAccountId, status:
PostSocialAccountStatus, socialPostId?, postUrl?, publishedAt?, errorMessage?}` — **una fila por red
    a la que se publica ese post**, cada una con su propio estado independiente. Esto es lo que permite que
    un mismo post se publique simultáneamente en Instagram + TikTok + LinkedIn, y que si TikTok falla pero
    Instagram funciona, el post quede en estado `parcial` (nuevo valor de `PostStatus`, ver §1.3).
  - **Capa 3 — `PostMetric`** (métricas): ahora cuelga de `PostSocialAccount`, no de `Post` — una fila de
    métricas por red por captura (`{likes?, comments?, shares?, views? (NUEVO), reach?, engagement?
(renombrado desde `engagementRate`), capturedAt}`), todos los campos opcionales.
- **Por qué es un rename insuficiente**: no basta con renombrar `brandProfileId`→`brandId`; hay que
  **agregar** la relación 1-a-muchos hacia `PostSocialAccount` para poder representar targeting
  multi-red. Sin esto, ninguna UI puede modelar el estado `parcial` ni mostrar "Instagram publicado,
  TikTok con error".
- **Apps afectadas y su forma de manifestarse**:
  - `@repo/ui` (`commons/src/types/post.types.ts`) — `Post.brandProfileId` es el tipo raíz del que
    heredan todos los demás.
  - `web-shell` — `MockRecentPost.brandProfileId`, usado en los 3 dashboards (CM/Diseñador/Cliente) vía
    `getSocialAccount(post.brandProfileId)`.
  - `posts-front` — **el gap más profundo**: `/posts/new` tiene un chip-picker de **selección única** de
    red (`brandProfileId`, "resets to first profile on campaign change") que necesita convertirse en
    **multi-select**; `MockPost.metrics: PostMetrics | null` es un bloque plano por post en vez de por red.
  - `brands-front` — `MockCalendarEvent.brandProfileId`, `MockCampaignPost.brandProfileId` (mismo problema
    en el calendario de campañas).
  - `analytics-front` — su `SocialMetricFact` ya está modelado "por post+red+fecha" (una fila por
    combinación), lo cual de hecho es **más cercano** al nuevo modelo que el resto — solo necesita el
    rename `engagementRate`→`engagement` y el campo nuevo `views`.

### 1.2 🔴 `BrandUser` (membership multi-usuario por marca) fue eliminada — el ownership ahora es singular

- **Antes**: el schema viejo tenía una tabla `BrandUser` de membership muchos-a-muchos, y el frontend
  refleja esa suposición en **todos lados** con un campo `brandIds: string[]` en el JWT/estado de sesión
  (`AuthState`, `JwtPayload`, `MockUser` en `@repo/ui`), poblado para **los 4 roles** (Admin, CM, Diseñador,
  Cliente).
- **Ahora (`modelo.txt`)**: `BrandUser` ya no existe. En su lugar:
  - **Cliente** → `User.ownedBrands: Brand[]` vía `Brand.ownerId` (un único dueño por marca, no
    membership). Este caso es simple y sin ambigüedad — un cliente puede tener varias marcas, pero cada
    marca tiene exactamente un dueño.
  - **Community Manager** → NO se vincula a una marca directamente. Se vincula a **campañas**:
    `User.campaignsAsCM` vía `Campaign.cmId` (FK única — "solo un CM por campaña" a nivel BD).
  - **Diseñador** → tampoco se vincula a una marca directamente. Se vincula a campañas vía el nuevo join
    `CampaignDesigner {campaignId, userId}` (sin campo de rol — la membresía en esa tabla ya implica
    "diseñador").
  - La marca de un CM/Diseñador solo es derivable **indirectamente**, siguiendo `Campaign.brandId` de sus
    campañas asignadas — nunca es un campo directo del usuario.
- **Dónde se manifiesta esta suposición obsoleta**:
  - `@repo/ui`: `AuthState.brandIds`, `JwtPayload.brandIds`, `MockUser.brandIds` (en
    `commons/src/types/auth.types.ts`, `commons/src/state/auth.slice.ts`, `commons/src/mocks/mock-users.ts`,
    `mock-tokens.ts`, `build-user-token.ts`) — **todos los usuarios mock de prueba, incluidos CM y
    Diseñador, traen un `brandIds` que ya no corresponde a ninguna relación real**.
  - `admin-front`: `MockUser.brand: string | null` — columna "Perfil" en `/users`, y el campo "Perfil
    asignado (opcional)" en `CreateUserDialog.tsx` al crear un CM/Diseñador — ambos asumen asignación
    directa usuario↔marca que ya no existe; la asignación real ocurre a nivel `Campaign`.
  - `brands-front`: el "team" por campaña (`MOCK_TEAM_BY_CAMPAIGN`) mezcla CM + Diseñadores + **incluso al
    Cliente** en un solo arreglo `MockTeamMember[]` con un campo `role: string` libre — la estructura real
    separa el CM (FK única en `Campaign.cmId`) de los Diseñadores (join `CampaignDesigner`, cardinalidad
    N), y el Cliente nunca fue un "team member" (es `Campaign.createdBy`/`Brand.ownerId`).
- Ver decisión pendiente en §9.1 sobre cómo resolver `brandIds` para CM/Diseñador sin decidirlo
  unilateralmente.

### 1.3 🟡 `PostStatus` pasa de 6 a 10 valores — falta actualizar en todas partes

`modelo.txt` (líneas 329-340): `borrador, en_revision, aprobado, rechazado, programado, publicando,
publicado, parcial, error, cancelado`. El frontend entero (heredado desde `@repo/ui/types/post.types.ts`)
solo conoce los 6 originales. Faltan: **`publicando`, `parcial`, `error`, `cancelado`**.

- **`@repo/ui/types/post.types.ts`** — el `PostStatus` union type raíz, del que heredan (por
  re-export o copia local) `posts-front`, `brands-front`, `analytics-front`.
- **`@repo/ui/ui/atoms/StatusChip/StatusChip.tsx`** — `STATUS_COLORS`/`STATUS_LABELS` solo tienen 6
  entradas; sin las 4 nuevas, cualquier post en esos estados cae al fallback genérico (fondo gris, label
  = el string crudo sin traducir).
- **`posts-front`** — `app/posts/page.tsx`'s `FILTERS` (chips de estado) y el Kanban de `/posts/approvals`
  solo cubren el subconjunto viejo.
- **`analytics-front`** — `lib/analytics/types.ts`'s `PostStatus` local (copia, no re-export) y
  `AnalyticsFilterDrawer.tsx`'s `ALL_STATUSES` — mismo problema.
- Además, nuevo enum **`PostSocialAccountStatus`** (`pendiente, publicando, publicado, error, cancelado`)
  no existe en ninguna parte del frontend — es el estado _por red_, distinto del estado _del post_. Ver
  §9.3 sobre cuánto de esta dimensión nueva conviene exponer en la UI actual.

> **Nota (2026-08-17)**: se agregó un 11vo valor, `rechazado_cliente` (Fase O — segundo tramo de
> aprobación del Cliente: el Cliente rechaza y el CM decide el siguiente paso), en una fase posterior a
> este documento — ver el union type real en `apps/frontend/commons/src/types/post.types.ts`. El resto de
> esta sección (6 → 10 valores) sigue siendo un registro histórico válido del cambio original.

### 1.4 🟡 `coverage` en el Score es informativo — NO pondera. La UI de analytics-front lo trata como un 4º factor

`modelo.txt` (líneas 474-475, 484): comentario explícito —
`Score = (Consistencia×0.30) + (Engagement×0.40) + (Frecuencia×0.30)`, y `coverage` está anotado
**"informativa — no forma parte de la fórmula del score"**. Esto coincide con lo que ya dice
`.claude/CLAUDE.md` del repo, y **contradice** la fórmula de 4 factores que hoy tiene el backend (fuera de
alcance, se reescribirá).

- **`analytics-front/lib/analytics/engine.ts`, `buildScoreExplanation`** — trata `coverage` como un
  componente más en el mismo arreglo que `consistency`/`engagement`/`frequency`, sujeto a los mismos
  umbrales 70/60 para clasificarlo como "factor positivo/negativo" — sin ninguna distinción de que es
  meramente informativo.
- **`analytics-front/components/dashboard/ScoreExplanationPanel.tsx`** — renderiza las 4 barras de
  progreso (Consistencia/Engagement/Cobertura/Frecuencia) de forma visualmente idéntica y consecutiva, sin
  ningún indicador de que "Cobertura" no pondera.
- **`@repo/ui/types/score.types.ts` y `analytics-front/lib/analytics/types.ts` (`ScoreSnapshot`)** — el
  orden de campos coloca `coverage` entre `engagement` y `frequency` (en vez de después de `frequency`,
  como en `modelo.txt`), reforzando visualmente que es "un factor más del medio".
- **Nota positiva**: `brands-front`'s página `/brands/[id]/score` (breakdown: Consistency 30% / Engagement
  40% / Frequency 30% + barra de Coverage separada) y el `MetricsSection` de la landing de `web-shell`
  **ya están alineados** con la fórmula correcta — no requieren cambio.

### 1.5 🟠 Casing de `SocialNetwork.code` — decisión pendiente, usado en todos lados

`modelo.txt:124`: `code String @unique // 'instagram' | 'tiktok' | etc.` (nombres completos, minúsculas).
El frontend entero usa códigos cortos en mayúsculas: `SocialNetworkCode = 'IG'|'TK'|'LI'|'FB'|'X'|'YT'`
(definido de forma casi idéntica —y por tanto duplicada— en `brands-front`, `posts-front`,
`analytics-front`, y usado también en `web-shell`'s landing con esos mismos 2-letter codes).

**No se decide en este documento cuál convención prevalece** — es la decisión transversal más consecuente
de todas porque toca prácticamente cada mapa/config/tipo que indexa por red social en las 4 apps.
Ver opciones concretas en §9.2.

### 1.6 🟢 `SocialAccount`/`MockCampaign` están duplicados con formas incompatibles entre apps

Ya era cierto antes de este análisis, pero `modelo.txt` lo hace más urgente porque ninguna de las
variantes actuales coincide con el modelo real:

- **`SocialAccount`** tiene 3 formas distintas e incompatibles hoy: `brands-front`
  (`{id, brandId, socialNetwork, handle, followers, active}`), `posts-front`
  (`{id, brandName, socialNetwork, handle, networkBg, networkColor}` — sin `brandId`/`followers`/`active`,
  mezcla datos con estilos de UI), y `web-shell` (`{id, socialNetwork: string}`, en la práctica una lista
  de redes, heredera del nombre viejo `BrandProfile`). Ninguna tiene `socialNetworkId` (FK al catálogo
  `SocialNetwork`), que es como lo modela `modelo.txt`.
- **`MockCampaign`** también difiere entre `brands-front` (`{id, brandId, name, status, startDate, endDate,
postsCount, socialAccountIds}`) y `posts-front` (`{id, name, color, brand}` — sin `brandId`, fechas, ni
  status).
- **Recomendación consolidada**: mover un `SocialAccount`/`Campaign` canónico a `@repo/ui/types` (siguiendo
  exactamente los campos de `modelo.txt`) y que las 3 apps lo consuman desde ahí, en vez de mantener 3
  copias que divergen cada vez más.

---

## 2. `@repo/ui` (`apps/frontend/commons/`) — paquete compartido por las 6 apps

Como es la única fuente de tipos compartida, **la mayoría de los hallazgos transversales de la §1 deben
resolverse aquí primero**.

### Renombrar campos

| Archivo               | Campo actual                  | Cambiar a                                                                                        |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `types/post.types.ts` | `Post.brandProfileId: string` | `brandId: string` + agregar `socialAccounts: PostSocialAccount[]` (ver §1.1 — no es solo rename) |

### Campos faltantes

| Archivo                                                      | Falta                                                                                                                                         | Fuente en `modelo.txt`                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `types/auth.types.ts` (`AuthUser`, `MockUser`, `JwtPayload`) | `status: UserStatus` (`pending\|active\|suspended`)                                                                                           | `User.status`                                                                                                       |
| ídem                                                         | `avatarUrl?: string`                                                                                                                          | `User.avatarUrl`                                                                                                    |
| `types/auth.types.ts` (`AuthUser`, `JwtPayload`)             | `name: string` (hoy solo existe en `MockUser`)                                                                                                | `User.name` — sin esto ningún front puede mostrar el nombre del usuario logueado desde Redux                        |
| — (no existe archivo)                                        | Tipos `PasswordResetToken`, `ForgotPasswordRequest{email}`, `ResetPasswordRequest{token,newPassword}`                                         | `PasswordResetToken` — no hay ni un solo tipo, mock, ni endpoint stub para forgot/reset password en todo `@repo/ui` |
| `api/auth.api.ts`                                            | Endpoints mock `forgotPassword`/`resetPassword` (hoy solo `login`/`register`)                                                                 | idem                                                                                                                |
| — (no existe archivo)                                        | Tipos `Brand`, `Campaign`, `Notification`, `Media`, `Report`, `SocialNetwork` — **ninguno existe en absoluto** en todo el frontend compartido | `modelo.txt` líneas 213-245, 269-294, 71-81, 437-459, 496-507, 121-134                                              |
| ídem                                                         | `CampaignDesigner {campaignId, userId}`                                                                                                       | `modelo.txt` líneas 296-304                                                                                         |
| `types/score.types.ts`                                       | `BrandScore.id`, `BrandScore.brandId`                                                                                                         | `modelo.txt` líneas 476-489                                                                                         |
| —                                                            | `PostSocialAccount`, `PostSocialAccountStatus` enum                                                                                           | `modelo.txt` líneas 342-348, 395-415                                                                                |
| `hooks/useNotifications.ts`                                  | Tipo `Notification` real (hoy stub inline `{id, readAt?}[]`)                                                                                  | `Notification{userId, type, payload, createdAt}`                                                                    |

### Campos/valores obsoletos

| Archivo                                                                                                      | Campo                                                             | Por qué                                                                                                |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `types/auth.types.ts`, `state/auth.slice.ts`, `mocks/mock-users.ts`, `mock-tokens.ts`, `build-user-token.ts` | `brandIds: string[]` en TODOS los roles (incl. CM/Diseñador)      | Ver §1.2 — ya no hay `BrandUser`; solo tiene sentido 1:1 para Cliente (`ownedBrands`)                  |
| `types/post.types.ts`                                                                                        | `PostStatusHistory.id: number`                                    | `modelo.txt` usa `BigInt` — probablemente debe ser `string` al serializar (ver decisión §9.4)          |
| `ui/atoms/StatusChip/StatusChip.tsx`                                                                         | `STATUS_COLORS`/`STATUS_LABELS` con solo 6 entradas               | Ver §1.3                                                                                               |
| `types/score.types.ts`                                                                                       | Orden de campos en `BrandScore` (`coverage` antes de `frequency`) | Ver §1.4 — no rompe en runtime pero desalinea la lectura, agregar comentario "informativa, no pondera" |

---

## 3. `web-shell` (`apps/frontend/web-shell/`)

### Renombrar campos

- `interfaces/interface.ts` → `MockRecentPost.brandProfileId` → `brandId` (usado en `lib/mock-data.ts`,
  `DashboardCM.tsx:80`, `DashboardDisenador.tsx:89`, `DashboardCliente.tsx:68`).
- `interfaces/interface.ts` → `SocialAccount {id, socialNetwork: string}` — colisiona de nombre con el
  `SocialAccount` real de `modelo.txt` pero tiene forma distinta (en la práctica es una lista de redes, no
  de cuentas). Renombrar a algo como `SocialNetworkOption` para no perpetuar la confusión.

### Campos faltantes

- Ningún tipo `Brand`/`Campaign`/`Notification` real (ver §2 — corresponde arreglarlo en `@repo/ui` y que
  web-shell lo consuma de ahí).
- `MockCampaignSummary` (`interfaces/interface.ts`) le faltan `brandId, status, cmId, designers,
categories, objective, startDate/endDate` frente al `Campaign` real.

### Campos/valores obsoletos

- `MockCampaignSummary.progress: number` — no existe ningún campo de "progreso" en `Campaign` de
  `modelo.txt`; sería un valor derivado (ver decisión §9.5).
- Mismo problema de `brandIds`/team-por-marca que el resto (heredado de `@repo/ui`, no hay mock propio
  adicional más allá de lo ya cubierto en §1.2).

---

## 4. `admin-front` (`apps/frontend/admin-front/`)

### Renombrar campos

| Archivo                                         | Campo actual                              | Cambiar a                                                                             |
| ----------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `interfaces/interface.ts` `MockUser.status`     | `'activo'\|'inactivo'`                    | `'pending'\|'active'\|'suspended'` (traducir solo en la capa de presentación)         |
| `lib/mock-data.ts` `USER_STATUS_STYLE`          | keys `activo`/`inactivo`                  | keys `pending`/`active`/`suspended` (agregar estilo para `pending`, hoy inexistente)  |
| `lib/mock-data.ts` `MOCK_USERS[].role`          | string libre (`'CM'`, `'Diseñador'`)      | `roleId` o `{id, name}` — ver decisión §9.6 sobre qué valor exacto tendrá `Role.name` |
| `mock-data.ts` `MockAuditEntry.actor`           | nombre de persona en texto libre          | `performedBy` como id (FK → `users.id`), resolver nombre en UI vía join               |
| `interfaces/interface.ts` `MockAuditEntry.date` | string pre-formateado (`'25 jun, 16:45'`) | `createdAt: string` (ISO), formatear solo al renderizar                               |

### Campos faltantes

- `MockUser`: `roleId`, `avatarUrl`, y sobre todo **el valor `status: 'pending'`** — que además ya tiene
  UI lista para consumirlo: `CreateUserDialog.tsx` genera un link de activación pero crea el usuario con
  `status: 'activo'` (línea 41) en vez de `'pending'`, pese a que el propio flujo (usuario sin password
  hasta activar) es exactamente lo que `modelo.txt` describe para `UserStatus.pending`.
- Catálogo `SocialNetwork` en `/catalogs/social-networks`: `MOCK_SOCIAL_NETWORKS` y el form genérico
  `CatalogList.tsx` solo capturan `name` — faltan **`code`** y **`baseEngagementRate`** (este último
  "alimenta el cron job de métricas simuladas" según el comentario del schema), campos reales y
  funcionales que no tienen forma de capturarse hoy.
- `MockAuditEntry`: faltan `tableName`, `recordId`, `before`/`after` (Json), `requestId` — hoy todo el
  diff se "narra" como texto libre en `action`/`entity`, sin datos estructurados reales.
- `MockCatalogItem.status: 'activo'|'inactivo'` no es un campo real en `modelo.txt` — los catálogos solo
  tienen `deletedAt: DateTime?` (soft delete). El "activo/inactivo" del mock debería mapear a
  `deletedAt === null`, no a un campo de estado independiente.

### Campos/valores obsoletos

- `MockUser.brand: string | null` — ver §1.2, ya no hay FK usuario↔marca para CM/Diseñador.
- `CreateUserDialog.tsx`'s campo "Perfil asignado (opcional)" — mismo problema; la asignación real ocurre
  a nivel `Campaign`, no al crear el usuario.
- `users/page.tsx`'s columna "Perfil" (renderiza `u.brand`) — redefinir en términos de campañas asignadas
  o quitarla.
- `MOCK_ROLES`/`MockRole` (`lib/mock-data.ts`, `interfaces/interface.ts`) — **código muerto**: no se usa en
  ninguna página (`/roles` usa `DEFAULT_PRIVILEGES`/`PrivilegeMap`, no esto), y además sus keys de permisos
  están en español mientras `DEFAULT_PRIVILEGES` usa slugs en inglés (`users`, `post`, `manage`...) — ya
  desincronizado internamente. Recomendación: eliminarlo.

---

## 5. `auth-front` (`apps/frontend/auth-front/`)

### Renombrar campos

| Archivo                               | Campo actual                               | Cambiar a                                                                                                 |
| ------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `RegisterForm.tsx` `category` (state) | nombre de categoría como string (`'Moda'`) | `categoryId` — poblar el selector desde objetos `{id, name}` del catálogo `Category`, no desde `string[]` |

### Campos faltantes — 🔴 el hallazgo más urgente de esta app

- **`ResetPasswordForm.tsx` no captura el `token` de la URL en absoluto.** No hay `useSearchParams`, no
  hay estado `token`, y `handleSubmit` nunca lo usa — pese a que el propio comentario en el archivo ya dice
  que el futuro endpoint es `POST auth/reset-password {token, password}`. Con `PasswordResetToken` ahora
  siendo un modelo real (`token: String @unique`, UUID enviado por correo), el link de reset
  (`/reset-password?token=<uuid>`) debe leerse igual que `ActivateForm.tsx` ya lee `?email=`.
- `app/reset-password/page.tsx` debe leer `token` de `searchParams` y pasarlo a `ResetPasswordForm`.
- `ForgotPasswordForm.tsx` — el payload comentado `{email}` sigue siendo correcto (el backend busca el
  `User` por email y crea el `PasswordResetToken` internamente); solo falta aclarar en el comentario que
  el token no vuelve en la respuesta HTTP, se envía por correo.

### Campos/valores obsoletos

- Ninguno específico de esta app más allá de lo ya cubierto en §1 (`brandIds` heredado de `@repo/ui`,
  `SocialNetworkCode` casing si `RegisterForm` llega a mostrar selección de redes en el futuro).

---

## 6. `brands-front` (`apps/frontend/brands-front/`)

### Renombrar campos

| Archivo                                                                                         | Campo actual                                                                           | Cambiar a                                                                                                    |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `interfaces/interface.ts` `MockProfile`                                                         | interfaz que representa `Brand` pero se llama `MockProfile`; campo `type: ProfileType` | Renombrar campo `type`→`profileType: string \| null` (mantener nombre de interfaz o renombrar a `MockBrand`) |
| ídem                                                                                            | `MockProfile.profiles: SocialAccount[]`                                                | `socialAccounts`                                                                                             |
| ídem                                                                                            | `MockProfile.category: string` (string libre)                                          | `categoryId: string` + resolver `category: {id, name}` del catálogo compartido                               |
| `interfaces/interface.ts` `SocialAccount.socialNetwork: SocialNetworkCode`                      | código crudo baked-in                                                                  | `socialNetworkId: string` (FK a catálogo `SocialNetwork`)                                                    |
| `interfaces/interface.ts` `MockCalendarEvent.brandProfileId`, `MockCampaignPost.brandProfileId` | —                                                                                      | `socialAccountId` (ver §1.1 — en realidad requiere modelar N redes, no solo renombrar)                       |

### Campos faltantes

- `MockProfile` (Brand): **`ownerId`** (hoy solo hay un lookup ad-hoc `getCurrentClientProfile(email)` en
  vez de un campo real), **`ayrshareProfileKey`**, **`slug`**, **`logoUrl`**, **`primaryColor`** (hoy
  `color` cubre parcialmente esto sin llamarse igual).
- `MockCampaign`: **`objective`**, **`description`**, **`createdBy`** — todos ausentes tanto del tipo como
  del formulario `CreateCampaignDialog.tsx`.
- `MockCampaign.cmId` — **el gap más consecuente de esta app**: no existe ningún campo `cmId` en
  `MockCampaign`. El CM hoy solo es representable como una entrada con `role: 'Community Manager'` dentro
  de `MockTeamMember[]`, una estructura paralela y desconectada de la campaña misma (`MOCK_TEAM_BY_CAMPAIGN`,
  indexada por `campaignId`). Ver decisión §9.7.
- Designers vía `CampaignDesigner` (join limpio sin rol) — hoy son solo entradas con `role: 'Diseñador'`
  mezcladas en el mismo arreglo que el CM y hasta el Cliente.
- `Campaign.categories` (multi-categoría vía `CampaignCategory`) — no existe, solo hay `Brand.category`
  (única).
- Media/`PostMedia` — ninguna UI de brands-front tiene concepto de adjuntar imagen/video (se deja como
  ausencia documentada, no como algo a construir ahora).

### Campos/valores obsoletos

- `ProfileType = 'brand'|'company'|'organization'|'creator'|'personal'` (unión TS cerrada de 5 valores) —
  `modelo.txt` dice `profileType: String?`, un string libre y nullable, NO un enum enforced; los ejemplos
  del comentario del schema son en español (`"Marca"|"Empresa"|"Creador"`), distintos de los valores en
  inglés que usa hoy el frontend. Ver decisión §9.8.
- `MOCK_TEAM_BY_CAMPAIGN` con entradas `role: 'Cliente'` — el Cliente nunca fue un "team member" en el
  modelo real (es `createdBy`/`ownerId`), ver §1.2.
- `MockTeamMember.role: string` libre — reemplazado estructuralmente por `Campaign.cmId` (FK única) +
  `CampaignDesigner[]` (join sin rol) — ya no es "una lista con un campo de rol".

---

## 7. `posts-front` (`apps/frontend/posts-front/`)

### Renombrar campos

| Archivo                                                | Campo actual         | Cambiar a                                                  |
| ------------------------------------------------------ | -------------------- | ---------------------------------------------------------- |
| `interfaces/interface.ts` `PostMetrics.engagementRate` | `engagementRate`     | `engagement` (mismo rename que en `PostMetric` del schema) |
| `lib/mock-data.ts` (literal de métricas del post `p5`) | key `engagementRate` | `engagement`                                               |

### Campos faltantes — 🔴 la app con el gap estructural más grande de todas

- `MockPost.brandId` — hoy el brand solo es alcanzable indirectamente vía `getPostNetworkInfo()`.
- `MockPost.ayrsharePostId`.
- **`MockPost.socialAccounts: PostSocialAccount[]`** en vez del actual `brandProfileId: string` único —
  ver §1.1. Esto implica rediseñar `/posts/new`:
  - `const [brandProfileId, setBrandProfileId] = useState('bp1')` → debe volverse
    `const [socialAccountIds, setSocialAccountIds] = useState<string[]>([])`.
  - El chip-picker de selección única (`onClick={() => setBrandProfileId(p.id)}`) → toggle multi-select
    (mismo patrón que ya usa `CreateCampaignDialog` de brands-front para elegir cuentas sociales).
  - El límite de caracteres y la vista previa (hoy calculados para 1 red) necesitan decidir cómo
    comportarse con N redes seleccionadas — ver decisión §9.9.
- `PostMetrics.views: number?` (campo nuevo) y **todos los campos de `PostMetrics` deben volverse
  opcionales** (`likes?, comments?, shares?, views?, reach?, engagement?`) — hoy son todos `number`
  requeridos.
- Concepto de **snapshot temporal** (`PostMetric.capturedAt`) — hoy `MockPost.metrics` es un único bloque
  "actual", no una serie de capturas en el tiempo.
- `PostSocialAccountStatus` — no existe ninguna representación de estado por red.
- `MockCampaign` (propia de posts-front) — le faltan `brandId`, `status`, `startDate/endDate`, `objective`
  frente al `Campaign` real (ver también §1.6 sobre la duplicación con la versión de brands-front).

### Campos/valores obsoletos

- `brandProfileId: string` único en `MockPost` — ver §1.1, superado por el fan-out multi-red.
- `app/posts/page.tsx`'s `FILTERS` (`all, en_revision, rechazado, programado, publicado`) — no cubre los 4
  estados nuevos de `PostStatus`.
- El placeholder estático "Imagen adjunta" en la vista previa de `/posts/new` — no tiene ningún campo real
  detrás (ni `mediaId` ni `url`); es el único indicio en todo posts-front de un concepto de adjuntos, y no
  está conectado a nada. Documentar como ausencia, no construir ahora.
- El `PostStatus` heredado de `@repo/ui` con solo 6 valores (ver §1.3, corresponde arreglarlo ahí).

---

## 8. `analytics-front` (`apps/frontend/analytics-front/`)

### Renombrar campos

- `lib/analytics/types.ts` `SocialMetricFact.engagementRate` → `engagement` (propagar a `engine.ts`,
  `network-config.ts`'s `COMPARABLE_METRICS`, `mock-data.ts`, `ScoreExplanationPanel.tsx`,
  `interfaces/interface.ts`'s `MockTopPost.engagementRate`).

### Campos faltantes

- `SocialMetricFact.views?: number` (campo nuevo en `PostMetric`). Nota: hoy `impressions` se usa como
  proxy de "Views" en varias networks (`network-config.ts`) — decidir si colapsa a `views` real o se
  mantiene separado (ver decisión §9.10).
- `PostStatus` local (copia en `lib/analytics/types.ts`, no re-exportada de `@repo/ui`) — le faltan los
  mismos 4 valores nuevos que en toda la app (ver §1.3), y `AnalyticsFilterDrawer.tsx`'s `ALL_STATUSES`
  necesita el mismo ajuste. **Corrección respecto al brief inicial**: este filtro de estado SÍ está
  habilitado y funcional hoy (no deshabilitado como se asumía) — filtra sobre `PostStatus` del Post, no
  sobre `PostSocialAccountStatus`.

### Campos/valores obsoletos o sin equivalente en BD

| Campo actual (`SocialMetricFact`)      | ¿Existe en `PostMetric`? | Evaluación                                                                                                                                                                                                                                                                     |
| -------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `impressions`                          | No                       | Sin equivalente directo — candidato a colapsar/renombrar a `views`, pero requiere decisión (ver §9.10) porque hoy se usa también para redes donde "impressions" y "views" son conceptos distintos (IG vs. TikTok/YT)                                                           |
| `followersGained` (por post)           | No                       | `SocialAccount.followers` es un contador absoluto de cuenta, no un delta por publicación — parece no-derivable sin snapshots históricos. Afecta `AnalyticsKpis.followersGained`, `AudienceOverviewData`, y el ranking de campañas en `computeInsights`/`buildScoreExplanation` |
| `reach`, `likes`, `comments`, `shares` | Sí                       | Directos, sin cambios                                                                                                                                                                                                                                                          |

### 🔴 Hallazgo crítico (ya detallado en §1.4)

`ScoreExplanationPanel.tsx` y `buildScoreExplanation` en `engine.ts` tratan `coverage` como un 4º factor
ponderado igual a `consistency`/`engagement`/`frequency`, violando el comentario explícito de `modelo.txt`
de que es solo informativo. Cambios concretos recomendados:

1. Sacar `coverage` del arreglo `components` que alimenta `positiveFactors`/`negativeFactors` en
   `buildScoreExplanation`, o exponerlo aparte (`ScoreExplanation.coverageInfo`).
2. En `ScoreExplanationPanel.tsx`, mover la barra de "Cobertura" fuera del grupo de los 3 factores
   ponderados, con copy explícito ("informativa, no pondera").
3. Reordenar/anotar `ScoreSnapshot` (`analytics-front`) y `BrandScore` (`@repo/ui`) para que `coverage`
   vaya después de `frequency`, como en `modelo.txt`.

---

## 9. Decisiones que requieren al humano (consolidado, deduplicado)

Ningún agente decidió esto unilateralmente — son decisiones de producto/equipo, no mapeos mecánicos.

1. **`brandIds` en JWT/AuthState para CM y Diseñador** (§1.2): ¿se elimina y se deriva en tiempo real de
   `campaignsAsCM`/`campaignDesignerships` → `Campaign.brandId`, se mantiene como campo calculado que el
   backend expone por conveniencia, o se resuelve de otra forma? Para Cliente no hay ambigüedad
   (`ownedBrands` mapea 1:1).
2. **Casing de `SocialNetwork.code`** (§1.5): ¿nombres completos en minúsculas (`'instagram'`, alineado al
   comentario de `modelo.txt`) o mantener los códigos cortos en mayúsculas (`'IG'`,`'TK'`...) que usa hoy
   todo el frontend, dejando el code real de BD como un campo aparte (p. ej. un `shortLabel` puramente de
   UI)? Afecta transversalmente a `web-shell`, `brands-front`, `posts-front`, `analytics-front`.
3. **Cuánto de `PostSocialAccountStatus` (estado por red) exponer en la UI actual de un solo estado**
   (§1.3): ¿el Kanban/lista de posts sigue mostrando solo el `PostStatus` agregado (ahora con 10 valores),
   con el detalle por red solo visible en `/posts/[id]`? ¿O las filas de la lista también muestran una
   mini-franja de estado por red una vez que un post tiene múltiples `PostSocialAccount`?
4. **Serialización de campos `BigInt`** (`PostStatusHistory.id`, `AuditLog.id`) — ¿`string` o `number` en
   el frontend? Depende de cómo el backend (aún no escrito) decida serializar `BigInt` en JSON;
   recomendación técnica es `string` para no perder precisión, pero se deja como decisión de equipo.
5. **Rediseño del multi-select de redes en `/posts/new`** (§7): ¿una vista previa por red seleccionada, o
   una vista previa genérica + un aviso con todos los límites de caracteres aplicables?
6. **Valor exacto de `Role.name` en BD** — hoy `admin-front` usa labels cortos (`'CM'`, `'Diseñador'`)
   mientras `@repo/ui`'s `AppRole` usa slugs (`'community_manager'`, `'disenador'`), y ninguno de los dos
   está confirmado contra lo que sembrará el seed real. Debe fijarse una sola convención.
7. **`Campaign.cmId` en brands-front** — dado que hoy el CM vive mezclado en `MockTeamMember[]`, ¿se separa
   ya en dos estructuras (`MOCK_CAMPAIGN_CM: Record<campaignId, {cmId,...}>` 1:1 + `MOCK_CAMPAIGN_DESIGNERS:
Record<campaignId, string[]>` N:N), sabiendo que la UI de "Agregar/Quitar Diseñador" ya se comporta como
   si fuera N:N (nunca toca al CM)? ¿Y se sigue sintetizando un "Cliente" dentro del team, o se elimina del
   todo ahora que es `createdBy`?
8. **Valores finales de `Brand.profileType`** — ¿se estandariza en inglés (los 5 valores actuales del
   frontend) o en español (los 3 ejemplos del comentario de `modelo.txt`)? El campo es un string libre en
   BD, así que cualquier convención es técnicamente válida, pero debe ser una sola.
9. **Comportamiento del multi-select de redes en `/posts/new`** con límites de caracteres distintos por
   red — ver punto 5 (duplicado intencional, es la misma pregunta vista desde el ángulo UX).
10. **`impressions` vs. `views`** en analytics-front — ¿se colapsan en el mismo campo (`views`, el que sí
    existe en BD) o se mantienen conceptualmente separados por red (IG "impressions" ≠ TikTok/YT "views")?
11. **`BrandScore.classification`** — ¿se mantiene como unión cerrada (`'bajo'|'medio'|'alto'`) o se
    relaja a `string` abierto, ya que `modelo.txt` no la restringe con un enum? Afecta también a
    `ScoreGauge.tsx`, que tiene el mismo union hardcodeado.
12. **Catálogo `SocialNetwork` en `admin-front`** — el form genérico `CatalogList.tsx` (reusado hoy para
    Categorías/Especialidades/Redes) no soporta los campos extra que Redes necesita (`code`,
    `baseEngagementRate`). ¿Se separa un formulario propio para redes sociales, o se extiende el genérico
    con campos opcionales por tipo de catálogo?

---

## 10. Orden de trabajo sugerido

Para que el cambio sea lo más chico posible si el modelo real vuelve a moverse, conviene ir de lo
compartido a lo específico:

1. **`@repo/ui/types`** primero — corregir `PostStatus` (10 valores), `BrandScore` (campos + orden),
   agregar `Brand`/`Campaign`/`SocialAccount`/`PostSocialAccount`/`Notification`/`PasswordResetToken`
   canónicos, decidir y aplicar §9.1 (`brandIds`) y §9.2 (casing de red social) — todo lo demás depende de
   estas decisiones.
2. **`@repo/ui/ui/atoms/StatusChip`** — ampliar `STATUS_COLORS`/`STATUS_LABELS` a los 10 estados.
3. **`web-shell`** — consumir los tipos ya corregidos de `@repo/ui`, renombrar `brandProfileId`→`brandId`.
4. **`admin-front`/`auth-front`** — alinear `UserStatus`, arreglar el flujo de reset-password (el gap más
   urgente de auth-front), quitar el campo "marca" de usuarios CM/Diseñador.
5. **`brands-front`/`posts-front`** — el trabajo más grande: separar CM/Diseñadores en la estructura de
   equipo, y sobre todo rediseñar `/posts/new` para el fan-out multi-red.
6. **`analytics-front`** — renombrar `engagementRate`→`engagement`, agregar `views`, y corregir la
   presentación de `coverage` como no-ponderado en `ScoreExplanationPanel`.
