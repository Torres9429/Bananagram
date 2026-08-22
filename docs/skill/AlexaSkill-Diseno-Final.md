# Alexa Skill — Asistente Bananagram — Diseño final

> ⚠️ **DESCARTADO — no es el diseño que se está construyendo.** El equipo externo del Lambda ya tiene un
> contrato real y distinto, con solo 6 funciones: `fetchUserByLinkCode`, `fetchCampaigns`,
> `fetchContentIdeas`, `fetchSavedIdeas`, `saveIdeaToBackend`, `deleteIdeaFromBackend` — documentado en
> `docs/todos/2026-08-10-ayrshare-pipeline-alexa-endpoints-plan.md`. En particular: **la generación de
> ideas con IA vive en el backend de Bananagram, no en el Lambda** (`fetchContentIdeas` espera ideas ya
> generadas de vuelta, no las genera el Lambda llamando a Claude directo como dice la sección 7 de este
> documento) — esa pieza sigue sin implementarse (pendiente de una API key de Anthropic con facturación
> activa). El account-linking (LinkCode, no OAuth2 como dice el checklist de la sección 9) y la lista de
> endpoints de campañas tampoco coinciden con lo real. Este documento queda solo como referencia histórica
> de una ronda de diseño anterior — no lo uses como fuente de verdad.
>
> Este documento **sustituye** a `AlexaSkill-Flujo-Basico.md` y `AlexaSkill-Diseno-Avanzado.md` (ambos retirados — su contenido quedó consolidado e integrado aquí). El diseño original de 14 intents sigue siendo `Bananagram/docs/AlexaSkill_v2.md` (se conserva como origen histórico, no se toca). Este es el diseño **final, ya alineado con el backend real** de Bananagram (`docs/base/modelo2.txt` + `docs/base/service-boundaries.md`) — ya no hay una versión "mock" y una "de verdad" por separado: todo lo descrito aquí es lo que se implementa. El código completo, paso a paso, vive en `json-code/lambda-codigo-por-pasos.md`; los interaction models finales en `json-code/interaction-model-{es-MX,en-US}.json`.

---

## 1. Alcance — los 12 intents (todos en alcance, ninguno diferido)

A diferencia de las versiones anteriores (que dividían en "core" vs. "fuera de alcance"), este diseño final cubre los 12 intents completos más `LaunchRequest`:

| # | Intent | Qué hace | Slots |
|---|---|---|---|
| — | `LaunchRequest` | Verifica cuenta vinculada; saluda y lista las campañas reales del usuario (`GET /campaigns/mine`) | — |
| 1 | `GetActiveCampaignsIntent` | Repite la lista de campañas | — |
| 2 | `SelectCampaignIntent` | Carga la campaña (id real) como contexto de sesión | `{campaignName}` **obligatorio** |
| 3 | `GetCampaignMetricsIntent` | Alcance, engagement, seguidores actuales, red top | — (opera sobre sesión) |
| 4 | `GetTopContentIntent` | Describe la publicación con mejor rendimiento | `{networkName}` opcional, `{dateRange}` opcional |
| 5 | `GenerateContentIdeasIntent` | Genera ideas de contenido (Lambda-side, sin backend de Bananagram) | `{networkName}` opcional, `{quantity}` opcional |
| 6 | `SaveIdeaIntent` | Guarda una idea generada, por número | `{ideaNumber}` **obligatorio**, `{ideaTitle}` **obligatorio** |
| 7 | `SaveCustomIdeaIntent` | Guarda una idea dictada libremente | `{ideaText}` **obligatorio** |
| 8 | `GetSavedIdeasIntent` | Lista las ideas guardadas de la campaña activa | — |
| 9 | `DeleteIdeaIntent` | Borra una idea guardada, por título | `{ideaTitle}` **obligatorio** |
| 10 | `GetIdeaRecommendationsIntent` | Recomendaciones basadas en el score real de la marca | — |
| 11 | `GetCampaignSummaryIntent` | Resumen ejecutivo: métricas + top post + ideas guardadas | — |
| 12 | `ChangeCampaignIntent` | Cambia de campaña sin cerrar sesión | `{campaignName}` opcional (se elicita si falta) |
| — | `AMAZON.HelpIntent` | Orienta según si hay campaña activa o no | — |

**Built-ins de plataforma**: `AMAZON.StopIntent`, `AMAZON.CancelIntent`, `AMAZON.FallbackIntent`, `AMAZON.NavigateHomeIntent`, y `AMAZON.YesIntent`/`AMAZON.NoIntent` (declarados explícitamente — ver §3; las versiones anteriores del interaction model no los declaraban pese a usar `confirmationRequired: true` en `SaveIdeaIntent`/`DeleteIdeaIntent`).

## 2. Origen real de cada dato — ya no hay `mockData.js`

**Arquitectura de servicios (3, no 4)**: el backend son `auth-service`,
`core-service` (fusiona lo que antes eran brands/content/analytics-service) y
`alexa-service` (BFF de esta skill, sin base de datos propia — ver
`docs/base/service-boundaries.md`). El Lambda **solo habla con dos hosts**:
`alexa-service` para todo lo de campañas/métricas/ideas, y `auth-service`
para el account-linking (§4). `alexa-service` resuelve internamente contra
`core-service` (vía el circuit breaker `opossum` de
`apps/backend/commons/circuit-breaker`) — el Lambda nunca llama a
`core-service` directo.

| Intent | De dónde viene el dato |
|---|---|
| `LaunchRequest` / `GetActiveCampaignsIntent` | `GET /campaigns/mine` (alexa-service → core-service) — filtrado server-side por rol/ownership a partir del JWT (`Brand.ownerId`, `Campaign.cmId`, `CampaignDesigner.userId`) |
| `SelectCampaignIntent` / `ChangeCampaignIntent` | Slot resuelto contra la lista sincronizada por **Dynamic Entities** (§4) en esa sesión, nunca contra un catálogo fijo |
| `GetCampaignMetricsIntent` | `GET /campaigns/:campaignId/metrics-summary?period=` (alexa-service → core-service) |
| `GetTopContentIntent` | `GET /campaigns/:campaignId/top-content?network=&period=` (alexa-service → core-service) |
| `GenerateContentIdeasIntent` | Sin backend de Bananagram — Claude API directo desde el Lambda (§8), o `ideaTemplates.js` como banco de respaldo |
| `SaveIdeaIntent` / `SaveCustomIdeaIntent` | `POST /campaigns/:campaignId/ideas` (alexa-service → core-service, `ContentIdea`) |
| `GetSavedIdeasIntent` | `GET /campaigns/:campaignId/ideas` (alexa-service → core-service) |
| `DeleteIdeaIntent` | `DELETE /ideas/:id` (alexa-service → core-service), resuelto por título contra el `GET` anterior |
| `GetIdeaRecommendationsIntent` | `GET /campaigns/:campaignId/summary` (alexa-service → core-service) — reutiliza el mismo score que el resumen |
| `GetCampaignSummaryIntent` | `GET /campaigns/:campaignId/summary` (alexa-service → core-service, compone métricas + top post + score en una sola llamada) + conteo de `GET /campaigns/:campaignId/ideas` |
| `AMAZON.HelpIntent` | Sin dependencia de backend |

Todos los endpoints se llaman con `Authorization: Bearer <accessToken>`, donde `accessToken` es el que Alexa entrega tras el account-linking (§4) — nunca hace falta que el Lambda maneje login/password.

## 3. Modelo de interacción

**Invocation name**: `asistente bananagram` (es-MX) / `bananagram assistant` (en-US).

### Slots consolidados

| Slot | Tipo Alexa | Usado en | Obligatorio |
|---|---|---|---|
| `{campaignName}` | `LISTA_CAMPANAS`/`LIST_CAMPAIGNS` (custom, sincronizado por Dynamic Entities) | `SelectCampaignIntent`, `ChangeCampaignIntent` | Sí en `SelectCampaignIntent`; se elicita en `ChangeCampaignIntent` si falta |
| `{networkName}` | `LISTA_REDES`/`LIST_NETWORKS` (custom) | `GetTopContentIntent`, `GenerateContentIdeasIntent` | No |
| `{dateRange}` | `LISTA_PERIODOS`/`LIST_PERIODS` (custom) | `GetTopContentIntent` | No |
| `{quantity}` | `AMAZON.NUMBER` | `GenerateContentIdeasIntent` | No |
| `{ideaNumber}` | `AMAZON.NUMBER` | `SaveIdeaIntent` | Sí |
| `{ideaTitle}` | `AMAZON.SearchQuery` | `SaveIdeaIntent`, `DeleteIdeaIntent` | Sí |
| `{ideaText}` | `AMAZON.SearchQuery` | `SaveCustomIdeaIntent` | Sí |

### Custom slot types — valores base (catálogo de respaldo, ver §4)

Los valores completos con sinónimos y el campo `id` normalizado están en `json-code/interaction-model-es-MX.json`/`-en-US.json` (fuente de verdad, no se repiten aquí para no duplicar). Resumen:

```
LISTA_CAMPANAS   → catálogo de respaldo de 3 nombres (id: verano-2026, black-friday, regreso-a-clases); 
				   en producción, con cuenta vinculada, se sustituye en cada sesión por Dynamic Entities con las campañas reales del usuario.

LISTA_REDES      → Instagram(id:instagram) · TikTok(id:tiktok) · Facebook(id:facebook) · LinkedIn(id:linkedin) · YouTube(id:youtube) · X(id:x)

LISTA_PERIODOS   → semana · mes · campaña (sin id — filtro puramente de UI, no tiene equivalente en el schema)
```

**Nota de vocabulario de redes**: el `id` normalizado usa nombres completos en minúscula (convención del frontend, `docs/docs-front/frontend-db-alignment.md`), NO los códigos de 2 letras del seed real (`packages/seed/src/index.js:76-81`: `IG/TK/FB/X/LI/YT`) — el proyecto no tiene todavía una única convención. El mapeo hacia lo que cada endpoint de backend realmente espera vive en el Lambda (`bananagramApi.js`, ver la guía de código), no en el interaction model.

### Sample utterances por intent

Sin cambios respecto a las versiones anteriores — están completas en `json-code/interaction-model-es-MX.json`/`-en-US.json`. Mínimo de certificación (3-5 por intent) ya cumplido en ambos idiomas.

---

## 4. Arquitectura de datos e identidad

### Identidad — Alexa Account Linking (reemplaza el "sin identidad" de las versiones mock)

OAuth2 authorization-code grant contra **auth-service** (no api-gateway):

- `GET /oauth/authorize` — envuelve el login existente de auth-service; emite un JWT firmado de corta duración como "código de autorización" (sin tabla nueva, verificado por firma al canjearlo).
- `POST /oauth/token` — `grant_type=authorization_code` canjea ese código reutilizando `AuthService.login` (sin password); `grant_type=refresh_token` delega a `AuthService.refresh` ya existente.

El Lambda recibe el `accessToken` de Bananagram vía `context.System.user.accessToken` en cada request (mecanismo estándar de Alexa una vez la cuenta está vinculada) y lo manda como `Authorization: Bearer` en cada llamada — el filtrado de qué campañas ve cada usuario ocurre server-side, a partir de los claims del JWT. 

Si `accessToken` no está presente (cuenta no vinculada), el Lambda responde pidiendo vincular la cuenta (directiva estándar de Alexa para account-linking) en vez de proceder con cualquier dato.

### Session Attributes (temporales — se pierden al cerrar sesión)

| Atributo | Contenido |
|---|---|
| `selectedCampaignId` | El `Campaign.id` real (UUID) de la campaña activa — ya no un slug inventado |
| `lastGeneratedIdeas` | Array de las últimas ideas generadas (candidatas, no confirmadas — solo se promueven a `ContentIdea` real vía `SaveIdeaIntent`/`SaveCustomIdeaIntent`) |
| `deleteIdeaAttempts` | Contador de reintentos fallidos en `DeleteIdeaIntent` |

### Persistencia — ya no hay DynamoDB

Las versiones anteriores (`AlexaSkill-Diseno-Avanzado.md`) persistían
`savedIdeas` en DynamoDB, con el `userId` de Alexa como llave. **Esto se
retira por completo**: las ideas guardadas ahora viven en `ContentIdea`
(core-service, ver `docs/base/modelo2.txt`), asociadas al `User.id` real
de Bananagram (vía el JWT del account-linking), no al `userId` de Alexa.
El Lambda ya no necesita `ask-sdk-dynamodb-persistence-adapter` ni
`persistentAttributes` — cada operación de guardar/leer/borrar ideas es una
llamada HTTP a alexa-service, que a su vez llama a core-service (alexa-service
no persiste nada, es un puro consumidor de API).

### Dynamic Entities — lista de campañas real, no estática

En `LaunchRequest` (y tras cualquier `SelectCampaignIntent`/
`ChangeCampaignIntent` exitoso), el Lambda envía la directiva
`Dialog.UpdateDynamicEntities` (`updateBehavior: REPLACE`) para
sobrescribir `LISTA_CAMPANAS`/`LIST_CAMPAIGNS` con los nombres e ids reales
de `GET /campaigns/mine` de esa sesión. Los 3 valores estáticos del JSON
(§3) quedan como catálogo de respaldo — útil para poder abrir la skill en
el simulador sin cuenta vinculada, nunca la fuente real una vez hay
account-linking activo.

## 5. Score — resolución campaña→marca

`BrandScore` pertenece a `Brand`, no a `Campaign` (nunca ha existido un
score por campaña en el proyecto real). Al hablar del score de la campaña
activa, la skill resuelve `Campaign.brandId` y reporta el score real de esa
marca, siendo explícita en el texto: *"El score de {{brandName}}, que cubre
esta y otras campañas, es de {{score}} sobre 100."* — ver claves
`SELECT_CAMPAIGN_OK`/`RECOMMENDATIONS_INFO` en §6.

## 6. i18n (es/en) — claves finales

`i18next` + `i18next-sprintf-postprocessor`, mismo patrón de `LocalizationInterceptor` que las versiones anteriores. 

Tabla completa (cambios respecto a `AlexaSkill-Diseno-Avanzado.md` marcados con **★**):

| Clave | es | en |
|---|---|---|
| `ACCOUNT_LINKING_REQUIRED` **★** | Para usar Asistente Bananagram necesitas vincular tu cuenta. Abre la app de Alexa para hacerlo. | To use Bananagram Assistant you need to link your account. Open the Alexa app to do that. |
| `LAUNCH_WELCOME` | Bienvenido a Asistente Bananagram. Tienes {{n}} campañas activas: {{lista}}. Di el nombre de la que quieras revisar para comenzar. | Welcome to Bananagram Assistant. You have {{n}} active campaigns: {{lista}}. Say the name of the one you want to review to get started. |
| `REPROMPT_LAUNCH` | No escuché tu respuesta. Puedes decir el nombre de alguna campaña, por ejemplo {{camp}}, o pedir 'lista mis campañas' para escucharlas de nuevo. | I didn't catch that. You can say a campaign name, for example {{camp}}, or ask to 'list my campaigns' to hear them again. |
| `CAMPAIGNS_LIST` | Tienes {{n}} campañas activas: {{lista}}. Di el nombre de la que quieras revisar. | You have {{n}} active campaigns: {{lista}}. Say the name of the one you want to review. |
| `REPROMPT_CAMPAIGNS_LIST` | No escuché tu respuesta. Puedes decir el nombre de alguna campaña para comenzar a trabajar con ella. | I didn't catch that. You can say a campaign name to start working with it. |
| `SELECT_CAMPAIGN_NOT_FOUND` | No encontré esa campaña. Di el nombre de alguna campaña activa. | I couldn't find that campaign. Say the name of an active campaign. |
| `SELECT_CAMPAIGN_OK` **★** | Listo. Entrando a {{campaignName}}. Esta campaña tiene {{totalPosts}} publicaciones. El score de {{brandName}}, que cubre esta y otras campañas, es de {{score}} sobre 100. | Done. Entering {{campaignName}}. This campaign has {{totalPosts}} posts. {{brandName}}'s score, which covers this and other campaigns, is {{score}} out of 100. |
| `SELECT_CAMPAIGN_SAVED_SUFFIX` | Ya tienes {{n}} ideas guardadas en esta campaña. | You already have {{n}} ideas saved in this campaign. |
| `SELECT_CAMPAIGN_NEXT` | Puedes pedirme las métricas, ver la mejor publicación, generar ideas de contenido, o ver tus ideas guardadas. ¿Qué quieres hacer? | You can ask for the metrics, see the top post, generate content ideas, or check your saved ideas. What would you like to do? |
| `REPROMPT_SELECT_CAMPAIGN` | Puedes decir 'métricas', 'mejor publicación', 'genera ideas' o 'mis ideas guardadas'. | You can say 'metrics', 'top post', 'generate ideas' or 'my saved ideas'. |
| `METRICS_INFO` **★** | {{campaignName}} tiene {{totalPosts}} publicaciones. Alcance acumulado: {{reach}}. Engagement promedio: {{engagement}} por ciento. Seguidores actuales: {{followers}}. La red con mejor rendimiento es {{topNet}}. ¿Quieres que te cuente cuál fue la mejor publicación? | {{campaignName}} has {{totalPosts}} posts. Total reach: {{reach}}. Average engagement: {{engagement}} percent. Current followers: {{followers}}. The best performing network is {{topNet}}. Want me to tell you about the top post? |
| `REPROMPT_METRICS` | Para ver la mejor publicación di 'mejor publicación'. Para generar ideas di 'genera ideas'. | To see the top post say 'top post'. To generate ideas say 'generate ideas'. |
| `TOP_CONTENT_INFO` | La mejor publicación de {{campaignName}} fue en {{network}} el {{date}}. Formato: {{format}}. Obtuvo {{likes}} likes, {{comments}} comentarios y {{engagementRate}} por ciento de engagement, superando el promedio en {{diff}} por ciento. ¿Quieres que genere ideas basadas en este resultado? | The top post from {{campaignName}} was on {{network}} on {{date}}. Format: {{format}}. It got {{likes}} likes, {{comments}} comments and {{engagementRate}} percent engagement, beating the campaign average by {{diff}} percent. Want me to generate ideas based on this result? |
| `TOP_CONTENT_NO_MATCH` | No encontré publicaciones de {{campaignName}} con ese filtro, así que te cuento la mejor de toda la campaña. | I couldn't find posts from {{campaignName}} matching that filter, so here's the best one from the whole campaign. |
| `REPROMPT_TOP_CONTENT` | Para generar ideas di 'genera ideas'. | To generate ideas say 'generate ideas'. |
| `IDEAS_GENERATED` | Con base en {{campaignName}}, aquí van {{n}} ideas: {{listado}}. Puedes decirme el número que quieras guardar, o di 'guardar mi propia idea' si tienes una diferente. | Based on {{campaignName}}, here are {{n}} ideas: {{listado}}. You can tell me the number you want to save, or say 'save my own idea' if you have a different one. |
| `REPROMPT_IDEAS_GENERATED` | Di un número para guardar esa idea, o di 'guardar mi propia idea'. | Say a number to save that idea, or say 'save my own idea'. |
| `SAVE_IDEA_NO_CANDIDATES` | Primero genera ideas diciendo 'genera ideas'. | First generate ideas by saying 'generate ideas'. |
| `SAVE_IDEA_INVALID_NUMBER` | No encontré esa idea. Di un número del uno al tres. | I couldn't find that idea. Say a number from one to three. |
| `SAVE_IDEA_TITLE_INVALID` | Ese título es muy corto o ya lo usaste antes. Dime otro título para tu idea. | That title is too short or already used. Tell me a different title for your idea. |
| `SAVE_IDEA_ELICIT_TITLE` | Guardando '{{ideaText}}'. ¿Con qué título quieres guardarla? | Saving '{{ideaText}}'. What title do you want to save it under? |
| `SAVE_IDEA_CONFIRM` | ¿Confirmas guardar la idea '{{ideaText}}' con el título {{ideaTitle}} en {{campaignName}}? | Do you confirm saving the idea '{{ideaText}}' titled {{ideaTitle}} in {{campaignName}}? |
| `SAVE_IDEA_CANCELLED` | De acuerdo, no la guardé. ¿Quieres intentar con otro número o título? | Okay, I didn't save it. Want to try another number or title? |
| `SAVE_IDEA_OK` | Listo. Guardé '{{ideaText}}' con el título {{ideaTitle}} en {{campaignName}}. Ya tienes {{total}} ideas guardadas en esta campaña. ¿Quieres guardar otra o generar más ideas? | Done. I saved '{{ideaText}}' titled {{ideaTitle}} in {{campaignName}}. You now have {{total}} ideas saved in this campaign. Want to save another or generate more ideas? |
| `REPROMPT_SAVE_IDEA_OK` | Para generar más ideas di 'genera ideas'. Para ver tus ideas guardadas di 'mis ideas'. | To generate more ideas say 'generate ideas'. To check your saved ideas say 'my ideas'. |
| `CUSTOM_IDEA_ELICIT` | Claro, dime la idea. | Sure, tell me the idea. |
| `CUSTOM_IDEA_OK` | Perfecto. Guardé tu idea en {{campaignName}}: '{{ideaText}}'. Ya tienes {{total}} ideas guardadas en esta campaña. ¿Quieres seguir generando ideas o ver tus ideas guardadas? | Great. I saved your idea in {{campaignName}}: '{{ideaText}}'. You now have {{total}} ideas saved in this campaign. Want to keep generating ideas or check your saved ideas? |
| `REPROMPT_CUSTOM_IDEA_OK` | Para generar ideas di 'genera ideas'. Para ver tus ideas guardadas di 'mis ideas'. | To generate ideas say 'generate ideas'. To check your saved ideas say 'my ideas'. |
| `SAVED_IDEAS_LIST` | Tienes {{n}} ideas guardadas en {{campaignName}}: {{lista}}. ¿Quieres generar más ideas o cambiar de campaña? | You have {{n}} ideas saved in {{campaignName}}: {{lista}}. Want to generate more ideas or switch campaigns? |
| `SAVED_IDEAS_EMPTY` | Aún no tienes ideas guardadas en {{campaignName}}. Di 'genera ideas' para empezar. | You don't have any saved ideas in {{campaignName}} yet. Say 'generate ideas' to get started. |
| `REPROMPT_SAVED_IDEAS` | Para generar ideas di 'genera ideas'. | To generate ideas say 'generate ideas'. |
| `DELETE_IDEA_EMPTY` | Aún no tienes ideas guardadas en {{campaignName}} para borrar. | You don't have any saved ideas in {{campaignName}} to delete yet. |
| `DELETE_IDEA_ELICIT_TITLE` | Dime el título de la idea que quieres borrar de {{campaignName}}. | Tell me the title of the idea you want to delete from {{campaignName}}. |
| `DELETE_IDEA_NOT_FOUND_RETRY` | No encontré una idea con ese título en {{campaignName}}. Vuelve a decir 'borra la idea' seguido del título exacto. | I couldn't find an idea with that title in {{campaignName}}. Say 'delete the idea' followed by the exact title again. |
| `DELETE_IDEA_LIST_FALLBACK` | Sigo sin encontrarla. Tus ideas guardadas en {{campaignName}} son: {{lista}}. Vuelve a decir 'borra la idea' seguido del título exacto. | I still couldn't find it. Your saved ideas in {{campaignName}} are: {{lista}}. Say 'delete the idea' followed by the exact title again. |
| `DELETE_IDEA_CONFIRM` | ¿Confirmas que quieres borrar la idea '{{ideaTitle}}' de {{campaignName}}? | Do you confirm you want to delete the idea '{{ideaTitle}}' from {{campaignName}}? |
| `DELETE_IDEA_CANCELLED` | De acuerdo, no borré nada. Si quieres intentar con otro título, di 'borra la idea' seguido del título. | Okay, I didn't delete anything. To try another title, say 'delete the idea' followed by the title. |
| `DELETE_IDEA_OK` | Listo, borré la idea '{{ideaTitle}}' de {{campaignName}}. Te quedan {{total}} ideas guardadas. | Done, I deleted the idea '{{ideaTitle}}' from {{campaignName}}. You have {{total}} saved ideas left. |
| `REPROMPT_DELETE_IDEA` | Di 'borra la idea' seguido del título exacto, o di 'mis ideas guardadas' para escuchar la lista. | Say 'delete the idea' followed by the exact title, or say 'my saved ideas' to hear the list. |
| `RECOMMENDATIONS_INFO` **★** | Con base en el score de {{brandName}} ({{score}} sobre 100, clasificación {{classification}}), tu punto más débil es {{weakLabel}} con {{weakValue}}. Te recomiendo enfocarte en {{topNet}}, tu red con mejor rendimiento en esta campaña. Aquí van 2 ideas: {{listado}}. ¿Quieres generar más ideas o guardar alguna? | Based on {{brandName}}'s score ({{score}} out of 100, classification {{classification}}), your weakest point is {{weakLabel}} at {{weakValue}}. I recommend focusing on {{topNet}}, your best performing network in this campaign. Here are 2 ideas: {{listado}}. Want to generate more ideas or save one? |
| `REPROMPT_RECOMMENDATIONS` | Para generar más ideas di 'genera ideas'. Para guardar una di 'guarda la idea' seguido del número. | To generate more ideas say 'generate ideas'. To save one say 'save idea' followed by the number. |
| `SUMMARY_INFO` | Resumen de {{campaignName}}: alcance de {{reach}}, engagement promedio de {{engagement}} por ciento. Tu mejor publicación fue en {{network}} el {{date}} con {{engagementRate}} por ciento de engagement. Tienes {{savedCount}} ideas guardadas en esta campaña. ¿Quieres ver más detalles o generar ideas? | Summary of {{campaignName}}: reach of {{reach}}, average engagement of {{engagement}} percent. Your top post was on {{network}} on {{date}} with {{engagementRate}} percent engagement. You have {{savedCount}} ideas saved in this campaign. Want to see more details or generate ideas? |
| `REPROMPT_SUMMARY` | Puedes decir 'métricas', 'mejor publicación' o 'genera ideas'. | You can say 'metrics', 'top post' or 'generate ideas'. |
| `ERROR_NO_CAMPAIGN` | Primero elige una campaña. Puedes decir 'qué campañas tengo' para ver las disponibles. | First pick a campaign. You can say 'what campaigns do I have' to see what's available. |
| `ERROR_API` **★** | Tuve un problema consultando tus datos de Bananagram. Intenta de nuevo en un momento. | I had trouble reaching your Bananagram data. Please try again in a moment. |
| `HELP_WITH_CAMPAIGN` | Estás trabajando con {{campaignName}}. Puedes decir: 'métricas', 'mejor publicación', 'genera ideas', 'guardar mi propia idea', 'mis ideas guardadas', 'borrar idea', 'recomendaciones', 'resumen de campaña', o 'cambiar de campaña'. ¿Qué deseas hacer? | You're working with {{campaignName}}. You can say: 'metrics', 'top post', 'generate ideas', 'save my own idea', 'my saved ideas', 'delete idea', 'recommendations', 'campaign summary', or 'change campaign'. What would you like to do? |
| `HELP_WITHOUT_CAMPAIGN` | Puedes decir 'qué campañas tengo' para ver las disponibles, o el nombre de una campaña para comenzar. | You can say 'what campaigns do I have' to see what's available, or the name of a campaign to get started. |
| `GOODBYE` | Hasta luego. | Goodbye. |
| `FALLBACK` | No entendí eso. Di 'ayuda' para escuchar las opciones disponibles. | I didn't understand that. Say 'help' to hear the available options. |
| `ERROR_GENERIC` | Hubo un problema. Intenta de nuevo. | Something went wrong. Please try again. |

## 7. Generación de ideas con IA

Se queda del lado del Lambda: llama a la API de Claude directo con
`ANTHROPIC_API_KEY` como variable de entorno/secreto del propio Lambda (no
se construye un `ai-service` — el proyecto se mantiene en 3 microservicios:
auth-service, core-service, alexa-service).
La regla de CLAUDE.md ("nunca exponer `ANTHROPIC_API_KEY` al frontend")
protege el bundle del navegador; un Lambda de backend no es "el frontend".
`ideaTemplates.js` se conserva como banco de respaldo si la llamada a
Claude falla o no está configurada.

## 8. Guion de demo (sesión completa)

1. **Usuario**: "Alexa, abre Asistente Bananagram" (cuenta ya vinculada)
   **Alexa**: "Bienvenido a Asistente Bananagram. Tienes 3 campañas activas: Verano 2026, Black Friday, Regreso a Clases. Di el nombre de la que quieras revisar para comenzar." *(lista real del usuario, vía Dynamic Entities)*
2. **Usuario**: "Verano 2026"
   **Alexa**: "Listo. Entrando a Verano 2026. Esta campaña tiene 24 publicaciones. El score de Café Aurora, que cubre esta y otras campañas, es de 79.8 sobre 100. Puedes pedirme las métricas, ver la mejor publicación, generar ideas de contenido, o ver tus ideas guardadas. ¿Qué quieres hacer?"
3. **Usuario**: "dame las métricas" → `GetCampaignMetricsIntent`, datos reales de core-service (vía alexa-service).
4. **Usuario**: "cuál fue la mejor publicación" → `GetTopContentIntent`, datos reales.
5. **Usuario**: "dame un resumen" → `GetCampaignSummaryIntent`, composite real.
6. **Usuario**: "dame recomendaciones" → `GetIdeaRecommendationsIntent`, score real.
7. **Usuario**: "dame ideas de contenido" → `GenerateContentIdeasIntent`, Claude o plantillas.
8. **Usuario**: "guarda la idea dos" → título → confirmación → `POST /campaigns/:id/ideas` real.
9. **Usuario**: "tengo una idea" → dicta → `POST /campaigns/:id/ideas` real, `source: propia`.
10. **Usuario**: "que ideas tengo guardadas" → `GET /campaigns/:id/ideas` real.
11. **Usuario**: "borra la idea [título]" → confirmación → `DELETE /ideas/:id` real.
12. **Usuario**: "cambiar de campaña" → "Black Friday" → `ChangeCampaignIntent`, sin cerrar sesión.
13. **Usuario**: "adiós" → cierra sesión.
14. **Prueba de persistencia real**: reabre la skill, selecciona "Verano 2026" de nuevo, di "mis ideas guardadas" — deben seguir ahí porque ahora vienen de `ContentIdea` en Bananagram, no de sesión ni de DynamoDB.

## 9. Checklist final

- [ ] Account linking configurado en la consola de Alexa (OAuth2 contra `GET /oauth/authorize` / `POST /oauth/token` de auth-service).
- [ ] `GET /campaigns/mine`, `GET/POST/DELETE .../ideas`, `GET .../metrics-summary`, `GET .../top-content`, `GET .../summary` implementados y desplegados en core-service, y consumidos por alexa-service (nunca directo desde el Lambda).
- [ ] `ContentIdea` migrado en `apps/backend/services/core-service` (a partir de `docs/base/modelo2.txt`, sección core-service) — ya reflejado en el schema real `apps/backend/commons/prisma/schema.prisma`.
- [ ] Dynamic Entities probado: campañas reales del usuario reemplazan el catálogo estático en `LaunchRequest`.
- [ ] Los 12 intents + `LaunchRequest` responden con datos reales, ninguno cae en `FallbackIntentHandler` por error de nombre.
- [ ] `AMAZON.YesIntent`/`AMAZON.NoIntent` declarados en ambos interaction models (ya corregido en `json-code/interaction-model-*.json`).
- [ ] Flujo de `SaveIdeaIntent`/`DeleteIdeaIntent` probado completo (número/título → validación → confirmación → llamada HTTP real).
- [ ] Prueba de persistencia real (paso 14 del guion) confirma que las ideas sobreviven a cerrar/reabrir sesión, vía `ContentIdea`, no DynamoDB.
- [ ] Manejo de error de red/API (`ERROR_API`) probado explícitamente (backend caído o token expirado no debe tronar el Lambda).
- [ ] Build de `Deploy` sin errores ni warnings.
