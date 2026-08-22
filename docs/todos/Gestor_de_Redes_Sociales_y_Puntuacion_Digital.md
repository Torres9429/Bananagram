# Página 1

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
Gestor de Redes Sociales y Puntuación Digital

Equipo de desarrollo Adrian Uxue Chavez Martinez Estefany Alexa Delgado
Heredia Cristian Amauri Gonzaga Castañeda Rocio Rodríguez Torres Elias
Manuel Marquez Bailón Viridiana Portilla Palestina

Stack tecnológico: Next.js • NestJS • PostgreSQL Versión 1.0

Página 1 de 17

# Página 2

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
Tabla de contenidos Tabla de
contenidos......................................................................................................................................2 1.
Visión general del
sistema........................................................................................................................
4 1.1 Stack
tecnológico.............................................................................................................................
4 1.2 Objetivo
general...............................................................................................................................
4 2. Actores del
sistema...................................................................................................................................5
2.1
Administrador...................................................................................................................................
5
Responsabilidades...........................................................................................................................5
Restricciones...................................................................................................................................
5 2.2 Community Manager
(CM)...............................................................................................................
5
Responsabilidades...........................................................................................................................5
Particularidades...............................................................................................................................
5 2.3 Diseñador /
Editor.............................................................................................................................5
Responsabilidades...........................................................................................................................5
Restricciones...................................................................................................................................
6 2.4 Cliente / Marca /
Perfil......................................................................................................................
6
Responsabilidades...........................................................................................................................6
Particularidades...............................................................................................................................
6 3. Módulos del
sistema.................................................................................................................................
7 3.1 Publicaciones --- máquina de
estados.............................................................................................
7 3.2 Score digital ---
fórmula....................................................................................................................
7 3.3 Métricas
simuladas...........................................................................................................................8
4. Privilegios del
sistema..............................................................................................................................
9 4.1 Matriz de privilegios por
rol...............................................................................................................9
5. Catálogos del
sistema.............................................................................................................................10
5.1
Categorías......................................................................................................................................10
5.2
Especialidades...............................................................................................................................
10 5.3 Redes
sociales...............................................................................................................................
10 6. Flujos del
sistema...................................................................................................................................
11 6.1 Configuración inicial
(Administrador)..............................................................................................11
6.2 Onboarding del
Cliente...................................................................................................................11
6.3 Ciclo de vida de una
publicación....................................................................................................
11 6.4 Flujo de métricas y
score................................................................................................................11
7. Base de
datos.........................................................................................................................................12
7.1 Resumen de tablas por
dominio.....................................................................................................12
7.2 Campos de auditoría
base.............................................................................................................
12 7.3 Decisiones de diseño
clave............................................................................................................12
Soft
delete......................................................................................................................................12
RBAC a nivel de
campaña.............................................................................................................12
Un CM por
campaña......................................................................................................................12
Catálogo de categorías
compartido...............................................................................................12
Marca y
Perfil.................................................................................................................................
13 audit_log
centralizado....................................................................................................................13
Página 2 de 17

# Página 3

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
post_status_history vs
audit_log....................................................................................................13
8. Arquitectura del backend
(NestJS).........................................................................................................
14 8.1 Estructura de
módulos....................................................................................................................14
8.2 Interceptor de
auditoría..................................................................................................................
14 8.3 Cron job de
métricas......................................................................................................................
14 9. Estructura del frontend
(Next.js).............................................................................................................
15 10. Must have y features
avanzadas..........................................................................................................
16 10.1 Must have (entrega
base).............................................................................................................16
10.2 Features avanzadas
(extra)..........................................................................................................16
11. Consideraciones para el
equipo............................................................................................................17
11.1 Orden de desarrollo
recomendado...............................................................................................17
11.2 División sugerida del
equipo.........................................................................................................17
11.3 Reglas de negocio
críticas............................................................................................................17

Página 3 de 17

# Página 4

Gestor de Redes Sociales y Puntuación Digital --- Documento de
contexto 1. Visión general del sistema El sistema es una plataforma SaaS
de gestión de redes sociales orientada a marcas y personas que requieren
gestionar su presencia digital de forma organizada, medible y con flujos
de aprobación de contenido. Su propósito central es permitir que un
equipo formado por un Community Manager y uno o más Diseñadores trabajen
coordinadamente bajo la supervisión de un Cliente, produciendo
publicaciones aprobadas, organizadas en campañas, con métricas de
rendimiento y una puntuación digital que refleje la salud de la
presencia en redes.

1.1 Stack tecnológico Capa Tecnología Frontend Next.js + React Backend
NestJS Base de datos PostgreSQL

1.2 Objetivo general Gestionar publicaciones, campañas, calendario de
contenidos, métricas y puntuación digital de una marca o persona. Página
4 de 17

# Página 5

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
2. Actores del sistema El sistema reconoce cuatro tipos de usuario con
responsabilidades y accesos distintos.

2.1 Administrador Opera a nivel de sistema. No pertenece a ninguna
marca. Responsabilidades •​ Registrar y gestionar usuarios internos
(Community Managers y Diseñadores). •​ Asignar roles a los usuarios que
registra. •​ Mantener los catálogos del sistema: redes sociales,
categorías y especialidades. •​ Gestionar los privilegios asociados a
cada rol. •​ Acceder al log de auditoría completo. Restricciones •​ No
registra Clientes ni marcas. El Cliente se auto-registra. •​ No participa
en el flujo de contenido.

2.2 Community Manager (CM) Actor operativo principal del flujo de
contenido. Registrado por el Administrador y seleccionado por el Cliente
para trabajar en sus campañas. Responsabilidades •​ Completar su perfil
con categorías y especialidades técnicas. •​ Ser seleccionado por un
Cliente para liderar una campaña. •​ Crear borradores de publicaciones
para las redes de la marca. •​ Seleccionar Diseñadores para apoyar en la
campaña. •​ Programar publicaciones en el calendario. •​ Publicar
contenido aprobado. •​ Consultar métricas y score digital de las marcas
que gestiona. Particularidades •​ Puede pertenecer al equipo de múltiples
campañas activas simultáneamente, sin límite. •​ Su visibilidad ante los
Clientes incluye sus categorías y especialidades para facilitar el
match.

2.3 Diseñador / Editor Colaborador creativo. Registrado por el
Administrador y seleccionado por el CM dentro de una campaña.
Responsabilidades •​ Completar su perfil con categorías y especialidades
técnicas. •​ Crear borradores de publicaciones (contenido visual y copy).
•​ Proponer contenido que el CM puede revisar antes de enviar a
aprobación. Página 5 de 17

# Página 6

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
Restricciones •​ No puede programar ni publicar. Su alcance termina en la
creación de contenido. •​ Puede estar en múltiples campañas activas
simultáneamente.

2.4 Cliente / Marca / Perfil Quien contrata el servicio de gestión. Se
auto-registra y es dueño de su marca o perfil. Responsabilidades •​
Registrarse por su cuenta, sin intervención del Administrador. •​ Crear
su marca o perfil en el sistema. •​ Seleccionar las redes sociales que
desea gestionar. •​ Seleccionar al Community Manager con quien desea
trabajar. •​ Aprobar o rechazar publicaciones antes de que se publiquen.
•​ Consultar métricas, score digital y reportes de sus campañas.
Particularidades •​ Marca y Perfil son funcionalmente idénticos. La
distinción es visual, no funcional. •​ Solo puede seleccionar un CM por
campaña. •​ El CM que selecciona luego escoge a los Diseñadores que lo
apoyarán. Página 6 de 17

# Página 7

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
3. Módulos del sistema Módulo Descripción Marcas / Perfiles Cuentas o
negocios gestionados. Cada marca tiene perfiles en distintas redes.
Publicaciones Contenido por red social. Núcleo del sistema con máquina
de estados. Calendario Programación de publicaciones. Vista drag & drop
por red y estado. Campañas Agrupan publicaciones por objetivo de negocio
con equipo asignado. Métricas Likes, comentarios, alcance simulado por
cron job. Score digital Evaluación de presencia digital basada en
consistencia, engagement y frecuencia. Reportes Desempeño por campaña o
red. Exportable en PDF y CSV.

3.1 Publicaciones --- máquina de estados Cada publicación avanza a
través de los siguientes estados: Estado Significado draft Borrador. CM
o Diseñador lo está trabajando. review Enviado a revisión interna del
CM. approved El Cliente lo aprobó. Listo para programar. rejected El
Cliente lo rechazó. Regresa al CM con comentarios. scheduled Tiene fecha
y hora asignada en el calendario. published Ya fue publicado (manual o
automático).

Flujo visual de estados: DRAFT → REVIEW → APPROVED → SCHEDULED →
PUBLISHED ↘ REJECTED → (vuelve a DRAFT)

3.2 Score digital --- fórmula El score se calcula por marca y período
como snapshot semanal o mensual. Score = (Consistencia × 0.30) +
(Engagement × 0.40) + (Frecuencia × 0.30)

Componente Cálculo Consistencia Publicaciones en horarios pico / total
publicaciones Engagement (likes + comentarios + shares) / alcance total
Página 7 de 17

# Página 8

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
Frecuencia Publicaciones realizadas en el período / meta de
publicaciones

3.3 Métricas simuladas Las métricas se generan mediante un cron job en
NestJS con curva de decaimiento temporal. likes = followers ×
base_engagement_rate × e\^(-hoursOld/48) × random\[0.8--1.2\] El
parámetro base_engagement_rate se configura por red social en el
catálogo del sistema. Página 8 de 17

# Página 9

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
4. Privilegios del sistema Los privilegios son dinámicos y están
asignados a roles. El Administrador puede modificar qué privilegios
tiene cada rol en cualquier momento.

Código Nombre Módulo users:manage Gestionar usuarios y roles
Configuración brands:manage Configurar marcas y perfiles Marcas
catalogs:manage Gestionar catálogos del sistema Configuración
post:create Crear publicación Publicaciones post:schedule Programar
publicación Calendario post:approve Aprobar publicación Aprobación
post:reject Rechazar publicación Aprobación post:publish Publicar
contenido Publicaciones campaigns:manage Gestionar campañas Campañas
metrics:view Ver métricas Métricas score:view Ver score digital Score
reports:export Exportar reporte Reportes

4.1 Matriz de privilegios por rol Privilegio Admin CM Diseñador Cliente
Gestionar usuarios y roles ✓ --- --- --- Configurar marcas y perfiles ✓
--- --- --- Gestionar catálogos ✓ --- --- --- Crear publicación ✓ ✓ ✓
--- Programar publicación ✓ ✓ --- --- Aprobar publicación ✓ --- --- ✓
Rechazar publicación ✓ --- --- ✓ Publicar contenido ✓ ✓ --- ---
Gestionar campañas ✓ ✓ --- --- Ver métricas ✓ ✓ --- ✓ Ver score digital
✓ ✓ --- ✓ Exportar reporte ✓ --- --- ✓ Página 9 de 17

# Página 10

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
5. Catálogos del sistema Los catálogos son datos base gestionados
exclusivamente por el Administrador.

5.1 Categorías Áreas temáticas que clasifican a los usuarios operativos
(CM y Diseñador) y a las campañas. Son el eje del sistema de matching.
El mismo catálogo aplica para ambos contextos. Si una campaña es de
categoría "Medicina" y un CM tiene esa misma categoría, el sistema lo
destaca como coincidencia. Ejemplos: Medicina, Veterinaria, Moda y
belleza, Tecnología, Gastronomía, Fitness, Educación, Entretenimiento.

5.2 Especialidades Habilidades técnicas exclusivas de CM y Diseñadores.
No aplican a campañas. Ejemplos: Creación de videos, Diseño de imágenes,
Diseño de posters, Redacción de copy, Animación, Fotografía, Gestión de
comunidad, Estrategia de contenido.

5.3 Redes sociales Catálogo de plataformas disponibles para gestionar.
Cada red tiene un engagement_rate base usado en la simulación de
métricas. Red social Código Engagement rate base Instagram instagram
3.50% TikTok tiktok 5.00% LinkedIn linkedin 2.50% Facebook facebook
1.50% X x 2.00% YouTube youtube 1.80% Página 10 de 17

# Página 11

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
6. Flujos del sistema 6.1 Configuración inicial (Administrador) 1.​
Administrador accede al sistema. 2.​ Configura los catálogos: agrega
redes sociales, categorías y especialidades. 3.​ Registra usuarios
operativos: crea al CM y al Diseñador, asigna sus roles. 4.​ Los usuarios
operativos completan su perfil seleccionando categorías y
especialidades.

6.2 Onboarding del Cliente 5.​ Cliente se auto-registra en la plataforma
(sin intervención del Admin). 6.​ Crea su marca o perfil. 7.​ Selecciona
las redes sociales que desea gestionar → se crean brand_profiles. 8.​ Ve
el listado de CMs disponibles. El sistema muestra coincidencias de
categorías primero, pero el Cliente puede elegir libremente. Solo puede
seleccionar un CM por campaña. 9.​ El CM seleccionado ve el listado de
Diseñadores disponibles y escoge uno o más. 10.​ El equipo queda
registrado en campaign_team. La campaña está lista para operar.

6.3 Ciclo de vida de una publicación 11.​ CM o Diseñador crea la
publicación (estado: DRAFT). Selecciona brand_profile, redacta contenido
y puede asociarla a una campaña. 12.​ CM revisa internamente y envía a
revisión (estado: REVIEW). 13.​ CM envía a aprobación del Cliente. El
Cliente recibe notificación. 14.​ Rama A --- Cliente APRUEBA: la
publicación pasa a APPROVED. El CM asigna fecha en calendario
(SCHEDULED). El sistema publica automáticamente o el CM lo hace
manualmente (PUBLISHED). El cron job comienza a simular métricas. 15.​
Rama B --- Cliente RECHAZA: la publicación vuelve a DRAFT con motivo de
rechazo. El CM recibe notificación y corrige. El ciclo reinicia desde el
paso 1. Cada transición queda registrada en post_status_history con el
actor, la fecha y notas opcionales.

6.4 Flujo de métricas y score 16.​ Una publicación pasa a estado
PUBLISHED. 17.​ El cron job (NestJS @Scheduler) corre cada 6 horas para
publicaciones recientes. 18.​ Para cada publicación: calcula métricas con
curva de decaimiento y guarda snapshot en post_metrics. 19.​ Semanalmente
se calcula el digital_score de cada marca activa y se guarda en
digital_scores. 20.​ CM y Cliente pueden ver métricas individuales,
comparativa por red y score con tendencia histórica. 21.​ Cliente o Admin
exporta reporte (PDF o CSV). Página 11 de 17

# Página 12

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
7. Base de datos 18 tablas en Tercera Forma Normal (3FN). Motor:
PostgreSQL.

7.1 Resumen de tablas por dominio Dominio Tablas Identidad y acceso
users, roles, privileges, role_privileges Catálogos categories,
specialties, social_networks Pivotes de usuario user_categories,
user_specialties Marcas brands, brand_profiles Contenido campaigns,
campaign_categories, campaign_team, posts, post_status_history Analítica
post_metrics, digital_scores, reports Auditoría audit_log

7.2 Campos de auditoría base Presentes en todas las tablas principales.
Las tablas de log son inmutables y no los tienen. created_at DATETIME
NOT NULL DEFAULT CURRENT_TIMESTAMP updated_at\
DATETIME\
NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at DATETIME NULL -- soft delete created_by CHAR(36) NULL FK →
users.id updated_by CHAR(36) NULL FK → users.id

7.3 Decisiones de diseño clave Soft delete El campo deleted_at reemplaza
el DELETE físico. En NestJS se usa @DeleteDateColumn() de TypeORM. Nunca
se borran registros reales de posts, brands o users. RBAC a nivel de
campaña El equipo de trabajo vive en campaign_team, no en una tabla de
marca. Esto permite saber exactamente quién trabajó en qué campaña. Un
CM puede estar en múltiples campañas activas simultáneamente sin límite
de base de datos. Un CM por campaña La restricción de "solo un CM por
campaña" es de negocio, no de base de datos. Se implementa en el
servicio NestJS validando que no exista ya un registro con role_id = CM
para la campaign_id antes de insertar. Catálogo de categorías compartido
Página 12 de 17

# Página 13

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
El catálogo categories es único y aplica tanto a usuarios como a
campañas. Esto permite cruzar información para el sistema de matching.
Marca y Perfil Son la misma entidad brands. El campo type
ENUM("brand","profile") distingue la etiqueta visual, pero ambos operan
exactamente igual en todo el sistema. audit_log centralizado Es la única
tabla con PK BIGINT AUTO_INCREMENT (en lugar de CHAR(36)) porque crece
mucho. Es inmutable: sin updated_at, sin deleted_at, sin métodos de
modificación expuestos en el repositorio. post_status_history vs
audit_log Coexisten con propósitos distintos. post_status_history es el
flujo de negocio del post (visible en la UI). audit_log es trazabilidad
técnica de cualquier cambio en cualquier tabla (solo Admin). Página 13
de 17

# Página 14

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
8. Arquitectura del backend (NestJS) 8.1 Estructura de módulos Módulo
Responsabilidad auth/ JWT, guards, estrategias de autenticación users/
CRUD de usuarios roles/ + privileges/ CRUD de roles y privilegios
categories/ + specialties/ CRUD de catálogos de categorías y
especialidades social-networks/ CRUD de catálogo de redes sociales
brands/ + brand-profiles/ CRUD de marcas y perfiles por red campaigns/
CRUD de campañas + gestión de equipo posts/ Publicaciones + máquina de
estados calendar/ Vista agregada de posts programados metrics/ Motor de
simulación de engagement score/ Calculador de score digital reports/
Generador PDF/CSV notifications/ Avisos de aprobación pendiente audit/
Interceptor global de auditoría

8.2 Interceptor de auditoría El AuditInterceptor debe ser un interceptor
global registrado en AppModule. Captura automáticamente el estado antes
y después de cada mutación (POST, PUT, PATCH, DELETE) y escribe en
audit_log. Ningún servicio individual necesita conocer su existencia.
8.3 Cron job de métricas Usar @nestjs/schedule con @Cron(). Corre cada 6
horas para publicaciones recientes y cada 24 horas para el resto. El
score digital se recalcula semanalmente. Página 14 de 17

# Página 15

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
9. Estructura del frontend (Next.js) Ruta Descripción /auth/login Inicio
de sesión /auth/register Auto-registro --- solo para Clientes /dashboard
Resumen general /brands Mis marcas /brands/\[id\]/calendar Calendario de
publicaciones (FullCalendar) /brands/\[id\]/campaigns/\[id\]/team Equipo
de la campaña /brands/\[id\]/campaigns/\[id\]/posts Publicaciones de la
campaña /brands/\[id\]/metrics Métricas globales de la marca
/brands/\[id\]/score Score digital e historial /brands/\[id\]/reports
Exportar informes /approvals Bandeja de aprobaciones (Clientes)
/my-campaigns Campañas activas (CM y Diseñador) /admin/users Gestión de
usuarios /admin/roles Roles y privilegios /admin/catalogs/\* Catálogos:
categorías, especialidades, redes /admin/audit-log Log de auditoría
Página 15 de 17

# Página 16

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
10. Must have y features avanzadas 10.1 Must have (entrega base) •​
Gestión de marcas y perfiles. •​ Selección de redes sociales a gestionar.
•​ Catálogo de CMs con categorías y especialidades para matching. •​
Campañas con equipo asignado por campaña. •​ Flujo de aprobación completo
con historial de estados. •​ Calendario de publicaciones. •​ Métricas
simuladas con cron job y curva de decaimiento. •​ Puntuación digital con
fórmula de consistencia, engagement y frecuencia. •​ Reportes exportables
en PDF y CSV.

10.2 Features avanzadas (extra) •​ Recomendaciones de mejora: sugerencias
automáticas basadas en el score. •​ Comparación entre redes: gráfica de
desempeño comparando redes para la misma marca. •​ Generador de ideas de
contenido: usando IA (Claude API) sugerencias basadas en la categoría de
campaña e historial. •​ Score desagregado: mostrar por separado
consistencia, engagement y frecuencia con su tendencia individual.
Página 16 de 17

# Página 17

Gestor de Redes Sociales y Puntuación Digital --- Documento de contexto
11. Consideraciones para el equipo 11.1 Orden de desarrollo recomendado
22.​ Auth + guards (JWT, RBAC básico). 23.​ Catálogos base (roles,
privilegios, redes, categorías, especialidades). 24.​ Usuarios + perfiles
de CM y Diseñador. 25.​ Auto-registro de Cliente + creación de marca. 26.​
Brand profiles (marca + red social). 27.​ Campañas + equipo
(campaign_team). 28.​ Publicaciones + máquina de estados. 29.​ Calendario.
30.​ Motor de métricas simuladas (cron job). 31.​ Score digital. 32.​
Reportes. 33.​ Features avanzadas.

11.2 División sugerida del equipo Personas Área de trabajo 2 personas
NestJS: auth, usuarios, catálogos, campañas, posts 2 personas Next.js:
dashboard, calendario, aprobaciones, métricas 1 persona NestJS: métricas
simuladas, score digital, reportes 1 persona Base de datos,
integraciones, QA, documentación

11.3 Reglas de negocio críticas •​ Un CM puede estar en múltiples
campañas activas al mismo tiempo, sin límite. •​ Un Cliente solo puede
seleccionar un CM por campaña. •​ El CM selecciona a los Diseñadores
dentro de su campaña. •​ Las publicaciones rechazadas regresan a DRAFT
con motivo de rechazo obligatorio. •​ El audit_log y el
post_status_history son inmutables. Nunca se modifican ni borran. •​ El
RBAC es dinámico. Los privilegios se asignan a roles, los roles a
usuarios. No hay lógica hardcodeada. •​ El soft delete aplica a todas las
tablas principales. Los registros nunca se borran físicamente. •​ El
matching de categorías es orientativo, no restrictivo. El Cliente puede
elegir cualquier CM. •​ Marca y Perfil son funcionalmente idénticos. No
tienen comportamiento diferenciado en el sistema. •​ El catálogo de redes
sociales lo gestiona el Administrador. Añadir una red nueva es un
INSERT, no un deploy. Página 17 de 17
