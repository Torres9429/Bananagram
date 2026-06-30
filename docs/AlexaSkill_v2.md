Alexa Skill Gestor de Redes Sociales y Puntuación Digital Asistente de
Generación de Contenido para Community Managers y Clientes Equipo de
desarrollo Adrian Uxue Chavez Martinez Estefany Alexa Delgado Heredia
Cristian Amauri Gonzaga Castañeda Rocio Rodriguez Torres Elias Manuel
Marquez Bailon Viridiana Portilla Palestina Junio 2026

14 Intents --- Asistente de Generación de Contenido

La skill gira alrededor de tres acciones: analizar campañas, generar
ideas de contenido y guardar ideas. El contexto de sesión hace el
trabajo: una vez seleccionada la campaña, todos los intents operan sobre
ella sin que el usuario tenga que repetirla.

Las ideas son conceptos cortos de una o dos frases, no publicaciones
completas. Ejemplos válidos: 'Video testimonial de 15 segundos',
'Comparativa antes y después', 'Encuesta rápida para seguidores'.

Cada respuesta de Alexa propone el siguiente paso natural. Los reprompts
se activan si el usuario guarda silencio por 8 segundos.

Parte 1 --- Flujo Principal

Se activa cuando el usuario abre la skill sin decir nada más. Alexa
saluda, lista las campañas activas disponibles y pide al usuario que
diga el nombre de la que quiere revisar. Si no hay campañas activas, lo
indica y cierra. Utterances

Slots, elicitación y reprompts

Lista todas las campañas activas disponibles para el usuario. No
requiere contexto previo y no tiene slots. Útil cuando el usuario quiere
escuchar las opciones de nuevo o llega sin haber pasado por
LaunchRequest.

Utterances

Slots, elicitación y reprompts

Carga la campaña elegida y la mantiene como contexto activo durante toda
la sesión. A partir de aquí, todos los intents de análisis y generación
operan sobre esta campaña. El usuario elige únicamente por nombre.

Utterances

Slots, elicitacion y reprompts

Devuelve las métricas generales de la campaña activa: alcance acumulado,
engagement promedio, seguidores ganados y total de publicaciones.
Requiere campaña seleccionada. No tiene slots: opera siempre sobre el
contexto de sesión.

Utterances

Slots, elicitación y reprompts

Identifica la publicación con mayor engagement en la campaña activa y
describe sus características clave: formato, red, fecha y horario de
publicación. Esta descripción sirve de insumo para generar ideas en el
siguiente paso. Slots opcionales para filtrar por red o periodo.

Utterances

Slots, elicitacion y reprompts

Intent central de la skill. Genera ideas de contenido basadas en la
campaña activa, sus métricas, la publicación más exitosa y tendencias
del sector. Las ideas son notas cortas de una o dos frases. Llama al
ai-service internamente. Slots opcionales para enfocar la generación.

Utterances

Slots, elicitacion y reprompts

Guarda una de las ideas generadas por Alexa. El usuario elige por
número. La idea queda vinculada a la campaña activa en sesión. Se puede
guardar más de una idea por sesión sin necesidad de regenerar.

Utterances

Slots, elicitación y reprompts

Permite al usuario dictar su propia idea en cualquier momento de la
sesión, sin necesidad de pasar por generación de ideas. Alexa pide
confirmación del texto antes de guardar. La idea queda vinculada a la
campaña activa.

Utterances

Slots, elicitacion y reprompts

Parte 2 --- Apoyo, Consulta y Navegación

Lista todas las ideas guardadas de la campaña activa en sesión. No
requiere slots. Si no hay ideas guardadas, lo indica y ofrece generar
nuevas.

Utterances

Slots, elicitación y reprompts

Elimina una idea guardada de la campaña activa. Requiere confirmación
del usuario antes de proceder. Si cancela, la idea se mantiene.
Selección por número de posición.

Utterances

Slots, elicitación y reprompts

Limpia el contexto de la campaña activa y permite al usuario elegir otra
sin cerrar la skill. Puede invocar la lista de campañas o decir
directamente el nombre de la siguiente.

Utterances

Slots, elicitación y reprompts

Distinto a generar ideas de contenido. Analiza las dimensiones del Score
Digital de la campaña activa y devuelve recomendaciones concretas con
números reales: que ajustar en frecuencia, engagement, consistencia o
cobertura. No usa IA: aplica reglas fijas sobre las métricas actuales.

Utterances

Slots, elicitación y reprompts

Genera un resumen ejecutivo de todo lo revisado en la sesión actual:
alcance, engagement, mejor publicación, ideas guardadas y score. Útil
para cerrar la sesión con una vista completa o para orientarse en medio
de la sesión.

Utterances

Slots, elicitación y reprompts

Orienta al usuario según el estado de la sesión. Si hay campaña
seleccionada, lista las acciones disponibles con ejemplos claros. Si no
la hay, indica cómo empezar. Es el salvavidas principal ante cualquier
punto de confusión ya que no existe interfaz visual.

Utterances

Slots, elicitacion y reprompts

Slots Consolidados

Referencia rápida de todos los slots del sistema. Los slots son
opcionales o condicionales en la mayoría de intents --- el contexto de
sesión reduce la necesidad de elicitación explícita.

Flujo de Conversación General

El recorrido típico de una sesión sigue el camino: abrir → seleccionar
campaña → analizar → generar ideas → guardar. Los intents de apoyo y
consulta se pueden invocar en cualquier momento sin romper el flujo.

Nota de implementación: {campaignName} e {ideaText} deben usar
DIALOG_DELEGATE en el modelo de interacción para que Alexa maneje la
elicitacion de forma nativa. {ideaText} usa AMAZON.SearchQuery para
capturar texto libre sin restricción de vocabulario.
