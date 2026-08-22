# Bananagram — referencia de API para la Alexa Skill

> Documento de contexto, pensado para pasarse tal cual al equipo/código del Lambda. Reemplaza en la
> práctica a `AlexaSkill-Diseno-Final.md` y `lambda-codigo-por-pasos.md` (ambos marcados como descartados
> — describen un diseño que no es el que se construyó). Fuente de verdad completa, con el detalle de cómo
> se llegó a cada decisión: `docs/todos/2026-08-10-ayrshare-pipeline-alexa-endpoints-plan.md`. Última
> verificación en vivo: 2026-08-14.

## Base URL y autenticación

⚠️ **Los 2 servicios llevan `/api` en la URL base, siempre — sin excepción, sin importar si le pegas al
gateway o directo al puerto del servicio.** Los dos tienen `app.setGlobalPrefix('api')` en su `main.ts`. Si
`AUTH_SERVICE_URL`/`ALEXA_SERVICE_URL` no incluyen `/api`, **toda** llamada da 404 (confundible con "código
inválido" si el manejo de errores no distingue el status code).

- **`alexa-service`**: `http://<host>:3004/api` — atiende campañas e ideas. **No está proxeado por el
  gateway** (`localhost:4000`) a propósito — el Lambda debe pegarle directo a este puerto, con `/api`
  incluido en la variable de entorno (ej. `ALEXA_SERVICE_URL=http://<host>:3004/api`).
- **`auth-service`**: `http://<host>:4000/api` (vía gateway) o `http://<host>:3001/api` (directo) — atiende
  el canje del código de vinculación. Mismo cuidado: `AUTH_SERVICE_URL` **debe** incluir `/api` (ej.
  `AUTH_SERVICE_URL=http://<host>:4000/api`), aunque apunte al gateway.
- Todas las rutas de `alexa-service` (excepto donde se indique) requieren `Authorization: Bearer
  <accessToken>`, obtenido del paso de account-linking. **El access token dura solo 15 minutos**
  (`JWT_EXPIRES_IN=15m`) — con una skill de voz, donde el usuario vuelve horas o días después, esto expira
  todo el tiempo. `POST /auth/refresh` ya existe, es público y genérico (lo usa la plataforma web a diario)
  y el Lambda **sí debe usarlo** — ver sección 1-bis, más abajo. Sin refresh, cada expiración de 15 min
  obligaría a re-vincular la cuenta con un código nuevo — con refresh, la sesión aguanta hasta 7 días sin
  pedir nada.
- **Diagnóstico rápido si algo falla siempre**: loggea `error.response.status` y `error.response.data` (no
  solo el mensaje de voz) — un 404 significa URL mal armada (falta `/api`), un 401 en `/link-code/redeem`
  significa código inválido/expirado/ya usado de verdad, cualquier otro status es un error real del backend.

## 1 — Vincular cuenta (account linking)

El usuario genera un código de 4 dígitos desde la plataforma web (logueado), se lo dice a Alexa, y el
Lambda lo canjea por credenciales reales.

**`POST /auth/link-code/redeem`** (público, sin `Authorization`)

Request:
```json
{ "code": "1234" }
```

Response (200):
```json
{
  "accessToken": "eyJ...",
  "refreshToken": {
    "id": "uuid",
    "userId": "uuid",
    "token": "uuid — este es el string que se manda a /auth/refresh, NO el objeto completo",
    "familyId": "uuid",
    "expiresAt": "2026-08-25T06:12:00.965Z",
    "usedAt": null,
    "revokedAt": null,
    "createdAt": "2026-08-18T06:12:00.967Z"
  },
  "userId": "uuid",
  "name": "Nombre para mostrar"
}
```

⚠️ **`refreshToken` es un objeto, no un string** — error real que traía esta guía antes. El campo que
importa es `refreshToken.token`.

El Lambda guarda en el session attribute **persistente** (DynamoDB vía el SDK de Alexa, no en memoria — la
sesión de voz no sobrevive entre invocaciones sin persistencia real):
- `accessToken` (string, se manda como Bearer)
- `refreshToken.token` (string, se manda a `/auth/refresh` cuando haga falta — ver 1-bis)

Códigos ya usados o expirados (10 min) responden 401.

## 1-bis — Refrescar el access token (`POST /auth/refresh`)

Público, sin `Authorization`. Se usa cuando cualquier llamada a `alexa-service` responde 401 (el
`accessToken` guardado ya venció) — el patrón recomendado es: reintentar automáticamente una vez con el
token refrescado antes de pedirle nada al usuario.

Request:
```json
{ "refreshToken": "<el string que guardaste en refreshToken.token, no el objeto>" }
```

Response (200) — mismo shape exacto que `link-code/redeem` arriba (`accessToken` + `refreshToken` objeto
completo), **sin** `userId`/`name` (esos solo los da el canje inicial):
```json
{ "accessToken": "eyJ...", "refreshToken": { "token": "...", "expiresAt": "...", "...": "..." } }
```

⚠️ **Rotación obligatoria**: cada llamada a `/auth/refresh` invalida el `refreshToken.token` usado y entrega
uno nuevo — el Lambda **debe reemplazar** el que tenía guardado por el de la respuesta, siempre, en cada
llamada. Si se reintenta con un `refreshToken.token` ya usado, revocado o expirado, el backend detecta el
reuso y **revoca toda la sesión** (por diseño, para frenar un token robado) — el mensaje de error es
deliberadamente vago, no distingue la causa exacta.

Manejo recomendado en el Lambda:
1. Llamada normal a `alexa-service` → 401 → llamar `/auth/refresh` con el `refreshToken.token` guardado.
2. Si `/auth/refresh` responde 200 → guardar el `accessToken`/`refreshToken.token` nuevos, reintentar la
   llamada original una vez con el `accessToken` nuevo.
3. Si `/auth/refresh` responde 401 (token reusado/revocado/expirado) → no reintentar más — pedirle al
   usuario que vincule la cuenta de nuevo (`LinkAccountIntent`), igual que si nunca se hubiera vinculado.

## 2 — Campañas (solo lectura)

**`GET /api/campaigns`** — todas las campañas visibles para el usuario autenticado (filtrado server-side
por rol: Cliente ve las de su marca, CM/Diseñador solo las suyas, Administrador todas).

Response (200), array de:
```json
{
  "id": "uuid",
  "name": "string",
  "totalPosts": 0,
  "score": 79.8,
  "reach": 0,
  "engagement": null,
  "followers": 0,
  "topNetwork": "instagram",
  "topPost": { "postId": "uuid", "network": "instagram", "date": "2026-08-01T00:00:00.000Z", "engagementRate": 4.2 }
}
```

⚠️ **`score` puede venir `null`** — es información exclusiva del Cliente (dueño de la marca) y del
Administrador. Si quien vinculó la cuenta es un CM o Diseñador, `score` siempre es `null` — no es un error,
el Lambda debe manejarlo como "no disponible para este usuario" (ej. "no tengo el score de esta marca para
tu rol" en vez de fallar). `followers` es el conteo **actual**, no una ganancia — no hay endpoint todavía
para "cuánto creciste". `topPost`/`topNetwork` son `null` si la campaña no tiene publicaciones con métricas
capturadas aún.

**`GET /api/campaigns?name=<texto>`** — resuelve una campaña por nombre dicho por voz (match exacto
primero, si no hay ninguno cae a coincidencia parcial). Response: un solo objeto igual al de arriba, o
`null` si no hay ninguna coincidencia.

**`GET /api/campaigns/:id`** — detalle crudo de una campaña (sin componer score/métricas).

**`GET /api/campaigns/:id/metrics`** — métricas agregadas de la campaña (mismo objeto que compone
`totalPosts`/`reach`/`topPost`/etc. de arriba, pero con el desglose completo por red).

## 3 — Generación de ideas con IA para la Skill (`fetchContentIdeas`) — **implementado, 2026-08-18**

**`POST /api/ideas/generate`** — requiere `campanas:crear` (mismo permiso que `POST /api/ideas`).

Request:
```json
{ "campaignId": "uuid", "networkName": "instagram" }
```
`networkName` opcional (el intent `GenerateContentIdeasIntent` no lo marca como obligatorio en el diálogo).
Sin él, se le pide a la IA ideas para "redes sociales" en general en vez de una red específica — no se
inventa una red.

⚠️ **Siempre devuelve exactamente 3 ideas, sin excepción — no hay parámetro `quantity`.** Aunque el intent
tiene un slot `quantity` (`AMAZON.NUMBER`), este endpoint lo ignora a propósito: `SaveIdeaIntent` solo puede
referenciar ideas por voz con su slot `ideaNumber` (tipo `CustomAnswer`), que únicamente define 3 valores
("la primera/segunda/tercera") — devolver una cantidad distinta rompería ese intent. Si el Lambda recibe el
slot `quantity` del usuario, no lo mande a este endpoint (se descartaría en silencio de todos modos,
`ValidationPipe` con `whitelist:true`); considera que la skill siempre habla de "3 ideas" en su respuesta de
voz, no de lo que el usuario haya pedido.

Response (201), mismo shape que devuelve `ai-service` directo (`POST /api/ai/generate-ideas`), sin
reformatear:
```json
{
  "ideas": [
    {
      "title": "string",
      "concept": "string",
      "hook": "string — frase inicial pensada para captar atención, léela primero",
      "suggestedFormat": "string — ej. 'Instagram Reel', 'Carrusel de 5 diapositivas'",
      "callToAction": "string"
    }
  ]
}
```

**No guarda nada** — es responsabilidad del Lambda mantener en sesión la lista que Alexa acaba de leer (por
número/orden), para que `SaveIdeaIntent` (`ideaNumber`) pueda mapear el número dicho al texto real antes de
llamar `POST /api/ideas`. Un patrón razonable para `POST /api/ideas.text`: combinar `concept` + `hook` +
`callToAction` en un solo texto, o solo `concept` si se prefiere más breve — es una decisión de UX de voz,
no hay un campo único "listo para guardar" en la respuesta a propósito (para no perder información).

Errores: 400 si `campaignId` no es UUID o `quantity` está fuera de 1-8; 403 si no hay `campanas:crear`; 403
si la campaña no es del usuario (no distingue "no existe" de "no es tuya"); 500 si `ai-service` no pudo
contactar a OpenRouter o la respuesta no vino en el formato esperado — mismo criterio del resto del backend,
no se oculta el error real.

## 3-bis — Recomendaciones de campaña con IA (`GetIdeaRecommendationsIntent`) — **implementado, 2026-08-18**

**`GET /api/campaigns/:id/recommendations`** — sin `PermissionGuard` propio en `alexa-service` (mismo
criterio que el resto de `campaigns.controller.ts`: `ai-service` ya exige `campanas:ver` sobre el mismo
Bearer reenviado).

Response (200):
```json
{
  "summary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"]
}
```
Se arma a partir de datos reales de `GET /api/campaigns/:id` + `GET /api/campaigns/:id/metrics` (nunca
inventa cifras) — la IA solo da una lectura cualitativa de esos números reales, nunca una predicción
estadística. Mismos errores que arriba (403 sin acceso a la campaña, 500 si OpenRouter falla).

## 3-ter — Resumen de campaña (`GetCampaignSummaryIntent`) — **sin endpoint nuevo, a propósito**

No hace falta un endpoint dedicado: `GET /api/campaigns/:id/metrics` (§2) ya trae todo lo necesario para
armar un resumen hablado con datos reales (`totalPosts`/`reach`/`topPost`/desglose por red) — el Lambda lo
compone directo, sin IA de por medio (decisión explícita: "recommendations" usa IA, "summary" usa datos
puros). Si más adelante se decide que el resumen sí debe estar redactado por IA, sería un endpoint nuevo en
`ai-service` que reciba el mismo resumen agregado que ya arma `campaigns.service.ts` para
`recommendations` — no está implementado hoy.

## 3-quater — `GetTopContentIntent` con filtro por red/periodo (`networkName`, `dateRange`) — **pendiente**

`GET /api/campaigns/:id/metrics` da un solo `topPost` global, sin filtrar por red ni por periodo
(semana/mes/campaña). Queda pendiente decidir si el filtrado se hace del lado del Lambda (pidiendo el
desglose completo `byNetwork[]`, si se expone) o si se agrega un parámetro nuevo a este endpoint — no
resuelto en esta sesión.

## 4 — Ideas guardadas (CRUD real, ya funciona)

Las ideas son un sub-recurso de campaña — se guardan en Postgres (`ContentIdea`) para que la plataforma web
también pueda listarlas y borrarlas (nunca crearlas desde ahí, solo la Skill genera/dicta ideas).

**`GET /api/ideas?campaignId=<uuid>`** — lista las ideas guardadas de una campaña.

Response (200), array de:
```json
{
  "id": "uuid",
  "campaignId": "uuid",
  "createdBy": "uuid",
  "title": "string | null",
  "text": "string",
  "source": "sugerida | propia",
  "createdAt": "2026-08-01T00:00:00.000Z",
  "updatedAt": "2026-08-01T00:00:00.000Z"
}
```
(`title` es `null` cuando `source: "propia"` y el usuario no dictó un título — el contrato original del
Lambda solo esperaba `title`/`text`/`createdAt`; el resto de los campos vienen de más, se pueden ignorar.)

**`POST /api/ideas`** — guarda una idea nueva.

Request:
```json
{
  "campaignId": "uuid",
  "text": "string (obligatorio)",
  "title": "string (opcional)",
  "source": "sugerida | propia (opcional, default: sugerida)"
}
```
`source: "sugerida"` para ideas que vinieron de `GenerateContentIdeasIntent` (una vez que exista);
`source: "propia"` para ideas dictadas libremente por el usuario (`SaveCustomIdeaIntent`).

**`DELETE /api/ideas?campaignId=<uuid>&title=<texto>`** — borra por título (coincidencia exacta,
insensible a mayúsculas). Si hay más de una idea con el mismo título en esa campaña, borra la más reciente.
404 si no encuentra ninguna. Es soft delete.

**`DELETE /api/ideas/:id`** — variante por id (la usa la plataforma web; el Lambda puede usarla también si
en algún momento decide guardar el `id` de una idea al listarla, en vez de borrar por título).

**`PATCH /api/ideas/:id`** — editar `text`/`title` de una idea existente (no usado por el contrato actual
del Lambda, disponible si hace falta).

## Notas de alcance — qué NO cubre este documento

- No hay endpoint de "crecimiento histórico" (seguidores/score a través del tiempo) expuesto para la
  Skill — existe la infraestructura (`SocialAccountMetricSnapshot`, `BrandScore` como snapshot periódico)
  pero solo está conectada a la plataforma web (`analytics-front`), no a `alexa-service`.
- No hay refresh token flow para el Lambda — si el `accessToken` expira, hay que repetir el account-linking.
- `alexa-service` corre en `localhost:3004` en desarrollo — para que un Lambda real (en AWS) le pegue,
  hace falta desplegarlo con una URL pública o exponerlo con un túnel; eso sigue sin resolverse (ver
  auditoría de bloqueos para la Skill de sesiones anteriores).
