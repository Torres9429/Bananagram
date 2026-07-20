# Alexa Skill — Asistente Bananagram — Código del Lambda, paso a paso (final)

> Continúa a `../AlexaSkill-Diseno-Final.md` e `interaction-model-es-MX.json`/
> `interaction-model-en-US.json` (mismo directorio). Este documento
> **sustituye** a la versión anterior (100% mock, sin llamadas HTTP): esta
> versión llama al backend real de Bananagram (account-linking + auth-service,
> brands-service, content-service, analytics-service) y ya no usa
> `mockData.js` ni DynamoDB. Es para copiar y pegar directo en el editor de
> código de la consola (Code tab de tu Alexa-Hosted Skill), avanzando
> checkpoint por checkpoint. Cada checkpoint es autocontenible: se puede
> guardar (`Save`), hacer `Deploy` y probar en el simulador antes de seguir.
>
> **Contrato con el backend**: los checkpoints 2 y 6-18 asumen que
> brands-service, content-service y analytics-service ya exponen los
> endpoints descritos en `docs/base/service-boundaries.md` y
> `docs/base/modelo2.txt` (sección `ContentIdea`) — `GET /campaigns/mine`,
> `GET /campaigns/:id/metrics-summary`, `GET /campaigns/:id/top-content`,
> `GET /campaigns/:id/summary`, `POST/GET /campaigns/:id/ideas`,
> `DELETE /ideas/:id` — y que `auth-service` expone
> `GET /oauth/authorize` + `POST /oauth/token` para el account-linking. Si
> alguno de estos endpoints todavía no existe en el backend real, el Lambda
> tal como está aquí fallará al llamarlo (con el manejo de error del
> checkpoint 6, no un crash silencioso) — no es un bug de este documento,
> es la dependencia explícita que faltaba resolver antes de conectar la
> skill de verdad.

---

## 0. Antes de empezar

En el editor de código de una Alexa-Hosted Skill (pestaña **Code**) ya
existen `index.js` y `package.json`. Vamos a agregar 3 archivos nuevos con
el botón `+` de la barra de archivos:

```
lambda/
  index.js            ← ya existe, lo vamos a reemplazar por partes
  package.json         ← ya existe, se le agregan 2 dependencias (i18n) —
                          ya NO se agrega el adaptador de DynamoDB
  bananagramApi.js     ← nuevo — único punto de llamadas HTTP al backend real
  ideaTemplates.js     ← nuevo — banco de ideas de respaldo si Claude falla
  languageStrings.js   ← nuevo
```

**Variables de entorno** (configúralas en la consola de la Alexa-Hosted
Skill, pestaña Code → `.env`, o en la configuración del Lambda si usas AWS
directo):

```
AUTH_SERVICE_URL=http://localhost:3001
BRANDS_SERVICE_URL=http://localhost:3002
CONTENT_SERVICE_URL=http://localhost:3003
ANALYTICS_SERVICE_URL=http://localhost:3005
ANTHROPIC_API_KEY=sk-ant-...
```

En producción, estas URLs apuntan a los hosts reales desplegados de cada
microservicio — no hay gateway de por medio todavía (`api-gateway` sigue
sin rutas activas, ver `docs/base/service-boundaries.md`), así que el
Lambda llama a cada servicio directo, igual que ya hace hoy el frontend
(`commons/src/api`) contra los puertos fijos de cada zona.

Flujo de trabajo en cada checkpoint: pega el código → `Save` → `Deploy` →
prueba en la pestaña **Test** → si funciona, sigue al siguiente checkpoint.

---

## 1. `package.json` — dependencias

Abre `package.json`. Dentro de `"dependencies"` ya tienes `"ask-sdk-core"`.
Agrega estas dos líneas (ya **no** se agrega
`ask-sdk-dynamodb-persistence-adapter` — no hay persistencia propia del
Lambda, todo vive en el backend real):

```json
"i18next": "^10.5.0",
"i18next-sprintf-postprocessor": "^0.2.2"
```

No hace falta instalar nada para hacer llamadas HTTP: Node.js 18 (el
runtime de la Alexa-Hosted Skill) trae `fetch` global, no se necesita
`axios` ni ninguna librería extra.

**Probar:** guarda y haz `Deploy`. Si el build pasa sin errores, sigue.

---

## 2. `bananagramApi.js` (archivo nuevo) — único punto de contacto con el backend

Todas las llamadas HTTP del Lambda pasan por aquí. Cada función recibe el
`accessToken` del account-linking (checkpoint 5) y lo manda como
`Authorization: Bearer`.

```js
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const BRANDS_SERVICE_URL = process.env.BRANDS_SERVICE_URL || 'http://localhost:3002';
const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:3003';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';

async function callApi(baseUrl, path, token, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bananagram API ${res.status} en ${path}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// GET /campaigns/mine (brands-service) — filtrado server-side por rol/ownership.
// Respuesta esperada: [{ id, name, brandId, brandName, status }, ...]
function getMyCampaigns(token) {
  return callApi(BRANDS_SERVICE_URL, '/campaigns/mine', token);
}

// GET /campaigns/:id/metrics-summary?period= (analytics-service)
// Respuesta esperada: { totalPosts, reach, engagementAvg, followers, topNet }
function getCampaignMetrics(token, campaignId, period) {
  const qs = period ? `?period=${encodeURIComponent(period)}` : '';
  return callApi(ANALYTICS_SERVICE_URL, `/campaigns/${campaignId}/metrics-summary${qs}`, token);
}

// GET /campaigns/:id/top-content?network=&period= (analytics-service)
// Respuesta esperada: { matched, network, date, format, likes, comments, engagementRate, diff }
// `matched: false` significa que el filtro pedido no tuvo resultados y el
// backend cayó de vuelta a toda la campaña (equivalente a TOP_CONTENT_NO_MATCH).
function getCampaignTopContent(token, campaignId, { network, period } = {}) {
  const params = new URLSearchParams();
  if (network) params.set('network', network);
  if (period) params.set('period', period);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return callApi(ANALYTICS_SERVICE_URL, `/campaigns/${campaignId}/top-content${qs}`, token);
}

// GET /campaigns/:id/summary (analytics-service) — compone score (resuelto
// campaña→marca), métricas, top post e ideas guardadas en una sola llamada.
// Respuesta esperada:
// { brandName, reach, engagementAvg, topPost: {network, date, engagementRate},
//   savedIdeasCount, score: { score, consistency, engagement, coverage, frequency, classification } }
function getCampaignSummary(token, campaignId) {
  return callApi(ANALYTICS_SERVICE_URL, `/campaigns/${campaignId}/summary`, token);
}

// POST /campaigns/:id/ideas (content-service, ContentIdea)
// body: { title: string|null, text: string, source: 'sugerida'|'propia' }
function createIdea(token, campaignId, body) {
  return callApi(CONTENT_SERVICE_URL, `/campaigns/${campaignId}/ideas`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// GET /campaigns/:id/ideas (content-service)
// Respuesta esperada: [{ id, title, text, source, createdAt }, ...]
function listIdeas(token, campaignId) {
  return callApi(CONTENT_SERVICE_URL, `/campaigns/${campaignId}/ideas`, token);
}

// DELETE /ideas/:id (content-service)
function deleteIdea(token, ideaId) {
  return callApi(CONTENT_SERVICE_URL, `/ideas/${ideaId}`, token, { method: 'DELETE' });
}

module.exports = {
  getMyCampaigns,
  getCampaignMetrics,
  getCampaignTopContent,
  getCampaignSummary,
  createIdea,
  listIdeas,
  deleteIdea,
};
```

**Probar:** todavía no hay handlers que lo usen — es solo el módulo de
llamadas. Guarda y sigue.

---

## 3. `ideaTemplates.js` (archivo nuevo) — banco de respaldo

`GenerateContentIdeasIntent` llama a Claude primero (checkpoint 11); este
archivo es el respaldo si la llamada falla o `ANTHROPIC_API_KEY` no está
configurada — nunca se llama al backend de Bananagram para esto (ver
`../AlexaSkill-Diseno-Final.md` §7). Bilingüe, igual que en la versión
anterior.

```js
const templates = {
  es: {
    Instagram: [
      'Reel detrás de cámaras del equipo',
      'Carrusel de antes y después con testimonios',
      'Historia con encuesta rápida sobre preferencias de la audiencia',
    ],
    TikTok: [
      'Video de 15 segundos con transición rápida mostrando el producto',
      'Reto o challenge relacionado con la campaña',
      'Duet respondiendo comentarios de la comunidad',
    ],
    Facebook: [
      'Publicación con encuesta para conocer preferencias',
      'Video testimonial de un cliente real',
      'Álbum de fotos del evento o proceso',
    ],
    LinkedIn: [
      'Publicación con datos y estadísticas del sector',
      'Historia de éxito de un cliente corporativo',
      'Detrás de cámaras profesional del equipo',
    ],
    YouTube: [
      'Video corto (Shorts) mostrando un tip rápido relacionado a la campaña',
      'Tutorial paso a paso sobre el producto o servicio',
      'Video más largo con la historia detrás de la campaña',
    ],
    X: [
      'Hilo corto explicando un dato curioso de la campaña',
      'Encuesta rápida de una sola pregunta',
      'Contenido ligero relacionado a una tendencia actual',
    ],
  },
  en: {
    Instagram: [
      'Behind-the-scenes reel of the team',
      'Before-and-after carousel with testimonials',
      'Story with a quick poll about audience preferences',
    ],
    TikTok: [
      '15-second video with a quick transition showing the product',
      'Challenge related to the campaign',
      'Duet responding to community comments',
    ],
    Facebook: [
      'Poll post to learn about audience preferences',
      'Video testimonial from a real customer',
      'Photo album of the event or process',
    ],
    LinkedIn: [
      'Post with industry data and statistics',
      'Success story from a corporate client',
      'Professional behind-the-scenes look at the team',
    ],
    YouTube: [
      'Short video (Shorts) with a quick tip related to the campaign',
      'Step-by-step tutorial about the product or service',
      'Longer video telling the story behind the campaign',
    ],
    X: [
      'Short thread explaining a fun fact about the campaign',
      'Quick one-question poll',
      'Light content tied to a current trend',
    ],
  },
};

function generateFallbackIdeas(locale, network, quantity = 3) {
  const lang = locale && locale.toLowerCase().startsWith('es') ? 'es' : 'en';
  const pool = templates[lang][network] || Object.values(templates[lang]).flat();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, quantity);
}

module.exports = { generateFallbackIdeas };
```

**Probar:** nada todavía. Guarda y sigue.

---

## 4. `languageStrings.js` (archivo nuevo)

Bundles de traducción es/en completos. Ver la tabla completa (con las
claves nuevas/cambiadas marcadas **★**) en `../AlexaSkill-Diseno-Final.md`
§6 — no se repite aquí para no duplicar; copia el archivo tal cual desde
ese documento:

```js
const languageStrings = {
  es: {
    translation: {
      ACCOUNT_LINKING_REQUIRED: "Para usar Asistente Bananagram necesitas vincular tu cuenta. Abre la app de Alexa para hacerlo.",
      LAUNCH_WELCOME: "Bienvenido a Asistente Bananagram. Tienes {{n}} campañas activas: {{lista}}. Di el nombre de la que quieras revisar para comenzar.",
      REPROMPT_LAUNCH: "No escuché tu respuesta. Puedes decir el nombre de alguna campaña, por ejemplo {{camp}}, o pedir 'lista mis campañas' para escucharlas de nuevo.",
      CAMPAIGNS_LIST: "Tienes {{n}} campañas activas: {{lista}}. Di el nombre de la que quieras revisar.",
      REPROMPT_CAMPAIGNS_LIST: "No escuché tu respuesta. Puedes decir el nombre de alguna campaña para comenzar a trabajar con ella.",
      SELECT_CAMPAIGN_NOT_FOUND: "No encontré esa campaña. Di el nombre de alguna campaña activa.",
      SELECT_CAMPAIGN_OK: "Listo. Entrando a {{campaignName}}. Esta campaña tiene {{totalPosts}} publicaciones. El score de {{brandName}}, que cubre esta y otras campañas, es de {{score}} sobre 100.",
      SELECT_CAMPAIGN_SAVED_SUFFIX: " Ya tienes {{n}} ideas guardadas en esta campaña.",
      SELECT_CAMPAIGN_NEXT: " Puedes pedirme las métricas, ver la mejor publicación, generar ideas de contenido, o ver tus ideas guardadas. ¿Qué quieres hacer?",
      REPROMPT_SELECT_CAMPAIGN: "Puedes decir 'métricas', 'mejor publicación', 'genera ideas' o 'mis ideas guardadas'.",
      METRICS_INFO: "{{campaignName}} tiene {{totalPosts}} publicaciones. Alcance acumulado: {{reach}}. Engagement promedio: {{engagement}} por ciento. Seguidores actuales: {{followers}}. La red con mejor rendimiento es {{topNet}}. ¿Quieres que te cuente cuál fue la mejor publicación?",
      REPROMPT_METRICS: "Para ver la mejor publicación di 'mejor publicación'. Para generar ideas di 'genera ideas'.",
      TOP_CONTENT_INFO: "La mejor publicación de {{campaignName}} fue en {{network}} el {{date}}. Formato: {{format}}. Obtuvo {{likes}} likes, {{comments}} comentarios y {{engagementRate}} por ciento de engagement, superando el promedio en {{diff}} por ciento. ¿Quieres que genere ideas basadas en este resultado?",
      TOP_CONTENT_NO_MATCH: "No encontré publicaciones de {{campaignName}} con ese filtro, así que te cuento la mejor de toda la campaña. ",
      REPROMPT_TOP_CONTENT: "Para generar ideas di 'genera ideas'.",
      IDEAS_GENERATED: "Con base en {{campaignName}}, aquí van {{n}} ideas: {{listado}}. Puedes decirme el número que quieras guardar, o di 'guardar mi propia idea' si tienes una diferente.",
      REPROMPT_IDEAS_GENERATED: "Di un número para guardar esa idea, o di 'guardar mi propia idea'.",
      SAVE_IDEA_NO_CANDIDATES: "Primero genera ideas diciendo 'genera ideas'.",
      SAVE_IDEA_INVALID_NUMBER: "No encontré esa idea. Di un número del uno al tres.",
      SAVE_IDEA_TITLE_INVALID: "Ese título es muy corto o ya lo usaste antes. Dime otro título para tu idea.",
      SAVE_IDEA_ELICIT_TITLE: "Guardando '{{ideaText}}'. ¿Con qué título quieres guardarla?",
      SAVE_IDEA_CONFIRM: "¿Confirmas guardar la idea '{{ideaText}}' con el título {{ideaTitle}} en {{campaignName}}?",
      SAVE_IDEA_CANCELLED: "De acuerdo, no la guardé. ¿Quieres intentar con otro número o título?",
      SAVE_IDEA_OK: "Listo. Guardé '{{ideaText}}' con el título {{ideaTitle}} en {{campaignName}}. Ya tienes {{total}} ideas guardadas en esta campaña. ¿Quieres guardar otra o generar más ideas?",
      REPROMPT_SAVE_IDEA_OK: "Para generar más ideas di 'genera ideas'. Para ver tus ideas guardadas di 'mis ideas'.",
      CUSTOM_IDEA_ELICIT: "Claro, dime la idea.",
      CUSTOM_IDEA_OK: "Perfecto. Guardé tu idea en {{campaignName}}: '{{ideaText}}'. Ya tienes {{total}} ideas guardadas en esta campaña. ¿Quieres seguir generando ideas o ver tus ideas guardadas?",
      REPROMPT_CUSTOM_IDEA_OK: "Para generar ideas di 'genera ideas'. Para ver tus ideas guardadas di 'mis ideas'.",
      SAVED_IDEAS_LIST: "Tienes {{n}} ideas guardadas en {{campaignName}}: {{lista}}. ¿Quieres generar más ideas o cambiar de campaña?",
      SAVED_IDEAS_EMPTY: "Aún no tienes ideas guardadas en {{campaignName}}. Di 'genera ideas' para empezar.",
      REPROMPT_SAVED_IDEAS: "Para generar ideas di 'genera ideas'.",
      DELETE_IDEA_EMPTY: "Aún no tienes ideas guardadas en {{campaignName}} para borrar.",
      DELETE_IDEA_ELICIT_TITLE: "Dime el título de la idea que quieres borrar de {{campaignName}}.",
      DELETE_IDEA_NOT_FOUND_RETRY: "No encontré una idea con ese título en {{campaignName}}. Vuelve a decir 'borra la idea' seguido del título exacto.",
      DELETE_IDEA_LIST_FALLBACK: "Sigo sin encontrarla. Tus ideas guardadas en {{campaignName}} son: {{lista}}. Vuelve a decir 'borra la idea' seguido del título exacto.",
      DELETE_IDEA_CONFIRM: "¿Confirmas que quieres borrar la idea '{{ideaTitle}}' de {{campaignName}}?",
      DELETE_IDEA_CANCELLED: "De acuerdo, no borré nada. Si quieres intentar con otro título, di 'borra la idea' seguido del título.",
      DELETE_IDEA_OK: "Listo, borré la idea '{{ideaTitle}}' de {{campaignName}}. Te quedan {{total}} ideas guardadas.",
      REPROMPT_DELETE_IDEA: "Di 'borra la idea' seguido del título exacto, o di 'mis ideas guardadas' para escuchar la lista.",
      RECOMMENDATIONS_INFO: "Con base en el score de {{brandName}} ({{score}} sobre 100, clasificación {{classification}}), tu punto más débil es {{weakLabel}} con {{weakValue}}. Te recomiendo enfocarte en {{topNet}}, tu red con mejor rendimiento en esta campaña. Aquí van 2 ideas: {{listado}}. ¿Quieres generar más ideas o guardar alguna?",
      REPROMPT_RECOMMENDATIONS: "Para generar más ideas di 'genera ideas'. Para guardar una di 'guarda la idea' seguido del número.",
      SUMMARY_INFO: "Resumen de {{campaignName}}: alcance de {{reach}}, engagement promedio de {{engagement}} por ciento. Tu mejor publicación fue en {{network}} el {{date}} con {{engagementRate}} por ciento de engagement. Tienes {{savedCount}} ideas guardadas en esta campaña. ¿Quieres ver más detalles o generar ideas?",
      REPROMPT_SUMMARY: "Puedes decir 'métricas', 'mejor publicación' o 'genera ideas'.",
      ERROR_NO_CAMPAIGN: "Primero elige una campaña. Puedes decir 'qué campañas tengo' para ver las disponibles.",
      ERROR_API: "Tuve un problema consultando tus datos de Bananagram. Intenta de nuevo en un momento.",
      HELP_WITH_CAMPAIGN: "Estás trabajando con {{campaignName}}. Puedes decir: 'métricas', 'mejor publicación', 'genera ideas', 'guardar mi propia idea', 'mis ideas guardadas', 'borrar idea', 'recomendaciones', 'resumen de campaña', o 'cambiar de campaña'. ¿Qué deseas hacer?",
      HELP_WITHOUT_CAMPAIGN: "Puedes decir 'qué campañas tengo' para ver las disponibles, o el nombre de una campaña para comenzar.",
      GOODBYE: "Hasta luego.",
      FALLBACK: "No entendí eso. Di 'ayuda' para escuchar las opciones disponibles.",
      ERROR_GENERIC: "Hubo un problema. Intenta de nuevo."
    }
  },
  en: {
    translation: {
      ACCOUNT_LINKING_REQUIRED: "To use Bananagram Assistant you need to link your account. Open the Alexa app to do that.",
      LAUNCH_WELCOME: "Welcome to Bananagram Assistant. You have {{n}} active campaigns: {{lista}}. Say the name of the one you want to review to get started.",
      REPROMPT_LAUNCH: "I didn't catch that. You can say a campaign name, for example {{camp}}, or ask to 'list my campaigns' to hear them again.",
      CAMPAIGNS_LIST: "You have {{n}} active campaigns: {{lista}}. Say the name of the one you want to review.",
      REPROMPT_CAMPAIGNS_LIST: "I didn't catch that. You can say a campaign name to start working with it.",
      SELECT_CAMPAIGN_NOT_FOUND: "I couldn't find that campaign. Say the name of an active campaign.",
      SELECT_CAMPAIGN_OK: "Done. Entering {{campaignName}}. This campaign has {{totalPosts}} posts. {{brandName}}'s score, which covers this and other campaigns, is {{score}} out of 100.",
      SELECT_CAMPAIGN_SAVED_SUFFIX: " You already have {{n}} ideas saved in this campaign.",
      SELECT_CAMPAIGN_NEXT: " You can ask for the metrics, see the top post, generate content ideas, or check your saved ideas. What would you like to do?",
      REPROMPT_SELECT_CAMPAIGN: "You can say 'metrics', 'top post', 'generate ideas' or 'my saved ideas'.",
      METRICS_INFO: "{{campaignName}} has {{totalPosts}} posts. Total reach: {{reach}}. Average engagement: {{engagement}} percent. Current followers: {{followers}}. The best performing network is {{topNet}}. Want me to tell you about the top post?",
      REPROMPT_METRICS: "To see the top post say 'top post'. To generate ideas say 'generate ideas'.",
      TOP_CONTENT_INFO: "The top post from {{campaignName}} was on {{network}} on {{date}}. Format: {{format}}. It got {{likes}} likes, {{comments}} comments and {{engagementRate}} percent engagement, beating the campaign average by {{diff}} percent. Want me to generate ideas based on this result?",
      TOP_CONTENT_NO_MATCH: "I couldn't find posts from {{campaignName}} matching that filter, so here's the best one from the whole campaign. ",
      REPROMPT_TOP_CONTENT: "To generate ideas say 'generate ideas'.",
      IDEAS_GENERATED: "Based on {{campaignName}}, here are {{n}} ideas: {{listado}}. You can tell me the number you want to save, or say 'save my own idea' if you have a different one.",
      REPROMPT_IDEAS_GENERATED: "Say a number to save that idea, or say 'save my own idea'.",
      SAVE_IDEA_NO_CANDIDATES: "First generate ideas by saying 'generate ideas'.",
      SAVE_IDEA_INVALID_NUMBER: "I couldn't find that idea. Say a number from one to three.",
      SAVE_IDEA_TITLE_INVALID: "That title is too short or already used. Tell me a different title for your idea.",
      SAVE_IDEA_ELICIT_TITLE: "Saving '{{ideaText}}'. What title do you want to save it under?",
      SAVE_IDEA_CONFIRM: "Do you confirm saving the idea '{{ideaText}}' titled {{ideaTitle}} in {{campaignName}}?",
      SAVE_IDEA_CANCELLED: "Okay, I didn't save it. Want to try another number or title?",
      SAVE_IDEA_OK: "Done. I saved '{{ideaText}}' titled {{ideaTitle}} in {{campaignName}}. You now have {{total}} ideas saved in this campaign. Want to save another or generate more ideas?",
      REPROMPT_SAVE_IDEA_OK: "To generate more ideas say 'generate ideas'. To check your saved ideas say 'my ideas'.",
      CUSTOM_IDEA_ELICIT: "Sure, tell me the idea.",
      CUSTOM_IDEA_OK: "Great. I saved your idea in {{campaignName}}: '{{ideaText}}'. You now have {{total}} ideas saved in this campaign. Want to keep generating ideas or check your saved ideas?",
      REPROMPT_CUSTOM_IDEA_OK: "To generate ideas say 'generate ideas'. To check your saved ideas say 'my ideas'.",
      SAVED_IDEAS_LIST: "You have {{n}} ideas saved in {{campaignName}}: {{lista}}. Want to generate more ideas or switch campaigns?",
      SAVED_IDEAS_EMPTY: "You don't have any saved ideas in {{campaignName}} yet. Say 'generate ideas' to get started.",
      REPROMPT_SAVED_IDEAS: "To generate ideas say 'generate ideas'.",
      DELETE_IDEA_EMPTY: "You don't have any saved ideas in {{campaignName}} to delete yet.",
      DELETE_IDEA_ELICIT_TITLE: "Tell me the title of the idea you want to delete from {{campaignName}}.",
      DELETE_IDEA_NOT_FOUND_RETRY: "I couldn't find an idea with that title in {{campaignName}}. Say 'delete the idea' followed by the exact title again.",
      DELETE_IDEA_LIST_FALLBACK: "I still couldn't find it. Your saved ideas in {{campaignName}} are: {{lista}}. Say 'delete the idea' followed by the exact title again.",
      DELETE_IDEA_CONFIRM: "Do you confirm you want to delete the idea '{{ideaTitle}}' from {{campaignName}}?",
      DELETE_IDEA_CANCELLED: "Okay, I didn't delete anything. To try another title, say 'delete the idea' followed by the title.",
      DELETE_IDEA_OK: "Done, I deleted the idea '{{ideaTitle}}' from {{campaignName}}. You have {{total}} saved ideas left.",
      REPROMPT_DELETE_IDEA: "Say 'delete the idea' followed by the exact title, or say 'my saved ideas' to hear the list.",
      RECOMMENDATIONS_INFO: "Based on {{brandName}}'s score ({{score}} out of 100, classification {{classification}}), your weakest point is {{weakLabel}} at {{weakValue}}. I recommend focusing on {{topNet}}, your best performing network in this campaign. Here are 2 ideas: {{listado}}. Want to generate more ideas or save one?",
      REPROMPT_RECOMMENDATIONS: "To generate more ideas say 'generate ideas'. To save one say 'save idea' followed by the number.",
      SUMMARY_INFO: "Summary of {{campaignName}}: reach of {{reach}}, average engagement of {{engagement}} percent. Your top post was on {{network}} on {{date}} with {{engagementRate}} percent engagement. You have {{savedCount}} ideas saved in this campaign. Want to see more details or generate ideas?",
      REPROMPT_SUMMARY: "You can say 'metrics', 'top post' or 'generate ideas'.",
      ERROR_NO_CAMPAIGN: "First pick a campaign. You can say 'what campaigns do I have' to see what's available.",
      ERROR_API: "I had trouble reaching your Bananagram data. Please try again in a moment.",
      HELP_WITH_CAMPAIGN: "You're working with {{campaignName}}. You can say: 'metrics', 'top post', 'generate ideas', 'save my own idea', 'my saved ideas', 'delete idea', 'recommendations', 'campaign summary', or 'change campaign'. What would you like to do?",
      HELP_WITHOUT_CAMPAIGN: "You can say 'what campaigns do I have' to see what's available, or the name of a campaign to get started.",
      GOODBYE: "Goodbye.",
      FALLBACK: "I didn't understand that. Say 'help' to hear the available options.",
      ERROR_GENERIC: "Something went wrong. Please try again."
    }
  }
};

module.exports = { languageStrings };
```

**Probar:** nada todavía. Guarda y sigue.

---

## 5. `index.js` — bloque inicial (reemplaza todo lo de arriba de `LaunchRequestHandler`)

Requires, auxiliares, el interceptor de idioma, y el helper de
account-linking. Ya **no** hay adaptador de DynamoDB.

```js
const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const bananagramApi = require('./bananagramApi');
const { generateFallbackIdeas } = require('./ideaTemplates');
const { languageStrings } = require('./languageStrings');

// ── Auxiliares ──────────────────────────────────────────────────────────────

// Tras el account-linking, Alexa entrega el access token de Bananagram en
// cada request. Si falta, la cuenta no está vinculada — ningún handler que
// necesite datos reales debe proceder sin esto.
function getAccessToken(handlerInput) {
  return (
    (handlerInput.requestEnvelope.context.System.user
      && handlerInput.requestEnvelope.context.System.user.accessToken)
    || null
  );
}

function accountLinkingRequired(handlerInput, t) {
  return handlerInput.responseBuilder
    .speak(t('ACCOUNT_LINKING_REQUIRED'))
    .withLinkAccountCard()
    .getResponse();
}

function apiError(handlerInput, t, error) {
  console.log(`Error de API: ${error.message}`);
  return handlerInput.responseBuilder
    .speak(t('ERROR_API'))
    .reprompt(t('ERROR_API'))
    .getResponse();
}

// Los slots de tipo custom (campaignName, networkName, dateRange) llegan
// resueltos por Dynamic Entities o por el catálogo estático de respaldo —
// en ambos casos con { id, name } dentro de resolutions. Esta función
// devuelve ambos: `id` es lo que se manda al backend, `name` es lo que se
// usa para hablarle al usuario. OJO: el campo real del JSON de Alexa es
// "values" (plural) — con "value" a secas revienta con TypeError apenas un
// slot resuelva por sinónimo (ER_SUCCESS_MATCH).
function getResolvedSlot(slot) {
  if (!slot) return { id: null, name: null };

  const authority = slot.resolutions
    && slot.resolutions.resolutionsPerAuthority
    && slot.resolutions.resolutionsPerAuthority[0];

  const hasMatch = authority && authority.status && authority.status.code === 'ER_SUCCESS_MATCH';

  if (hasMatch && authority.values && authority.values[0] && authority.values[0].value) {
    const v = authority.values[0].value;
    return { id: v.id || null, name: v.name || null };
  }

  return { id: null, name: slot.value || null };
}

// El nombre del slot type de campañas cambia por locale (LISTA_CAMPANAS en
// es-MX, LIST_CAMPAIGNS en en-US) — ver interaction-model-*.json.
function campaignSlotTypeName(locale) {
  return locale && locale.toLowerCase().startsWith('es') ? 'LISTA_CAMPANAS' : 'LIST_CAMPAIGNS';
}

function noCampaignSelected(handlerInput, t) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  const first = (sessionAttributes.availableCampaigns && sessionAttributes.availableCampaigns[0]) || {};
  return handlerInput.responseBuilder
    .speak(t('ERROR_NO_CAMPAIGN'))
    .reprompt(t('REPROMPT_LAUNCH', { camp: first.name || '' }))
    .getResponse();
}

// Trae las campañas reales del usuario (GET /campaigns/mine), las cachea en
// sesión (para resolver el slot sin volver a llamar al backend en cada
// turno) y arma la directiva de Dynamic Entities para sincronizar el slot
// de campañas con el catálogo real. La usan LaunchRequestHandler
// (checkpoint 6) y GetActiveCampaignsIntentHandler (checkpoint 7).
async function refreshCampaigns(handlerInput, token) {
  const campaigns = await bananagramApi.getMyCampaigns(token);

  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.availableCampaigns = campaigns;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  const locale = handlerInput.requestEnvelope.request.locale;
  const dynamicEntitiesDirective = {
    type: 'Dialog.UpdateDynamicEntities',
    updateBehavior: 'REPLACE',
    types: [
      {
        name: campaignSlotTypeName(locale),
        values: campaigns.map((c) => ({
          id: c.id,
          name: { value: c.name, synonyms: [] },
        })),
      },
    ],
  };

  return { campaigns, dynamicEntitiesDirective };
}

// Resuelve el slot de campaña (id o nombre) contra la lista real cacheada
// en sesión por refreshCampaigns — ya no contra un objeto mockData fijo.
function findCampaign(handlerInput, resolvedSlot) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  const list = sessionAttributes.availableCampaigns || [];
  if (resolvedSlot.id) {
    const byId = list.find((c) => c.id === resolvedSlot.id);
    if (byId) return byId;
  }
  if (resolvedSlot.name) {
    return list.find((c) => c.name.toLowerCase() === resolvedSlot.name.toLowerCase()) || null;
  }
  return null;
}

// Lógica compartida de "entrar a una campaña": guarda la selección en
// sesión, cuenta cuántas ideas ya tiene guardadas (GET real, ya no
// DynamoDB) y arma el speech de confirmación con el score de la marca
// (nunca un score de campaña — no existe). La usan SelectCampaignIntent
// (checkpoint 8) y ChangeCampaignIntent (checkpoint 18).
async function enterCampaign(handlerInput, campaign, t) {
  const token = getAccessToken(handlerInput);

  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.selectedCampaign = campaign;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  const [metrics, savedIdeas] = await Promise.all([
    bananagramApi.getCampaignMetrics(token, campaign.id),
    bananagramApi.listIdeas(token, campaign.id),
  ]);

  let speech = t('SELECT_CAMPAIGN_OK', {
    campaignName: campaign.name,
    totalPosts: metrics.totalPosts,
    brandName: campaign.brandName,
    score: metrics.score ? metrics.score.score : metrics.score,
  });
  if (savedIdeas.length > 0) {
    speech += t('SELECT_CAMPAIGN_SAVED_SUFFIX', { n: savedIdeas.length });
  }
  speech += t('SELECT_CAMPAIGN_NEXT');

  return handlerInput.responseBuilder
    .speak(speech)
    .reprompt(t('REPROMPT_SELECT_CAMPAIGN'))
    .getResponse();
}

// ── Idioma (es/en) ───────────────────────────────────────────────────────────

const LocalizationInterceptor = {
  process(handlerInput) {
    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      fallbackLng: 'en',
      overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
      resources: languageStrings,
      returnObjects: true,
    });
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function (...args) {
      return localizationClient.t(...args);
    };
  },
};
```

> **Nota sobre `enterCampaign`**: pide `getCampaignMetrics` (no
> `getCampaignSummary`) porque solo necesita `totalPosts` y `score` para el
> saludo de bienvenida a la campaña — `getCampaignSummary` (más pesado,
> compone varias cosas) se reserva para `GetCampaignSummaryIntent`
> (checkpoint 16), evitando pedir de más en cada `SelectCampaignIntent`.

**Probar:** todavía no hay handlers propios — deja por ahora
`HelloWorldIntentHandler`, `HelpIntentHandler`, etc. de la plantilla tal
como están más abajo (los vamos a ir reemplazando uno por uno). Guarda y
haz `Deploy`; si el build pasa, sigue.

---

## 6. `LaunchRequestHandler`

Primero verifica cuenta vinculada. Si la hay, trae las campañas reales,
sincroniza Dynamic Entities, y saluda.

```js
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    try {
      const { campaigns, dynamicEntitiesDirective } = await refreshCampaigns(handlerInput, token);
      const names = campaigns.map((c) => c.name);

      const speech = t('LAUNCH_WELCOME', { n: names.length, lista: names.join(', ') });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_LAUNCH', { camp: names[0] }))
        .addDirective(dynamicEntitiesDirective)
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega el interceptor al final del archivo, en el `exports.handler`. Por
ahora déjalo así (todavía con los handlers de la plantilla que no hemos
tocado, más `IntentReflectorHandler` como red de seguridad):

```js
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler)
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(LocalizationInterceptor)
  .lambda();
```

> Puedes borrar `HelloWorldIntentHandler` — era del scaffold de ejemplo, no
> forma parte de la skill. Nota que **ya no hay** `.withPersistenceAdapter(...)`
> — no hay persistencia propia del Lambda.

**Probar:** en el simulador, con una cuenta de prueba vinculada, di "abre
asistente bananagram". Debe saludarte con tus campañas reales. Sin cuenta
vinculada, debe pedirte vincularla (tarjeta de account-linking en el panel
del simulador) en vez de listar nada.

---

## 7. `GetActiveCampaignsIntentHandler`

```js
const GetActiveCampaignsIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetActiveCampaignsIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    try {
      const { campaigns, dynamicEntitiesDirective } = await refreshCampaigns(handlerInput, token);
      const names = campaigns.map((c) => c.name);
      const speech = t('CAMPAIGNS_LIST', { n: names.length, lista: names.join(', ') });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_CAMPAIGNS_LIST'))
        .addDirective(dynamicEntitiesDirective)
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega `GetActiveCampaignsIntentHandler,` a la lista, después de
`LaunchRequestHandler,`.

**Probar:** di "qué campañas tengo". Debe repetir la lista real (vuelve a
llamar `GET /campaigns/mine` — si una campaña se creó después del
`LaunchRequest`, ya aparece aquí).

---

## 8. `SelectCampaignIntentHandler`

Ya no busca en `mockData` — resuelve contra `sessionAttributes.availableCampaigns`
(poblada por `refreshCampaigns`, checkpoint 5) usando el `id` que trae el
slot resuelto por Dynamic Entities.

```js
const SelectCampaignIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SelectCampaignIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const intentActual = handlerInput.requestEnvelope.request.intent;

    if (handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED') {
      return handlerInput.responseBuilder
        .addDelegateDirective(intentActual)
        .getResponse();
    }

    const resolved = getResolvedSlot(intentActual.slots.campaignName);
    const campaign = findCampaign(handlerInput, resolved);
    if (!campaign) {
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      const first = (sessionAttributes.availableCampaigns || [])[0] || {};
      return handlerInput.responseBuilder
        .speak(t('SELECT_CAMPAIGN_NOT_FOUND'))
        .reprompt(t('REPROMPT_LAUNCH', { camp: first.name || '' }))
        .getResponse();
    }

    try {
      return await enterCampaign(handlerInput, campaign, t);
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega `SelectCampaignIntentHandler,` a la lista, después de
`GetActiveCampaignsIntentHandler,`.

**Probar:** con `LaunchRequest` o `GetActiveCampaignsIntent` ya corrido en
esta sesión (para que `availableCampaigns` esté poblado), di el nombre de
una campaña real tuya. Debe confirmar con datos reales (`totalPosts`, score
de la marca). Prueba también un nombre inventado — debe responder
`SELECT_CAMPAIGN_NOT_FOUND`.

---

## 9. `GetCampaignMetricsIntentHandler`

```js
const GetCampaignMetricsIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetCampaignMetricsIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    if (!campaign) return noCampaignSelected(handlerInput, t);

    try {
      const metrics = await bananagramApi.getCampaignMetrics(token, campaign.id);

      const speech = t('METRICS_INFO', {
        campaignName: campaign.name,
        totalPosts: metrics.totalPosts,
        reach: metrics.reach,
        engagement: metrics.engagementAvg,
        followers: metrics.followers,
        topNet: metrics.topNet,
      });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_METRICS'))
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega `GetCampaignMetricsIntentHandler,` a la lista, después de
`SelectCampaignIntentHandler,`.

**Probar:** con una campaña seleccionada, di "dame las métricas" — datos
reales de `GET /campaigns/:id/metrics-summary`. En una sesión nueva, sin
seleccionar campaña antes, debe responder `ERROR_NO_CAMPAIGN`.

---

## 10. `GetTopContentIntentHandler`

El filtrado por red/fecha ahora lo hace analytics-service (query params
`network`/`period`), no el Lambda. `network` se manda con el `id`
normalizado del slot (`instagram`, `tiktok`, …), no con el nombre de
display — es responsabilidad del backend traducirlo a lo que su propio
catálogo de `SocialNetwork` use internamente (ver
`../AlexaSkill-Diseno-Final.md` §3, nota de vocabulario).

```js
const GetTopContentIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetTopContentIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    if (!campaign) return noCampaignSelected(handlerInput, t);

    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const network = getResolvedSlot(slots.networkName).id;
    const period = getResolvedSlot(slots.dateRange).name; // semana/mes/campaña — sin id, es solo filtro de UI

    try {
      const top = await bananagramApi.getCampaignTopContent(token, campaign.id, { network, period });

      let speech = '';
      if (top.matched === false) {
        speech += t('TOP_CONTENT_NO_MATCH', { campaignName: campaign.name });
      }
      speech += t('TOP_CONTENT_INFO', {
        campaignName: campaign.name,
        network: top.network,
        date: top.date,
        format: top.format,
        likes: top.likes,
        comments: top.comments,
        engagementRate: top.engagementRate,
        diff: top.diff,
      });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_TOP_CONTENT'))
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega `GetTopContentIntentHandler,` a la lista, después de
`GetCampaignMetricsIntentHandler,`.

**Probar:** "cuál fue la mejor publicación", "cuál fue el mejor post en
Instagram", "que publicó mejor esta semana" — todo contra datos reales.
Pide una red que la campaña no tenga — el backend debe responder
`matched: false` y el Lambda debe anteponer `TOP_CONTENT_NO_MATCH` sin
tronar.

---

## 11. `GenerateContentIdeasIntentHandler` — Claude directo, sin backend de Bananagram

Único handler que **no** llama a `bananagramApi` para generar el
contenido en sí (sí puede usar `campaign`/`sessionAttributes` como
contexto). Llama a la API de Claude; si falla o no hay
`ANTHROPIC_API_KEY`, cae a `ideaTemplates.js`.

```js
const GenerateContentIdeasIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GenerateContentIdeasIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    if (!campaign) return noCampaignSelected(handlerInput, t);

    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const network = getResolvedSlot(slots.networkName).name || 'Instagram';
    const quantitySlot = getResolvedSlot(slots.quantity).name;
    const quantity = quantitySlot ? parseInt(quantitySlot, 10) : 3;
    const locale = handlerInput.requestEnvelope.request.locale;

    const ideas = await generateIdeasWithClaudeOrFallback(locale, network, quantity, campaign);
    sessionAttributes.lastGeneratedIdeas = ideas;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    const numeralesPorIdioma = {
      es: ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco'],
      en: ['One', 'Two', 'Three', 'Four', 'Five'],
    };
    const lang = locale && locale.toLowerCase().startsWith('es') ? 'es' : 'en';
    const numerales = numeralesPorIdioma[lang];
    const listado = ideas.map((idea, i) => `${numerales[i] || i + 1}, ${idea}.`).join(' ');
    const speech = t('IDEAS_GENERATED', { campaignName: campaign.name, n: ideas.length, listado });

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt(t('REPROMPT_IDEAS_GENERATED'))
      .getResponse();
  },
};

// Llama a Claude directo desde el Lambda (ANTHROPIC_API_KEY como variable
// de entorno, nunca expuesta a ningún frontend — ver
// ../AlexaSkill-Diseno-Final.md §7). Si falla o no hay key configurada,
// cae a las plantillas fijas de ideaTemplates.js — nunca deja al usuario
// sin respuesta.
async function generateIdeasWithClaudeOrFallback(locale, network, quantity, campaign) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return generateFallbackIdeas(locale, network, quantity);

  try {
    const lang = locale && locale.toLowerCase().startsWith('es') ? 'español' : 'English';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Genera ${quantity} ideas breves de contenido para ${network}, para la campaña "${campaign.name}" de la marca "${campaign.brandName}", en ${lang}. Responde solo con las ideas, una por línea, sin numerar.`,
        }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const data = await res.json();
    const text = data.content && data.content[0] && data.content[0].text;
    const ideas = (text || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, quantity);
    return ideas.length > 0 ? ideas : generateFallbackIdeas(locale, network, quantity);
  } catch (error) {
    console.log(`Claude falló, usando plantillas de respaldo: ${error.message}`);
    return generateFallbackIdeas(locale, network, quantity);
  }
}
```

Agrega `GenerateContentIdeasIntentHandler,` a la lista, después de
`GetTopContentIntentHandler,`.

**Probar:** di "dame ideas de contenido" — con `ANTHROPIC_API_KEY`
configurada, las ideas deben sonar generadas (no idénticas a las de
`ideaTemplates.js`). Sin la key configurada, debe seguir funcionando con
las plantillas de respaldo, sin errores.

---

## 12. `SaveIdeaIntent` — directivas manuales, ahora contra el backend real

Mismo patrón `EnProgreso`/`Completado` por `dialogState` que la versión
anterior. La validación de "título duplicado" ahora consulta
`GET /campaigns/:id/ideas` en vez de un array de DynamoDB; el guardado
final es `POST /campaigns/:id/ideas`.

```js
const EnProgresoSaveIdeaIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SaveIdeaIntent'
      && request.dialogState !== 'COMPLETED';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const intentActual = handlerInput.requestEnvelope.request.intent;
    const slots = intentActual.slots;

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    if (!campaign) return noCampaignSelected(handlerInput, t);
    if (!sessionAttributes.lastGeneratedIdeas) {
      return handlerInput.responseBuilder
        .speak(t('SAVE_IDEA_NO_CANDIDATES'))
        .reprompt(t('REPROMPT_IDEAS_GENERATED'))
        .getResponse();
    }

    const ideaNumber = getResolvedSlot(slots.ideaNumber).name;
    const ideaTitle = getResolvedSlot(slots.ideaTitle).name;

    if (!ideaNumber) {
      return handlerInput.responseBuilder
        .addDelegateDirective(intentActual)
        .getResponse();
    }

    const ideaText = sessionAttributes.lastGeneratedIdeas[parseInt(ideaNumber, 10) - 1];
    if (!ideaText) {
      return handlerInput.responseBuilder
        .speak(t('SAVE_IDEA_INVALID_NUMBER'))
        .reprompt(t('REPROMPT_IDEAS_GENERATED'))
        .getResponse();
    }

    if (!ideaTitle) {
      return handlerInput.responseBuilder
        .speak(t('SAVE_IDEA_ELICIT_TITLE', { ideaText }))
        .reprompt(t('SAVE_IDEA_ELICIT_TITLE', { ideaText }))
        .addElicitSlotDirective('ideaTitle', intentActual)
        .getResponse();
    }

    try {
      // Paso 3: validación puntual — título vacío/corto o duplicado en esta
      // campaña, consultando el backend real en vez de un array local.
      const yaGuardadas = await bananagramApi.listIdeas(token, campaign.id);
      const tituloInvalido = ideaTitle.trim().length < 3
        || yaGuardadas.some((idea) => idea.title && idea.title.toLowerCase() === ideaTitle.toLowerCase());

      if (tituloInvalido) {
        const intentLimpio = JSON.parse(JSON.stringify(intentActual));
        intentLimpio.slots.ideaTitle.value = undefined;
        intentLimpio.slots.ideaTitle.confirmationStatus = 'NONE';
        delete intentLimpio.slots.ideaTitle.resolutions;

        return handlerInput.responseBuilder
          .speak(t('SAVE_IDEA_TITLE_INVALID'))
          .reprompt(t('SAVE_IDEA_TITLE_INVALID'))
          .addElicitSlotDirective('ideaTitle', intentLimpio)
          .getResponse();
      }
    } catch (error) {
      return apiError(handlerInput, t, error);
    }

    if (intentActual.confirmationStatus === 'NONE') {
      const confirmMsg = t('SAVE_IDEA_CONFIRM', {
        ideaText,
        ideaTitle,
        campaignName: campaign.name,
      });
      return handlerInput.responseBuilder
        .speak(confirmMsg)
        .reprompt(confirmMsg)
        .addConfirmIntentDirective(intentActual)
        .getResponse();
    }

    if (intentActual.confirmationStatus === 'DENIED') {
      return handlerInput.responseBuilder
        .speak(t('SAVE_IDEA_CANCELLED'))
        .reprompt(t('REPROMPT_IDEAS_GENERATED'))
        .getResponse();
    }

    return handlerInput.responseBuilder
      .addDelegateDirective(intentActual)
      .getResponse();
  },
};

const CompletadoSaveIdeaIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SaveIdeaIntent'
      && request.dialogState === 'COMPLETED';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;

    const ideaNumber = getResolvedSlot(slots.ideaNumber).name;
    const ideaTitle = getResolvedSlot(slots.ideaTitle).name;
    const ideaText = sessionAttributes.lastGeneratedIdeas[parseInt(ideaNumber, 10) - 1];

    try {
      await bananagramApi.createIdea(token, campaign.id, {
        title: ideaTitle,
        text: ideaText,
        source: 'sugerida',
      });
      const total = (await bananagramApi.listIdeas(token, campaign.id)).length;

      const speech = t('SAVE_IDEA_OK', {
        ideaText,
        ideaTitle,
        campaignName: campaign.name,
        total,
      });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_SAVE_IDEA_OK'))
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega **ambos**, `EnProgresoSaveIdeaIntentHandler,` y
`CompletadoSaveIdeaIntentHandler,`, a la lista, después de
`GenerateContentIdeasIntentHandler,`.

**Probar:** igual que la versión anterior (número → título corto rechazado
→ título válido → confirmar → guardar; repetir con el mismo título →
rechazado por duplicado) — ahora contra `POST`/`GET /campaigns/:id/ideas`
reales.

---

## 13. `SaveCustomIdeaIntentHandler`

```js
const SaveCustomIdeaIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SaveCustomIdeaIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    if (!campaign) return noCampaignSelected(handlerInput, t);

    const intentActual = handlerInput.requestEnvelope.request.intent;
    if (handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED') {
      return handlerInput.responseBuilder
        .addDelegateDirective(intentActual)
        .getResponse();
    }

    const ideaText = getResolvedSlot(intentActual.slots.ideaText).name;

    try {
      await bananagramApi.createIdea(token, campaign.id, {
        title: null,
        text: ideaText,
        source: 'propia',
      });
      const total = (await bananagramApi.listIdeas(token, campaign.id)).length;

      const speech = t('CUSTOM_IDEA_OK', {
        campaignName: campaign.name,
        ideaText,
        total,
      });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_CUSTOM_IDEA_OK'))
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega `SaveCustomIdeaIntentHandler,` a la lista, después de
`CompletadoSaveIdeaIntentHandler,`.

**Probar:** di "tengo una idea" → dicta una → debe guardarse vía `POST`
real y confirmar con el conteo actualizado.

---

## 14. `GetSavedIdeasIntentHandler`

```js
const GetSavedIdeasIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetSavedIdeasIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    if (!campaign) return noCampaignSelected(handlerInput, t);

    try {
      const ideas = await bananagramApi.listIdeas(token, campaign.id);

      if (ideas.length === 0) {
        return handlerInput.responseBuilder
          .speak(t('SAVED_IDEAS_EMPTY', { campaignName: campaign.name }))
          .reprompt(t('REPROMPT_IDEAS_GENERATED'))
          .getResponse();
      }

      const lista = ideas.map((idea) => idea.title || idea.text).join(', ');
      const speech = t('SAVED_IDEAS_LIST', { n: ideas.length, campaignName: campaign.name, lista });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_SAVED_IDEAS'))
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega `GetSavedIdeasIntentHandler,` a la lista, después de
`SaveCustomIdeaIntentHandler,`.

**Probar:** con ideas guardadas de los checkpoints 12/13, di "que ideas
tengo guardadas" — debe leerlas desde `GET /campaigns/:id/ideas` real. Cierra
sesión y vuelve a abrir la skill, selecciona la misma campaña y repite —
deben seguir ahí (persistencia real en `ContentIdea`, no en sesión ni en
DynamoDB).

---

## 15. `GetIdeaRecommendationsIntentHandler`

Ya no lee `campaign.score` de un mock — pide el resumen a
analytics-service, que ya resuelve campaña→marca (§5 del diseño final).

```js
const GetIdeaRecommendationsIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetIdeaRecommendationsIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    if (!campaign) return noCampaignSelected(handlerInput, t);

    const locale = handlerInput.requestEnvelope.request.locale;
    const lang = locale && locale.toLowerCase().startsWith('es') ? 'es' : 'en';

    try {
      const summary = await bananagramApi.getCampaignSummary(token, campaign.id);
      const score = summary.score;

      const weakMetrics = ['consistency', 'engagement', 'coverage', 'frequency'];
      const weakestKey = weakMetrics.reduce((worst, key) => (
        score[key] < score[worst] ? key : worst
      ), weakMetrics[0]);

      const etiquetasPorIdioma = {
        es: { consistency: 'consistencia', engagement: 'engagement', coverage: 'cobertura', frequency: 'frecuencia' },
        en: { consistency: 'consistency', engagement: 'engagement', coverage: 'coverage', frequency: 'frequency' },
      };
      const weakLabel = etiquetasPorIdioma[lang][weakestKey];
      const weakValue = score[weakestKey];

      const ideas = await generateIdeasWithClaudeOrFallback(locale, summary.topPost.network, 2, campaign);
      const numeralesPorIdioma = { es: ['Uno', 'Dos'], en: ['One', 'Two'] };
      const numerales = numeralesPorIdioma[lang];
      const listado = ideas.map((idea, i) => `${numerales[i] || i + 1}, ${idea}.`).join(' ');

      const speech = t('RECOMMENDATIONS_INFO', {
        brandName: summary.brandName,
        score: score.score,
        classification: score.classification,
        weakLabel,
        weakValue,
        topNet: summary.topPost.network,
        listado,
      });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_RECOMMENDATIONS'))
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega `GetIdeaRecommendationsIntentHandler,` a la lista, después de
`GenerateContentIdeasIntentHandler,`.

**Probar:** di "dame recomendaciones" con distintas campañas seleccionadas
— la métrica más débil señalada debe cambiar según los datos reales de
cada marca.

---

## 16. `GetCampaignSummaryIntentHandler`

Una sola llamada a `GET /campaigns/:id/summary`, que ya trae todo compuesto
del lado del backend (evita 2-3 round-trips dentro del turno de voz).

```js
const GetCampaignSummaryIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetCampaignSummaryIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    if (!campaign) return noCampaignSelected(handlerInput, t);

    try {
      const summary = await bananagramApi.getCampaignSummary(token, campaign.id);

      const speech = t('SUMMARY_INFO', {
        campaignName: campaign.name,
        reach: summary.reach,
        engagement: summary.engagementAvg,
        network: summary.topPost.network,
        date: summary.topPost.date,
        engagementRate: summary.topPost.engagementRate,
        savedCount: summary.savedIdeasCount,
      });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_SUMMARY'))
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega `GetCampaignSummaryIntentHandler,` a la lista, después de
`GetIdeaRecommendationsIntentHandler,`.

**Probar:** di "dame un resumen" — debe combinar alcance, engagement, mejor
publicación y conteo de ideas guardadas, todo real.

---

## 17. `DeleteIdeaIntent` — mismo patrón de dos handlers, ahora contra el backend real

Mismo split por `dialogState`, misma lógica de reintentos (2 fallos → 3er
fallo lee la lista completa), mismas notas sobre `AMAZON.SearchQuery` y el
riesgo de choque con `SelectCampaignIntent` (ver versión anterior de este
documento, `git log` si necesitas el texto completo de esas notas — el
comportamiento no cambió, solo la fuente de datos). La diferencia real:
`yaGuardadas` viene de `GET /campaigns/:id/ideas`, y el borrado final es
`DELETE /ideas/:id` con el `id` real de la idea (ya no un `splice` sobre un
array de sesión/DynamoDB).

```js
const EnProgresoDeleteIdeaIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DeleteIdeaIntent'
      && request.dialogState !== 'COMPLETED';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const intentActual = handlerInput.requestEnvelope.request.intent;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    if (!campaign) return noCampaignSelected(handlerInput, t);

    try {
      const yaGuardadas = await bananagramApi.listIdeas(token, campaign.id);

      if (yaGuardadas.length === 0) {
        return handlerInput.responseBuilder
          .speak(t('DELETE_IDEA_EMPTY', { campaignName: campaign.name }))
          .reprompt(t('REPROMPT_IDEAS_GENERATED'))
          .getResponse();
      }

      const ideaTitle = getResolvedSlot(intentActual.slots.ideaTitle).name;

      if (!ideaTitle) {
        return handlerInput.responseBuilder
          .addDelegateDirective(intentActual)
          .getResponse();
      }

      const match = yaGuardadas.find((idea) => (idea.title || idea.text).toLowerCase() === ideaTitle.toLowerCase());

      if (!match) {
        const attempts = (sessionAttributes.deleteIdeaAttempts || 0) + 1;
        sessionAttributes.deleteIdeaAttempts = attempts > 2 ? 0 : attempts;
        // Guarda también el id real de la idea que sí hizo match, para el
        // handler Completado — se resuelve otra vez ahí por simplicidad si
        // hace falta, pero cachearlo aquí evita una llamada extra.
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        if (attempts > 2) {
          const lista = yaGuardadas.map((idea) => idea.title || idea.text).join(', ');
          return handlerInput.responseBuilder
            .speak(t('DELETE_IDEA_LIST_FALLBACK', { campaignName: campaign.name, lista }))
            .reprompt(t('REPROMPT_DELETE_IDEA'))
            .getResponse();
        }

        return handlerInput.responseBuilder
          .speak(t('DELETE_IDEA_NOT_FOUND_RETRY', { campaignName: campaign.name }))
          .reprompt(t('REPROMPT_DELETE_IDEA'))
          .getResponse();
      }

      sessionAttributes.deleteIdeaAttempts = 0;
      sessionAttributes.pendingDeleteIdeaId = match.id;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

      if (intentActual.confirmationStatus === 'NONE') {
        const confirmMsg = t('DELETE_IDEA_CONFIRM', {
          ideaTitle: match.title || match.text,
          campaignName: campaign.name,
        });
        return handlerInput.responseBuilder
          .speak(confirmMsg)
          .reprompt(confirmMsg)
          .addConfirmIntentDirective(intentActual)
          .getResponse();
      }

      if (intentActual.confirmationStatus === 'DENIED') {
        return handlerInput.responseBuilder
          .speak(t('DELETE_IDEA_CANCELLED'))
          .reprompt(t('REPROMPT_DELETE_IDEA'))
          .getResponse();
      }

      return handlerInput.responseBuilder
        .addDelegateDirective(intentActual)
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};

const CompletadoDeleteIdeaIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DeleteIdeaIntent'
      && request.dialogState === 'COMPLETED';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const intentActual = handlerInput.requestEnvelope.request.intent;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const campaign = sessionAttributes.selectedCampaign;
    const ideaTitle = getResolvedSlot(intentActual.slots.ideaTitle).name;
    const ideaId = sessionAttributes.pendingDeleteIdeaId;

    try {
      await bananagramApi.deleteIdea(token, ideaId);
      const remaining = await bananagramApi.listIdeas(token, campaign.id);

      const speech = t('DELETE_IDEA_OK', {
        ideaTitle,
        campaignName: campaign.name,
        total: remaining.length,
      });

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(t('REPROMPT_DELETE_IDEA'))
        .getResponse();
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega **ambos**, `EnProgresoDeleteIdeaIntentHandler,` y
`CompletadoDeleteIdeaIntentHandler,`, a la lista, después de
`SaveCustomIdeaIntentHandler,`.

**Probar:** igual que la versión anterior — título inventado (2
reintentos, 3er fallo lee la lista completa), interrupción con "que ideas
tengo guardadas" a media espera, título real con confirmación y
cancelación, y borrado real que sí baja el conteo en un `GET` posterior.

---

## 18. `ChangeCampaignIntentHandler`

Reutiliza `findCampaign` (checkpoint 5) y `enterCampaign` — mismo
comportamiento que `SelectCampaignIntent`, sin cerrar sesión.

```js
const ChangeCampaignIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChangeCampaignIntent';
  },
  async handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const token = getAccessToken(handlerInput);
    if (!token) return accountLinkingRequired(handlerInput, t);

    const intentActual = handlerInput.requestEnvelope.request.intent;

    if (handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED') {
      return handlerInput.responseBuilder
        .addDelegateDirective(intentActual)
        .getResponse();
    }

    const resolved = getResolvedSlot(intentActual.slots.campaignName);
    const campaign = findCampaign(handlerInput, resolved);
    if (!campaign) {
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      const first = (sessionAttributes.availableCampaigns || [])[0] || {};
      return handlerInput.responseBuilder
        .speak(t('SELECT_CAMPAIGN_NOT_FOUND'))
        .reprompt(t('REPROMPT_LAUNCH', { camp: first.name || '' }))
        .getResponse();
    }

    try {
      return await enterCampaign(handlerInput, campaign, t);
    } catch (error) {
      return apiError(handlerInput, t, error);
    }
  },
};
```

Agrega `ChangeCampaignIntentHandler,` a la lista, justo después de
`SelectCampaignIntentHandler,`.

**Probar:** con una campaña ya seleccionada, di "cambiar de campaña" (sin
nombre) → Alexa pide cuál → di otra campaña real → debe entrar sin haber
cerrado sesión.

---

## 19. Handlers estándar

Sin cambios funcionales respecto a la versión anterior — solo se listan
aquí completos para el ensamblado final.

```js
const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const speech = sessionAttributes.selectedCampaign
      ? t('HELP_WITH_CAMPAIGN', { campaignName: sessionAttributes.selectedCampaign.name })
      : t('HELP_WITHOUT_CAMPAIGN');

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt(speech)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(t('GOODBYE'))
      .getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const { t } = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(t('FALLBACK'))
      .reprompt(t('FALLBACK'))
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error encontrado: ${error.message}`);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const speech = requestAttributes.t ? requestAttributes.t('ERROR_GENERIC') : 'Hubo un problema. Intenta de nuevo.';

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt(speech)
      .getResponse();
  },
};
```

**Probar:** di "ayuda" con y sin campaña seleccionada. Di algo sin sentido
— debe caer en `FallbackIntentHandler`. Di "adiós" — debe despedirse y
cerrar sesión.

---

## 20. Ensamblado final — reemplaza todo el `exports.handler`

Quita `IntentReflectorHandler` y `HelloWorldIntentHandler` (ya cumplieron
su función durante el desarrollo). Nota que **no hay**
`.withPersistenceAdapter(...)` en esta versión.

```js
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetActiveCampaignsIntentHandler,
    SelectCampaignIntentHandler,
    ChangeCampaignIntentHandler,
    GetCampaignMetricsIntentHandler,
    GetTopContentIntentHandler,
    GenerateContentIdeasIntentHandler,
    GetIdeaRecommendationsIntentHandler,
    GetCampaignSummaryIntentHandler,
    EnProgresoSaveIdeaIntentHandler,
    CompletadoSaveIdeaIntentHandler,
    SaveCustomIdeaIntentHandler,
    EnProgresoDeleteIdeaIntentHandler,
    CompletadoDeleteIdeaIntentHandler,
    GetSavedIdeasIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(LocalizationInterceptor)
  .lambda();
```

**Probar:** guarda, `Deploy`, y confirma que el build pasa sin errores ni
warnings.

---

## 21. Prueba end-to-end completa (la que se muestra en vivo)

Ver el guion completo en `../AlexaSkill-Diseno-Final.md` §8 — mismo
recorrido conversacional que las versiones anteriores (esa es la idea: la
UX de voz no cambia, solo lo que hay detrás de cada respuesta). La única
diferencia operativa: antes de empezar, la cuenta de prueba en el
simulador debe tener el account-linking completado contra un usuario real
de Bananagram con al menos una marca/campaña — si no, el primer paso
("abre asistente bananagram") debe pedir vincular la cuenta en vez de
listar campañas.

## Checklist final antes de presentar

- [ ] Account linking configurado en la consola (Auth URI, Access Token
      URI, Client ID/Secret contra `GET /oauth/authorize`/`POST /oauth/token`
      de auth-service) y probado con una cuenta real vinculada.
- [ ] Los 12 intents + `LaunchRequest` responden con datos reales de
      brands-service/content-service/analytics-service, ninguno cae en
      `FallbackIntentHandler` por error de nombre.
- [ ] `AMAZON.YesIntent`/`AMAZON.NoIntent` están declarados en ambos
      interaction models (ya corregido en `interaction-model-*.json`).
- [ ] Dynamic Entities probado: las campañas reales del usuario reemplazan
      el catálogo estático de `LaunchRequest` en cada sesión.
- [ ] El flujo de `SaveIdeaIntent` se probó completo: número → título →
      rechazo por corto → rechazo por duplicado (contra el `GET` real) →
      confirmación → `POST` real.
- [ ] El flujo de `DeleteIdeaIntent` se probó completo: título inventado
      (2 reintentos + lista completa al 3er fallo), título real con
      confirmación/cancelación, y `DELETE` real que baja el conteo.
- [ ] La prueba de persistencia real (§21) funciona: ideas sobreviven a
      cerrar y reabrir sesión, viniendo de `ContentIdea`, no de sesión.
- [ ] `GetIdeaRecommendationsIntent` y `GetCampaignSummaryIntent` cambian
      de resultado según la campaña/marca real seleccionada.
- [ ] Manejo de error probado explícitamente: backend caído o token
      expirado responde `ERROR_API`/tarjeta de account-linking, nunca
      truena el Lambda.
- [ ] El build de `Deploy` no tiene errores en el log.
