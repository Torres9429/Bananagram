# Especificación funcional — Roles del sistema
## Gestor de Redes Sociales y Puntuación Digital

**Versión:** borrador 1 (consolida Administrador, Cliente, Community Manager y Diseñador)
**Estado:** Base para maquetación frontend con mocks. Pendiente: Campañas, Publicaciones, Flujo de aprobación, Calendario, Métricas, Score, Reportes, Auditoría (sesiones siguientes).
**Alcance:** Frontend funciona 100% con datos simulados. Ningún flujo aquí depende de un backend real todavía.

---

## 1. Administrador

### 1.1 Objetivo del rol
Gestionar el sistema de forma centralizada: usuarios operativos, privilegios por rol, catálogos base y auditoría. Tiene acceso total y no pertenece a ninguna marca.

### 1.2 Flujo principal
Login (formulario compartido con todos los roles) → Dashboard de Administrador → Crear/gestionar usuarios operativos (CM/Diseñador) y asignarles rol → mantener catálogos y privilegios → consultar auditoría.

### 1.3 Flujo de primer ingreso
La cuenta de Administrador **no se crea por registro público** — se asume seed/provisión manual en base de datos (consistente con "seed de demo" del plan de sprints). Al primer login, el sistema ya tiene los catálogos (redes sociales, categorías, especialidades) sembrados, pero cero usuarios operativos y cero actividad.

### 1.4 Dashboard
Vista centralizada de gestión. Estado inicial: catálogos listos, contador de usuarios en cero. Conforme se crean usuarios, el dashboard refleja el conteo actualizado (activos / pendientes de activación).

### 1.5 Módulos a los que tiene acceso
Usuarios, Privilegios, Catálogos (redes, categorías, especialidades), Auditoría. Acceso transversal de lectura a Marcas, Campañas, Publicaciones, Métricas, Score y Reportes de **todas** las marcas (no tiene marca propia, pero supervisa todas).

### 1.6 Acciones permitidas
- Crear usuarios operativos (CM/Diseñador) y asignarles rol.
- Gestionar privilegios por rol.
- CRUD completo de catálogos del sistema.
- Cambiar la disponibilidad de un CM o Diseñador.
- Ver el log de auditoría completo.
- Ver reportes de todas las marcas.

### 1.7 Acciones restringidas
- No se auto-registra.
- No registra Clientes ni marcas (el Cliente se auto-registra).
- No participa en el flujo de contenido (no crea, revisa ni aprueba publicaciones).

### 1.8 Pantallas necesarias
1. Login (compartido)
2. Dashboard de Administrador
3. Listado de usuarios
4. Formulario "Crear usuario"
5. Confirmación de invitación enviada

> Nota: Catálogos, Privilegios y Auditoría como módulos propios no se detallaron pantalla por pantalla en esta sesión — se avanzó priorizando velocidad. Quedan pendientes de una pasada de detalle si se requiere antes de maquetar.

### 1.9 Estados vacíos
- Dashboard sin usuarios (solo catálogos sembrados).
- Listado de usuarios vacío.

### 1.10 Estados especiales
No aplica — "perfil incompleto" y "disponibilidad" son conceptos exclusivos de CM/Diseñador.

### 1.11 Componentes reutilizables que utiliza
WidgetCard, EmptyState.

### 1.12 Entidades que consume (mocks)
`users`, `roles`, `privileges`, `social_networks`, `categories`, `specialties`, `audit_log`.

### 1.13 Permisos requeridos
`users:manage`, `catalogs:manage` (acciones ver/crear/editar/eliminar/configurar/asignar sobre los módulos Usuarios, Privilegios, Catálogos).

### 1.14 Relaciones con los demás roles
Crea las cuentas de CM y Diseñador vía invitación por correo. Puede cambiar la disponibilidad de CM y Diseñador. No interactúa directamente con el Cliente (auto-registro). Tiene visibilidad total sobre reportes y auditoría de todos los roles.

---

## 2. Cliente

### 2.1 Objetivo del rol
Registrarse, configurar su marca y conseguir un equipo (CM + Diseñadores) operativo para producir contenido aprobable.

### 2.2 Flujo principal
Login (compartido) → Dashboard agregador multi-marca con campañas activas, score, métricas y aprobaciones pendientes.

### 2.3 Flujo de primer ingreso (onboarding)
Registro (`/auth/register`, ruta exclusiva de Cliente, pública) → Crear marca (tipo brand/profile) → Seleccionar redes sociales (genera `brand_profiles`) → Crear campaña (nombre, categoría, datos básicos) → Seleccionar Community Manager (listado ordenado por coincidencia de categoría, elección libre, **asignación directa e inmediata, sin aceptación del CM**) → se crea `campaign_team` con el CM → Confirmación → Dashboard.

**Reingreso con onboarding incompleto:** el sistema infiere el paso exacto donde quedó (según qué entidades existen: ¿tiene `brand`? ¿`brand_profiles`? ¿`campaign`?) y lo regresa automáticamente al wizard en ese paso, sin pasar por el dashboard.

### 2.4 Dashboard
Agregador multi-marca (un Cliente puede tener más de una marca — supuesto tomado por precedente de las rutas `/brands/[id]/...`, ver inconsistencias). Es un **centro de resumen y acceso rápido, no una pantalla de trabajo**: los widgets muestran información resumida y dirigen al módulo especializado. Solo permite acciones directas cuando son simples y sin contexto previo (crear campaña, exportar reporte); aprobar/rechazar publicaciones siempre se hace en su módulo correspondiente.

**Widgets:** Publicaciones pendientes de aprobación · Score digital de la marca · Métricas de las últimas 24h · Campañas activas · Estado del equipo de campaña.

**Estado sin campañas activas:**
- *Nunca completó el onboarding* → se le regresa al wizard automáticamente, no ve el dashboard.
- *Ya es Cliente operativo, pero todas sus campañas terminaron* → ve el dashboard normal con estado vacío en "Campañas activas" + CTA "Crear nueva campaña" + enlace a campañas anteriores. Los widgets de Score y Métricas siguen mostrando datos históricos de la marca (no dependen de campaña activa).

### 2.5 Módulos a los que tiene acceso
Marcas (propias), Campañas (propias), Publicaciones (aprobación), Calendario, Métricas, Score, Reportes (exportación).

### 2.6 Acciones permitidas
- Crear marca y perfiles, seleccionar redes.
- Crear campañas.
- Seleccionar CM (un único CM por campaña, sin restricción de categoría).
- Aprobar / rechazar publicaciones (en su módulo, no desde el dashboard).
- Ver métricas, score y reportes de sus marcas.
- Exportar reportes.

### 2.7 Acciones restringidas
- No registra usuarios operativos — los selecciona, no los crea.
- Solo un CM por campaña.
- No participa en la selección de Diseñadores (la hace el CM).
- No crea publicaciones.

### 2.8 Pantallas necesarias
1. Registro
2. Onboarding — Crear marca
3. Onboarding — Seleccionar redes
4. Onboarding — Crear campaña
5. Onboarding — Seleccionar CM
6. Onboarding — Confirmación
7. Dashboard (campaña activa, equipo completo)
8. Dashboard (campaña activa, equipo incompleto)
9. Dashboard (sin campañas activas)
10. Listado de marcas (si tiene más de una)
11. Listado de campañas anteriores

### 2.9 Estados vacíos
- Sin campañas activas (con CTA).
- Score/Métricas sin datos si la marca nunca tuvo publicaciones.
- "Campaña activa sin publicaciones" (compartido con CM) en la vista de publicaciones de campaña.

### 2.10 Estados especiales
Campaña con "equipo incompleto" (CM asignado, sin Diseñadores aún) — indicador informativo no bloqueante.

### 2.11 Componentes reutilizables que utiliza
Stepper/Wizard, WidgetCard, EmptyState, Selector con tarjetas (CM), Badge de estado (activa / incompleta / finalizada).

### 2.12 Entidades que consume (mocks)
`brands`, `brand_profiles`, `campaigns`, `campaign_team`, `posts` (para aprobaciones), `post_metrics`, `digital_scores`, `reports`.

### 2.13 Permisos requeridos
`post:approve`, `post:reject`, `metrics:view`, `score:view`, `reports:export`, más acceso de lectura/propietario sobre campañas propias (ver inconsistencia #3).

### 2.14 Relaciones con los demás roles
Selecciona al CM (asignación directa, sin aceptación). No interactúa directamente con Diseñadores. Depende del Admin solo indirectamente (catálogos usados para categorizar la campaña).

---

## 3. Community Manager

### 3.1 Objetivo del rol
Coordinar el flujo de contenido de las campañas donde participa: revisar/crear borradores, armar su equipo de Diseñadores, programar y publicar contenido aprobado.

### 3.2 Flujo principal
Activación → Dashboard inmediato (sin wizard forzado) → gestión de campañas asignadas (equipo, publicaciones) → dashboard recurrente con conteos agregados de **todas** sus campañas (sin límite de campañas simultáneas).

### 3.3 Flujo de primer ingreso
Cuenta creada por el Admin → correo de activación (`/auth/activate`) → define contraseña → accede de inmediato al sistema.

`perfil_completo = false` por defecto → no aparece en el matching del Cliente, no puede ser asignado a campañas nuevas, ve un banner persistente, pero puede usar el resto de la app según sus permisos.

Al completar categorías y especialidades → `perfil_completo = true`, `disponibilidad = Disponible` por defecto (campo independiente, editable después sin afectar `perfil_completo`).

### 3.4 Dashboard
Solo conteos agregados — no es centro de trabajo. **Widgets:** Publicaciones pendientes de mi atención (propias + de mi equipo en revisión, conteo agregado con enlace al módulo de Publicaciones) · Score digital · Métricas 24h · Campañas activas · Próximas publicaciones programadas · Estado del equipo por campaña.

Puede iniciar sesión y ver su dashboard aunque no tenga ninguna campaña asignada todavía.

### 3.5 Módulos a los que tiene acceso
Mis campañas, Equipo de campaña (gestión completa), Publicaciones (crear, revisar, programar, publicar), Calendario, Métricas, Score. **No tiene Reportes.**

### 3.6 Acciones permitidas
- Completar/editar su perfil profesional (foto, nombre, descripción profesional, categorías, especialidades, disponibilidad).
- Cambiar su propia disponibilidad.
- Crear publicaciones; revisar publicaciones de su equipo; programar y publicar contenido aprobado.
- Agregar y quitar Diseñadores de sus campañas **en cualquier momento, sin requerir aceptación del Diseñador**.
- Ver el perfil de los integrantes de su equipo.

### 3.7 Acciones restringidas
- No aprueba ni rechaza publicaciones (es del Cliente).
- No exporta reportes.
- Quitar un Diseñador no lo elimina del sistema ni afecta sus otras campañas.

### 3.8 Pantallas necesarias
1. Activación de cuenta
2. Completar/editar perfil
3. Dashboard (sin campañas / equipo incompleto / equipo completo)
4. Mis campañas (`/my-campaigns`)
5. Equipo de campaña (ver CM, ver Diseñadores, agregar, quitar, ver perfil de cada integrante)
6. Publicaciones de campaña (con estado vacío "Aún no hay publicaciones para esta campaña" + CTA "Crear primera publicación")

### 3.9 Estados vacíos
Dashboard sin campañas asignadas; campaña sin Diseñadores; campaña sin publicaciones.

### 3.10 Estados especiales
- `perfil_completo`: incompleto / completo (campo independiente).
- `disponibilidad`: Disponible / No disponible (campo independiente, por defecto Disponible, editable por el propio CM o el Admin; no afecta campañas ya asignadas, solo nuevas asignaciones).

### 3.11 Componentes reutilizables que utiliza
ProfileCompletenessBadge, AvailabilityToggle, ProfileCard/ProfileView, WidgetCard, EmptyState, Selector con tarjetas (Diseñadores), TeamMemberRow, Badge de estado.

### 3.12 Entidades que consume (mocks)
`users` (perfil propio y de su equipo), `campaigns`, `campaign_team`, `posts`, `post_status_history`, `post_metrics`, `digital_scores`.

### 3.13 Permisos requeridos
`post:create`, `post:schedule`, `post:publish`, `campaigns:manage`, `metrics:view`, `score:view`.

### 3.14 Relaciones con los demás roles
Es seleccionado por el Cliente (sin aceptar/rechazar). Selecciona y gestiona a sus Diseñadores (sin que estos acepten/rechacen). Es creado por el Admin, quien también puede cambiar su disponibilidad.

---

## 4. Diseñador

### 4.1 Objetivo del rol
Proponer contenido (borradores) dentro de las campañas a las que es asignado.

### 4.2 Flujo principal
Activación → Dashboard inmediato → esperar ser seleccionado por un CM → crear publicaciones en borrador dentro de las campañas asignadas.

### 4.3 Flujo de primer ingreso
Idéntico al de CM: cuenta creada por el Admin, activación vía correo, `perfil_completo = false` por defecto (no aparece en el matching del CM hasta completar categorías/especialidades). Al completarlo, `disponibilidad = Disponible` por defecto, editable manualmente (por el propio Diseñador o el Admin) sin afectar las campañas ya asignadas.

El CM ve en su listado de candidatos solo a Diseñadores con `perfil_completo = true` **y** `disponibilidad = Disponible`.

### 4.4 Dashboard
El más reducido del sistema (solo tiene el privilegio `post:create`). **Widgets:** Mis borradores y rechazadas · acceso rápido a Mis campañas.

### 4.5 Módulos a los que tiene acceso
Mis campañas (lectura), Publicaciones (solo creación de borradores).

### 4.6 Acciones permitidas
- Completar/editar su perfil.
- Cambiar su propia disponibilidad.
- Crear publicaciones (contenido visual y copy) en borrador dentro de campañas donde participa.

### 4.7 Acciones restringidas
- No programa ni publica contenido.
- No aprueba ni rechaza nada.
- No gestiona campañas ni equipo.
- No ve métricas, score ni reportes.
- No acepta ni rechaza su propia asignación a una campaña — el CM lo agrega/quita unilateralmente.

### 4.8 Pantallas necesarias
1. Activación de cuenta (reutilizada de CM)
2. Completar/editar perfil (reutilizada de CM)
3. Dashboard (sin campañas / con campañas sin publicaciones propias / con campañas y publicaciones)
4. Mis campañas (reutilizada de CM)

### 4.9 Estados vacíos
Dashboard sin campañas asignadas; sin publicaciones propias creadas aún.

### 4.10 Estados especiales
`perfil_completo` y `disponibilidad` — idéntico modelo a CM.

### 4.11 Componentes reutilizables que utiliza
Ninguno nuevo — 100% reutilizados de CM (ProfileCompletenessBadge, AvailabilityToggle, ProfileCard, WidgetCard, EmptyState).

### 4.12 Entidades que consume (mocks)
`users` (perfil propio), `campaigns`, `campaign_team`, `posts` (propios).

### 4.13 Permisos requeridos
`post:create`.

### 4.14 Relaciones con los demás roles
Es seleccionado y removido unilateralmente por el CM. Es creado por el Admin, quien también puede cambiar su disponibilidad. Su contenido es revisado por el CM antes de pasar al Cliente para aprobación (mecanismo que vive en el módulo de Publicaciones, no en el dashboard).

---

## 5. Posibles inconsistencias detectadas

Comparando este documento contra el documento funcional original, la arquitectura/instrucciones actuales del proyecto y `nuevas-features.md`:

1. **Motor de base de datos.** El documento de contexto original y el Shape Up describen PostgreSQL (migración obligatoria desde MySQL por requisito del profesor). Las instrucciones actuales de este proyecto especifican MySQL en AWS RDS. No afecta los flujos funcionales definidos aquí, pero es una contradicción de fuente que debería resolverse antes de tocar backend.

2. **Número de microservicios y notificaciones.** Las instrucciones actuales listan 9 microservicios, incluyendo `notifications-service` y `ai-service`. En el historial del proyecto se registró una consolidación a 4 microservicios, con esos dos eliminados/diferidos. Esto es relevante porque varios flujos que acabamos de definir (correo de activación del CM/Diseñador, correo de invitación, aviso de aprobación pendiente al Cliente) dependen de un sistema de envío de correo/notificaciones. Vale la pena decidir explícitamente si esos correos quedan como simulados (mock puro, sin lógica de envío real) mientras no se resuelva esta contradicción.

3. **Privilegio de campañas para Cliente.** La matriz de privilegios original no le da `campaigns:manage` al Cliente (solo a Admin y CM), pero el Cliente sí necesita ver y crear campañas propias, y la feature F2 (dashboard por widgets) asume que el Cliente tiene acceso al widget "Campañas activas" bajo ese mismo privilegio. Falta una variante de privilegio de solo lectura/propietario para Cliente sobre sus propias campañas, distinta de la gestión amplia que tiene el CM.

4. **Paso "Esperar aceptación" del CM.** La plantilla de instrucciones original de este ejercicio incluía un paso de aceptación tras seleccionar CM; el documento de contexto del proyecto no lo contempla (asignación directa). Ya resuelto explícitamente contigo: para el MVP es asignación directa sin aceptación; la pantalla de "pendiente de aceptación" queda señalada como mejora futura, sin construir todavía.

5. **Expiración del token de activación.** Quedó pendiente sin definir (diferido explícitamente). No bloquea el frontend, pero falta una pantalla de "enlace expirado" que hoy no está en la lista de pantallas de ningún rol.

6. **Correo duplicado al crear usuario (Admin).** También quedó diferido sin definir — no hay pantalla de error para ese caso todavía.

7. **Multi-marca por Cliente.** Se asumió, por precedente de las rutas `/brands/[id]/...` ya documentadas, que un Cliente puede tener más de una marca. Esto no fue confirmado explícitamente — está señalado como supuesto, no como decisión validada.

8. **Color de campaña (F4).** La feature de navegación bidireccional campaña↔publicación define un campo `color` (hex) por campaña, asignado al crearla. No se incluyó en el flujo de "crear campaña" del Cliente definido aquí — falta decidir si se agrega en esta fase o se deja para cuando se maquete esa pantalla con más detalle visual.

9. **Arquitectura de microfrontends.** Las instrucciones actuales mencionan "SOFEA + Microfrontends" de forma genérica. El historial del proyecto documenta una decisión específica de usar Next.js Multi-zones (por incompatibilidad de Module Federation con App Router). No afecta los flujos funcionales, pero importa si en algún momento se discuten dominios/puertos por microfrontend.

10. **Campos extendidos de perfil en Diseñador.** El perfil ampliado (foto, descripción profesional, etc.) se definió explícitamente solo para CM. Se asumió por simetría que aplica igual a Diseñador, dado que ambos comparten el mismo mecanismo de categorías/especialidades — pero no fue confirmado explícitamente para Diseñador.

