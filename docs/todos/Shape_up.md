Gestor de Redes Sociales y Puntuación Digital Metodología Shape Up ---
Planificación por ciclos

Equipo de desarrollo Adrian Uxue Chavez Martinez Estefany Alexa Delgado
Heredia Cristian Amauri Gonzaga Castañeda Rocio Rodríguez Torres Elias
Manuel Marquez Bailón Viridiana Portilla Palestina

Versión 1.0

Tabla de contenidos

1.  Estrategia de ramas El equipo trabaja con las siguientes ramas de
    Git. Ningún integrante hace push directo a 'main' ni a 'develop'.
    Todo cambio entra mediante Pull Request.

Regla del ciclo: el merge de 'develop → test' ocurre al cierre de cada
ciclo. El merge de 'test → main' ocurre solo cuando la demo del ciclo
está aprobada. 2. Planificación general El proyecto cuenta con 10
semanas efectivas de desarrollo, divididas en 3 ciclos Shape Up.

3.  Ciclo 1 --- Semanas 1 a 3 Pitch\
    Problema El sistema no tiene base operativa. Sin autenticación
    funcionando, sin usuarios registrados y sin los catálogos del
    sistema configurados, ningún otro flujo del producto puede comenzar.
    El equipo no tiene punto de arranque. Solución Levantar el monorepo
    completo con el microservicio de autenticación, el microservicio de
    catálogos y el App Shell con el microfrontend de acceso. Al cierre
    del ciclo el sistema debe existir, estar corriendo y ser posible
    entrar a él con roles diferenciados. Appetite 3 semanas. No se
    extiende. No-gos No se implementan campañas ni publicaciones en este
    ciclo. No hay métricas ni score digital. No hay notificaciones de
    ningún tipo. No se construye ninguna pantalla de gestión de
    contenido. Rabbit holes El RBAC dinámico puede volverse demasiado
    complejo si se intenta construir genéricamente desde el inicio. Se
    implementan los 4 roles fijos primero; la dinamización de
    privilegios se hace después con la base funcionando. La
    configuración inicial del monorepo y la arquitectura de
    microfrontends puede generar fricción técnica. Un App Shell con un
    microfrontend funcional es suficiente para este ciclo. Circuit
    breaker Si el sistema de privilegios dinámicos no está terminado al
    cierre de la semana 3, se entrega autenticación con roles fijos
    hardcodeados y la dinamización se incorpora al inicio del ciclo 2.
    No se extiende el ciclo. Scopes Hill Chart Semana 1 \[■■■■□□□□□□\]
    Monorepo + Docker + DB corriendo \[■■□□□□□□□□\] Auth service
    iniciado \[■□□□□□□□□□\] Catalog service iniciado

Semana 2 \[■■■■■■■■■■\] Monorepo + Docker + DB ✓ \[■■■■■■■□□□\] Auth
service: JWT y guards funcionando \[■■■■■□□□□□\] Catalog service: CRUDs
operativos \[■■■□□□□□□□\] App Shell iniciado

Semana 3 \[■■■■■■■■■■\] Auth service ✓ \[■■■■■■■■■■\] Catalog service ✓
\[■■■■■■■■■■\] App Shell + MF auth ✓ \[demo end-to-end: registro → login
→ dashboard por rol\] Implementación --- módulo de referencia Registro
de Cliente vía auto-registro público, login con JWT, acceso diferenciado
por rol y gestión completa de catálogos del sistema por el Administrador
(redes sociales, categorías, especialidades, roles y privilegios). Todos
los endpoints documentados con Swagger. 4. Ciclo 2 --- Semanas 4 a 7
Pitch\
Problema El sistema tiene usuarios que pueden entrar, pero no produce
nada. El valor real del producto está en que el Cliente pueda armar su
equipo, crear campañas y que el contenido pase por un flujo de
aprobación hasta publicarse. Sin este flujo el sistema no tiene razón de
existir. Solución Implementar el microservicio de marcas, el
microservicio de campañas con su lógica de equipo y el microservicio de
publicaciones con la máquina de estados completa, junto con los
microfrontends que permiten operar todo ese flujo desde el navegador.
Appetite 4 semanas. Es el ciclo más denso del proyecto. No se extiende.
No-gos No hay métricas ni score digital en este ciclo. No se conectan
APIs reales de redes sociales. No se generan reportes exportables. No
hay sistema de notificaciones push. Rabbit holes La máquina de estados
de publicaciones involucra 6 estados y múltiples actores. Se implementa
primero el flujo lineal completo (draft → review → approved → scheduled
→ published) y el loop de rechazo se integra después sobre esa base. El
matching de categorías entre el Cliente y los CMs disponibles puede
volverse complejo. Se implementa como ordenamiento por coincidencias; el
Cliente puede elegir cualquier CM sin restricción. Circuit breaker Si la
vista de calendario visual no está lista al cierre de la semana 7, se
entrega una lista tabular de publicaciones programadas ordenadas por
fecha. El flujo de aprobación no se puede recortar; es el entregable
central de este ciclo. Scopes Hill Chart Semana 4 \[■■■■■□□□□□\] Brands
service: CRUD y brand_profiles \[■■■□□□□□□□\] Campaigns service iniciado
\[■■□□□□□□□□\] MF Marcas: pantalla de creación

Semana 5 \[■■■■■■■■■■\] Brands service ✓ \[■■■■■■□□□□\] Campaigns
service: equipo y categorías \[■■■■■□□□□□\] Posts service iniciado
\[■■■■■□□□□□\] MF Marcas completo

Semana 6 \[■■■■■■■■■■\] Campaigns service ✓ \[■■■■■■■■□□\] Posts
service: flujo lineal completo \[■■■■■■□□□□\] MF Campañas: selección de
equipo \[■■■■□□□□□□\] MF Publicaciones iniciado

Semana 7 \[■■■■■■■■■■\] Posts service ✓ \[■■■■■■■■■■\] MF
Publicaciones + bandeja + calendario ✓ \[demo: flujo completo draft →
published con aprobación del Cliente\] Implementación --- módulo de
referencia Flujo completo de una publicación desde su creación como
borrador hasta que queda publicada, pasando por revisión interna del CM,
aprobación del Cliente y programación en el calendario. El rechazo
regresa la publicación al CM con motivo obligatorio. Cada transición
queda registrada en el historial de estados visible en la UI. 5. Ciclo 3
--- Semanas 8 a 10 Pitch\
Problema El flujo de contenido funciona pero el sistema no mide ni
evalúa nada. El diferenciador del producto frente a un gestor de tareas
común es el score digital y las métricas de presencia. Sin analítica el
sistema cumple solo la mitad de su propósito definido. Solución
Implementar el microservicio de métricas con simulación por cron job
usando curva de decaimiento temporal, el microservicio de score digital
con su fórmula de consistencia, engagement y frecuencia, el generador de
reportes exportables y los microfrontends de visualización. Appetite 3
semanas. Es el ciclo de cierre. No se extiende. No-gos No se conectan
APIs reales de redes sociales para obtener métricas reales. No se
implementan features avanzadas: generador de ideas con IA, comparación
entre redes, recomendaciones automáticas. No hay CI/CD automatizado.
Solo Docker Compose funcional es suficiente. Rabbit holes El cron job
puede generar un volumen de registros que crezca muy rápido. Se acota a
simular solo sobre las publicaciones publicadas en los últimos 7 días
por marca en cada corrida. La generación de PDF puede complicarse con
librerías de renderizado. Se entrega CSV primero como formato base; el
PDF se agrega solo si queda tiempo dentro del appetite. Circuit breaker
Si el score digital no está listo al cierre de la semana 10, se entrega
el dashboard de métricas individuales por publicación y el score se
documenta como trabajo futuro con su diseño técnico completo definido en
el repositorio. La documentación final no se puede recortar; es
obligatoria para la entrega. Scopes Hill Chart Semana 8 \[■■■■■■□□□□\]
Metrics service: cron job corriendo con datos simulados \[■■■□□□□□□□\]
Score service iniciado \[■■□□□□□□□□\] MF Métricas iniciado

Semana 9 \[■■■■■■■■■■\] Metrics service ✓ \[■■■■■■■■□□\] Score service:
cálculo y snapshot periódico \[■■■■■■□□□□\] Reports service: CSV
exportable \[■■■■■■□□□□\] MF Métricas: dashboard y gráficas

Semana 10 \[■■■■■■■■■■\] Score service ✓ \[■■■■■■■■■■\] Reports service
✓ \[■■■■■■■■■■\] MF Métricas y Score ✓ \[■■■■■■■■■■\] Documentación
final ✓ \[demo final: sistema completo end-to-end\] Implementación ---
módulo de referencia Dashboard de métricas por publicación con datos
simulados generados automáticamente, score digital de la marca con
tendencia histórica visible para el Cliente y el CM, y reporte
exportable en CSV descargable desde la interfaz. 6. Resumen de los 3
ciclos

Metodología Shape Up --- Gestor de Redes Sociales y Puntuación Digital.
Versión 1.0.
