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
  <accessToken>`, obtenido del paso de account-linking. El access token dura poco (mismo TTL que el resto
  de la plataforma); si expira, hay que volver a vincular la cuenta (no hay refresh automático implementado
  para el Lambda todavía).
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
  "refreshToken": "eyJ...",
  "userId": "uuid",
  "name": "Nombre para mostrar"
}
```

El Lambda guarda `accessToken`/`refreshToken` asociados a la sesión del usuario de Alexa, y manda
`accessToken` como Bearer en todas las llamadas siguientes. Códigos ya usados o expirados (10 min) responden
401.

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

## 3 — Generación de ideas con IA — **no implementado**

No existe ningún endpoint que reciba `{ campaignId, networkName?, quantity? }` y devuelva ideas generadas.
Bloqueado por no tener todavía una `ANTHROPIC_API_KEY` de pago configurada. Si se prueba la Skill completa
hoy, el intent de generar ideas no tiene nada real que llamar.

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
