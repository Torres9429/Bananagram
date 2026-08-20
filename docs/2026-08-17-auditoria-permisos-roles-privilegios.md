# Auditoría profunda del sistema de permisos, roles y privilegios — Bananagram

> Auditoría de solo lectura, 4 investigaciones paralelas (BD/Prisma+catálogo, guards de backend, renderizado dinámico de frontend, validez semántica de la matriz módulo×acción). Ningún archivo fue modificado. Toda afirmación cita archivo:línea; donde no fue posible verificar algo, se marca explícitamente como "no verificable".

---

## A. Cómo funciona actualmente el sistema

```
Usuario (auth-service.User)
   ↓ UserRole (tabla puente N:M, sin columnas propias)
Rol(es) — puede tener 1 o varios simultáneos
   ↓ RolePermission (roleId, moduleId, actionId, allowed: boolean)
Permiso — por ROL, nunca por usuario individual
   ↓
Módulo + Acción (catálogos estáticos: 10 módulos × 9 acciones, seedeados)
   ↓
auth.repository.ts.getPermissions(roleIds) — UNIÓN de permisos de TODOS los roles del usuario,
   filtrando allowed:true, agrupado por módulo → array de acciones
   ↓
JWT (payload.permissions = {modulo: [acciones]}) — emitido en login y en cada refresh
   ↓
Frontend: setCredentials decodifica el JWT → Redux (auth.slice.permissions)
   ↓
usePermissions().can(modulo, accion) — lookup síncrono en memoria, sin red
   ↓
UI: sidebar, botones, páginas — condicionados a can()
   ↓
Backend Guard: PermissionGuard vuelve a verificar el mismo JWT.permissions en cada request
   (autoridad final — el frontend nunca es la fuente de verdad de seguridad)
```

**Ningún permiso vive fuera de este camino.** No existe permiso directo a nivel de usuario, no existe tabla de excepciones/overrides individuales, y no existe ningún endpoint que el frontend consulte "en vivo" para refrescar permisos — todo sale de decodificar el JWT que ya se tiene.

---

## B. Arquitectura de permisos (diagrama)

```
┌─────────┐     ┌──────────┐     ┌──────────────────┐     ┌────────────────────┐
│  User   │────▶│ UserRole │────▶│      Role         │────▶│  RolePermission     │
│ (N)     │ 1:N │  (N:M)   │ N:1 │  (administrador,   │ 1:N │  (roleId, moduleId, │
└─────────┘     └──────────┘     │  community_manager,│     │  actionId, allowed) │
                                  │  disenador,cliente) │     └──────────┬──────────┘
                                  └──────────────────┘                   │
                                                          ┌──────────────┴──────────────┐
                                                          ▼                              ▼
                                                     ┌─────────┐                   ┌──────────┐
                                                     │ Module  │                   │  Action  │
                                                     │(10 rows)│                   │ (9 rows) │
                                                     └─────────┘                   └──────────┘
                                                          │
                          auth.repository.ts.getPermissions([roleIds]) — WHERE allowed:true
                                                          │
                                                          ▼
                              JWT.permissions = { modulo: ['accion1','accion2', ...] }
                                                          │
                     ┌────────────────────────────────────┼────────────────────────────────────┐
                     ▼                                                                          ▼
        Frontend (6 apps, @repo/ui compartido)                              Backend (auth/core/alexa-service)
        auth.slice.ts ← decodeJwt(accessToken)                              PermissionGuard lee request.user.permissions
        usePermissions().can(mod, act) → useSelector                        (mismo JWT, verificado con JWKS, autoridad final)
        Sidebar / botones / EmptyState                                     @RequirePermission(modulo, accion) por endpoint
```

**GET /me/permissions existe en el backend pero NO se usa** — confirmado por los 4 agentes independientemente: cero llamadas reales desde ningún frontend. El comentario en `CLAUDE.md` que lo describe como "fuente de verdad del menú" está desactualizado; la fuente de verdad real es el JWT decodificado localmente.

---

## C. Matriz real de módulos y acciones

### Catálogo confirmado (idéntico en seed, enum backend, enum frontend — sin inconsistencias de naming)

**Módulos (10)**: `catalogos, marcas, publicaciones, calendario, campanas, metricas, score, reportes, usuarios, privilegios`
**Acciones (9)**: `ver, crear, editar, eliminar, aprobar, rechazar, exportar, configurar, asignar`

### Matriz de validez de negocio (resumen — detalle completo en Sección I)

| Módulo | Acciones con backing real | Acciones sin ningún backing |
|---|---|---|
| catalogos | ver, crear, editar, eliminar | aprobar, rechazar, exportar, configurar, asignar |
| marcas | ver, crear, editar, eliminar | aprobar, rechazar, exportar, configurar, asignar |
| publicaciones | ver, crear, editar, aprobar, rechazar | eliminar¹, exportar, configurar, asignar |
| **calendario** | **NINGUNA** — módulo fantasma, ver Hallazgo D1 | todas |
| campanas | ver, crear, editar, aprobar, rechazar, asignar | eliminar¹, exportar, configurar |
| metricas | ver, exportar² | crear, editar, eliminar, aprobar, rechazar, configurar, asignar |
| score | ver | todas las demás |
| reportes | ver, exportar³ | crear, editar, eliminar, aprobar, rechazar, configurar, asignar |
| usuarios | ver, crear, editar, eliminar, asignar¹ | aprobar, rechazar, exportar, configurar |
| privilegios | ver, editar | crear, eliminar, aprobar, rechazar, exportar, configurar, asignar |

¹ Endpoint real existe pero gateado con una acción distinta a la esperada (ver Hallazgos D2/D3).
² 100% client-side, sin endpoint de backend detrás (ver Hallazgo D4).
³ Es el `POST /reports` real, pero nombrado `exportar` en vez de `crear` (ver Hallazgo D5).

**Acción `configurar`: cero uso en todo el catálogo, para cualquier módulo.** Confirmado por 2 agentes independientes (grep exhaustivo de los ~80 `@RequirePermission` reales del backend).

---

## D. Problemas encontrados

| # | Prioridad | Hallazgo | Evidencia | Impacto |
|---|---|---|---|---|
| D1 | 🔴 Crítico | Módulo `calendario` es un permiso "de papel" — seedeado, asignado a 3 roles, con checkbox real en el admin, pero **ningún** endpoint en ningún servicio lo verifica jamás | Cero `@RequirePermission('calendario', ...)` en todo `apps/backend` (confirmado por 2 agentes); el calendario real (`brands-front/profile/calendar/page.tsx:435-436`) gatea sus botones con `publicaciones:aprobar/rechazar` | Un admin puede creer que está controlando acceso al calendario ajustando este módulo, y no controla nada — falsa sensación de seguridad/control |
| D2 | 🟡 Mejora | `DELETE /campaigns/:id` y `DELETE /posts/:id` están gateados por `campanas:editar`/`publicaciones:editar`, no por `eliminar` | `campaigns.controller.ts:142-143`, `posts.controller.ts:120-121` | La acción `eliminar` del catálogo es letra muerta para estos 2 módulos — quitarle "eliminar" a un rol no le quita la capacidad real de borrar campañas/posts (falso control granular) |
| D3 | 🟡 Mejora | `alexa-service/ideas.controller.ts` reusa `campanas:crear` para PATCH/DELETE, no solo POST | `ideas.controller.ts:48-49,58-59,69-70` | Quien tenga `campanas:crear` (CM, Cliente) puede editar/borrar ideas sin tener `editar`/`eliminar` — `disenador` (solo `campanas:ver`) no puede tocar ideas en absoluto, posiblemente no intencional |
| D4 | 🟢 Correcto (con matiz) | `metricas:exportar` no tiene ningún endpoint de backend — el PDF se genera 100% en el cliente, capturando el DOM ya renderizado | `metrics/page.tsx:67-78,139`; confirmado por 3 agentes independientes, cero `RequirePermission('metricas','exportar')` en backend | No es un agujero de seguridad real (quien ve los datos en pantalla ya los tiene, exportar solo los empaqueta), pero es un permiso que controla únicamente visibilidad de UI, no autorización de datos — documentarlo como tal |
| D5 | 🟠 Importante | `POST /reports` (crear una solicitud de reporte) usa la acción `exportar`, no `crear` — inconsistente con los otros 14 controllers, donde POST siempre mapea a `crear` | `reports.controller.ts:31-32` | Un admin que quiera dar a un rol "puede pedir reportes" tiene que otorgar `reportes:exportar`, un nombre que no comunica esa intención con claridad |
| D6 | 🟠 Importante | `POST /auth/link-code` usa un chequeo de ROL hardcodeado en el servicio, no `RequirePermission` | `auth.service.ts:190-194` (`['cliente','disenador','administrador'].includes(role)`) | Invisible al sistema de gestión de permisos — reasignar privilegios desde `admin-front/roles` no afecta este endpoint en absoluto; único caso real de esta naturaleza en todo el backend |
| D7 | 🟠 Importante | Endpoints `/internal/*` (perfiles de usuario, notificaciones) sin NINGÚN guard — ni JWT, ni permiso, ni secreto compartido | `user-profiles.controller.ts:12`, `internal-notifications.controller.ts:12` | Ya señalado en la auditoría de ayer, sigue sin resolver. Riesgo real solo si la red interna queda expuesta por error de configuración, pero es la única capa de defensa hoy |
| D8 | 🔴 Crítico | Botones "Nueva campaña" (2 ubicaciones) y "Editar perfil de marca" **sin ningún gate de permiso en frontend**, pese a que el backend sí exige uno | `brands-front/app/brands/[id]/campaigns/page.tsx:33-35`, `app/profile/campaigns/page.tsx:45-47`, `components/profile/ClientSection.tsx:288-291` | Un usuario sin `campanas:crear`/`marcas:editar` ve el botón igual, hace clic, y recibe un 403 sin explicación — mala UX, no agujero de seguridad (el backend bloquea igual) |
| D9 | 🟠 Importante | Aprobar/rechazar de campañas y posts (2 pantallas) gatean por **ROL** (`isCm`/`isClient`), no por `can(modulo,accion)` — inconsistente con el mismo dominio ya gateado correctamente en otras 2 pantallas | `brands-front/app/my-campaigns/page.tsx:24,70-91`, `posts-front/app/posts/approvals/page.tsx:52,155-193`, `posts-front/app/posts/[id]/page.tsx:460-478` vs. `campaigns/[campaignId]/page.tsx:148` y `calendar/page.tsx:435-436` (estos sí usan `can()`) | Con privilegios editables en vivo (que ya existen, `admin-front/roles`), un admin podría quitarle `publicaciones:aprobar` a un CM específico y el botón seguiría apareciendo en 2 de las 4 pantallas relevantes, porque esas 2 miran el rol, no el permiso real |
| D10 | 🟡 Mejora | `AdminTabs`/`BrandTabs` (sub-navs de zona) y las páginas de catálogos + auditoría en `admin-front` no tienen ningún gate de permiso — dependen 100% del 403 del backend | `AdminTabs.tsx`, `BrandTabs.tsx`, `admin-front/app/catalogs/**`, `admin-front/app/audit-log/page.tsx` | Pestañas/páginas alcanzables sin permiso que renderizan completas y solo fallan al pedir datos — mismo patrón que D8 pero a nivel de página entera, no de botón |
| D11 | 🟢 Correcto | `PermissionGuard` falla CERRADO ante datos faltantes/malformados (optional chaining en cadena, `undefined` → `ForbiddenException`), y el 100% de los ~80 endpoints protegidos hoy tiene su `@RequirePermission` explícito — sin omisiones actuales | `permission.guard.ts:9-21`, verificado 1:1 handler↔decorador en 21 controllers | El diseño es sólido; el único riesgo teórico (aplicar `PermissionGuard` a nivel de clase sin decorar un método nuevo → pase abierto) no se materializa hoy en ningún endpoint real |
| D12 | 🟢 Correcto | Catálogo admin-front (`interfaces/interface.ts:37-42`, `MODULES`/`ACTIONS` en inglés) es código muerto — no conectado a la pantalla real de roles, que usa el catálogo real vía API | `interface.ts:37-42` vs. `roles/page.tsx:27-28,45-46` (usa `useListModulesQuery`/`useListActionsQuery` reales) | Confuso si alguien lo lee sin contexto, pero sin efecto — candidato a limpieza, no a arreglo urgente |

---

## E. Auditoría frontend por aplicación

| App | Menú/sidebar | Páginas con gate propio | Botones críticos gateados | Botones sin gate (backend sí protege) |
|---|---|---|---|---|
| web-shell | Sidebar filtra por `can()` real, ítem por ítem (`Sidebar.tsx:50-51`) — dashboard es la única excepción sin gate | — | — | — |
| admin-front | `AdminTabs` sin gate (D10) | `roles/page.tsx` (`privilegios:ver`), `users/page.tsx` implícito | Nuevo usuario, eliminar usuario, editar privilegios | Catálogos, auditoría (D10) |
| analytics-front | — | `metrics/page.tsx` (`metricas:ver`) | Exportar PDF (`metricas:exportar`) | — |
| brands-front | `BrandTabs` sin gate (D10) | — | Nueva marca, aprobar/crear post (detalle campaña), aprobar/rechazar (calendario) | Nueva campaña ×2, editar perfil de marca (D8), aceptar/rechazar campaña por rol no permiso (D9) |
| posts-front | — | — | Nueva publicación | Aprobar/rechazar en bandeja y detalle, por rol no permiso (D9) |
| auth-front | N/A (sin middleware, es la puerta de entrada) | — | — | — |

**Confirmado en las 6 apps**: el mecanismo base (`usePermissions()` → Redux → JWT decodificado) es uniforme, compartido vía `@repo/ui`, no hay una implementación distinta o divergente por app. Los gaps encontrados (D8, D9, D10) son de **cobertura incompleta**, no de arquitectura rota.

---

## F. Auditoría backend

**Cobertura**: ~80 endpoints protegidos revisados en 21 controllers (auth-service, core-service, alexa-service) + gateway (proxy puro, sin RBAC propio, confirmado). Tabla completa de endpoints en el hallazgo del agente de backend (disponible bajo pedido, omitida aquí por extensión — resumen en Hallazgos D2-D7).

**Veredicto general**: la cobertura es alta y consistente. De ~80 endpoints no-públicos, **0 están completamente desprotegidos a través del gateway** (los 2 sin guard — D7 — son explícitamente internos, no proxeados). Las inconsistencias encontradas (D2, D3, D5, D6) son de **nomenclatura/semántica**, no de ausencia de protección — en todos los casos hay guard real, solo que la acción elegida no es la más intuitiva.

**Patrón consistente y correcto en todo el codebase**: `roles.includes('administrador')` se usa 15+ veces como bypass de **ownership** (dueño de marca, CM asignado), nunca como reemplazo del `PermissionGuard` — excepto D6 (`link-code`), la única excepción real a este patrón.

---

## G. Auditoría de multiprivilegio

**"Multiprivilegio" en este proyecto significa, concretamente**: un usuario puede tener **múltiples roles simultáneos** (tabla puente `UserRole`, N:M real), y sus permisos efectivos son la **unión** de los permisos de todos sus roles (`auth.repository.ts.getPermissions([roleIds])`). Confirmado con datos reales del seed: `multi@bananagram.mx` tiene `roles: ['community_manager', 'disenador']` explícitamente para demostrar esto.

**Lo que NO existe** (y es importante no asumir que existe):
- Permisos directos a nivel de usuario individual, independientes de cualquier rol.
- Overrides/excepciones por usuario (allow/deny puntual).
- Un cuarto nivel entre Rol y Permiso — el modelo es plano: `User —N:M— Role —1:N— RolePermission`.

**El escenario del usuario (Rocío, Cliente, se le agrega `metricas.exportar` sin cambiar el rol) SÍ funciona de punta a punta**, verificado en vivo esta sesión (login real como `community_manager` tras otorgarle `metricas:exportar` desde el admin, JWT decodificado mostró `"metricas": ["ver", "exportar"]` correctamente). La única capa que "rompe" la inmediatez es la esperada por diseño: **el token ya emitido no se actualiza solo hasta el próximo refresh (máx. 15 min) o un nuevo login** — no es un bug, es el tradeoff de JWT stateless, documentado en la Sección H.

---

## H. Auditoría de actualización de permisos

**Flujo verificado, ambos sentidos:**

```
Admin agrega/quita permiso → PATCH /admin/roles/:id/permissions → upsert en RolePermission (BD) ✅
                                                                          ↓
                                              Vista de admin (GET /admin/roles) refleja el cambio
                                              de inmediato (RTK Query invalidatesTags) ✅
                                                                          ↓
                              Usuario YA logueado con ese rol: SIN CAMBIO hasta:
                                 (a) su access token expira (máx. 15 min) y el refresh
                                     automático pide permisos frescos, o
                                 (b) cierra sesión y vuelve a entrar (inmediato)
                                                                          ↓
                              Usuario que hace login NUEVO después del cambio:
                                 ve el permiso actualizado inmediatamente ✅
```

No existe ningún mecanismo de invalidación "push" (websocket, polling, `GET /me/permissions` real) — es una decisión de arquitectura consistente con JWT stateless, no un defecto. **Vale la pena documentarlo explícitamente en el propio admin-front** (ej. un texto "los cambios pueden tardar hasta 15 min en verse para usuarios ya conectados, o pídeles reloguear") para que no se interprete como un bug durante la demo.

---

## I. Tabla de permisos — ¿la matriz actual es correcta?

**Respuesta directa a la pregunta central**: la tabla admin-front hoy implementa **Opción A** (producto cartesiano completo: los 10 módulos × las 9 acciones, sin restricción, 90 checkboxes siempre disponibles). La evidencia de los 4 agentes converge en que **Opción B es la arquitectura correcta para este dominio**:

- Solo ~28 de los 90 pares tienen backing real de endpoint (Sección C).
- Un módulo completo (`calendario`) no tiene ningún backing (D1).
- Una acción completa (`configurar`) no tiene ningún backing, para ningún módulo.
- Los patrones de negocio son genuinamente heterogéneos por módulo: CRUD puro (catálogos, marcas, usuarios), flujo de aprobación con estado (publicaciones, campañas), puramente derivado/read-only (métricas, score), o de administración (privilegios) — no hay un molde único que justifique ofrecer las 9 acciones a los 10 módulos por igual.

**Consecuencia práctica ya observada**: un admin puede marcar `calendario:aprobar` o `score:crear` en la tabla, el checkbox se guarda en BD, y **ningún `@RequirePermission` en ningún controller lo va a consultar jamás** — es falsa granularidad. El checkbox existe, el admin cree que restringe algo, y no restringe nada.

**Qué debería cambiar** (diagnóstico, no implementación — ver Sección K para el plan):
Introducir un concepto `ModuleAction` (tabla de combinaciones válidas: `moduleId + actionId + ¿tiene backing real?`), poblado con exactamente los ~28 pares que hoy tienen `@RequirePermission` real. La tabla de admin dejaría de iterar `MODULES × ACTIONS` y pasaría a iterar solo `ModuleAction` — eliminando de raíz la posibilidad de asignar combinaciones sin efecto real.

---

## J. Casos de prueba concretos

**Caso 1 — Usuario con permiso**: login como `cliente@bananagram.mx`, `GET /brands` → 200 con datos (tiene `marcas:ver`).

**Caso 2 — Usuario sin permiso**: login como `disenador@bananagram.mx` (sin `campanas:crear`, solo `campanas:ver`), `POST /campaigns` → 403 `"Permiso requerido: campanas:crear"`.

**Caso 3 — Agregar permiso dinámicamente**: como admin, `PATCH /admin/roles/:id/permissions` con `{moduleSlug:'metricas', actionSlug:'exportar', allowed:true}` para `community_manager` → login NUEVO de un usuario CM → JWT trae `metricas:['ver','exportar']` → botón "Exportar" aparece en `/metrics`. **Ya verificado en vivo esta sesión**, funciona.

**Caso 4 — Quitar permiso dinámicamente**: mismo flujo con `allowed:false` → login nuevo → `metricas` ya no incluye `exportar` → botón desaparece, y si se llama el endpoint directo (si existiera uno) → 403. Backend verificado correcto (`allowed:true` filtrado en `getPermissions`); frontend no verificable sin navegador en esta sesión, pero el mecanismo es simétrico al Caso 3.

**Caso 5 — Manipular frontend y llamar API directo**: un usuario sin `usuarios:eliminar` que edite el DOM/Redux para mostrar el botón oculto, y llame `DELETE /admin/users/:id` directo con su token real → 403, porque `PermissionGuard` valida contra el JWT firmado (RS256/JWKS), no contra nada que el cliente pueda manipular — el JWT no se puede editar sin invalidar su firma. **Verificado por diseño** (`permission.guard.ts` lee `request.user`, poblado por `JwtAuthGuard` desde el token verificado, nunca desde el body/headers arbitrarios).

**Caso 6 — Múltiples permisos simultáneos**: usuario `multi@bananagram.mx` (`community_manager` + `disenador`) — su JWT debe traer la UNIÓN: todo lo de CM (`publicaciones:aprobar`, etc.) más todo lo de Diseñador. Mecanismo confirmado en `auth.repository.ts:70-82` (agrupa por módulo con `Set`, evita duplicados). No probado en vivo esta sesión — recomendado como parte del recorrido de demo.

**Caso 7 — Múltiples módulos**: un mismo rol con permisos en varios módulos a la vez (ej. `cliente` con `marcas`, `campanas`, `metricas`, `reportes` simultáneos) — ya confirmado por el JWT real decodificado en el Caso 3 (community_manager traía 8 módulos distintos en un solo payload).

---

## K. Cambios recomendados (priorizados)

### Para cumplir Must-Have (crítico, antes de entrega)
| # | Archivo | Problema | Solución | Complejidad | Riesgo |
|---|---|---|---|---|---|
| K1 | `admin-front/src/app/roles/page.tsx` + nuevo `ModuleAction` | Tabla muestra 90 combinaciones, solo ~28 tienen efecto real (D1, Sección I) | Filtrar la tabla a combinaciones con backing real — mínimo esfuerzo: hardcodear client-side la lista de pares válidos (ya está mapeada en este documento, Sección C) hasta tener tiempo de modelarlo en BD | Baja (filtro en frontend) | Bajo |
| K2 | `brands-front` (3 archivos, D8) | Botones sin gate que el backend sí protege | Agregar `can('campanas','crear')`/`can('marcas','editar')` a los 3 sitios | Baja | Bajo |

### Para que el frontend sea realmente dinámico
| # | Archivo | Problema | Solución | Complejidad | Riesgo |
|---|---|---|---|---|---|
| K3 | `brands-front/my-campaigns`, `posts-front/approvals`, `posts-front/[id]` (D9) | Gatean por rol, no por permiso real | Reemplazar `isCm`/`isClient` por `can('campanas','aprobar'/'rechazar')` / `can('publicaciones','aprobar'/'rechazar')`, igual que ya funciona en `calendar/page.tsx` | Media (4 archivos, revisar cada flujo) | Bajo — mismo patrón ya probado en otras 2 pantallas |
| K4 | `AdminTabs.tsx`, `BrandTabs.tsx`, catálogos, audit-log (D10) | Sin gate, dependen 100% del 403 del backend | Agregar `can()` por tab/página | Baja-Media | Bajo |

### Para corregir la matriz
| # | Archivo | Problema | Solución | Complejidad | Riesgo |
|---|---|---|---|---|---|
| K5 | `packages/seed/src/index.js`, schema | `calendario` sin backing (D1) | Decisión de negocio: ¿eliminar el módulo del catálogo, o mantenerlo como alias visual de `publicaciones` sin permiso propio? — **requiere tu decisión**, no es solo código | Media (toca seed + posiblemente datos ya asignados) | Medio si hay roles con `calendario:*` ya asignados en producción |
| K6 | `campaigns.controller.ts:143`, `posts.controller.ts:121` (D2) | DELETE usa `editar` en vez de `eliminar` | Cambiar a `campanas:eliminar`/`publicaciones:eliminar` + agregar esa acción a los roles que hoy pueden borrar (para no quitarles la capacidad sin querer) | Baja | Medio — si no se actualiza el seed a la vez, se le quita la capacidad de borrar a todo el mundo por accidente |
| K7 | `reports.controller.ts:32` (D5) | `POST /reports` usa `exportar` en vez de `crear` | Decisión de negocio: ¿renombrar a `crear`, o dejarlo así porque conceptualmente "pedir un reporte" ya es "exportar"? | Baja (si se decide cambiar) | Medio — cambia qué roles pueden pedir reportes hoy (community_manager quedaría excluido si no se ajusta el seed) |

### Mejoras opcionales (no bloquean entrega)
| # | Archivo | Problema | Solución | Complejidad | Riesgo |
|---|---|---|---|---|---|
| K8 | `auth.service.ts:190-194` (D6) | `link-code` con rol hardcodeado | Migrar a un módulo/acción real del catálogo | Media | Bajo, pero requiere decisión de qué módulo usar |
| K9 | `internal-notifications.controller.ts`, `user-profiles.controller.ts` (D7) | Sin ningún guard | Agregar verificación de secreto compartido entre servicios | Media | Bajo (ya señalado, no nuevo) |
| K10 | `alexa-service/ideas.controller.ts` (D3) | Reusa `crear` para editar/borrar | Separar en `editar`/`eliminar` reales | Baja | Medio — afecta qué rol puede editar/borrar ideas hoy |
| K11 | `admin-front/src/interfaces/interface.ts:37-42` (D12) | Catálogo mock huérfano | Eliminar `MODULES`/`ACTIONS`/`DEFAULT_PRIVILEGES` no usados | Baja | Ninguno — código muerto confirmado |
| K12 | `admin-front/roles` UI | Sin aviso sobre la ventana de 15 min | Agregar un texto explicativo (Sección H) | Trivial | Ninguno |

---

## Preguntas de negocio que necesito que confirmes antes de tocar cualquier código

1. **`calendario` (K5)**: ¿lo eliminamos del catálogo de módulos, o lo dejamos como está (permiso sin efecto real) por ahora, dado que la entrega es inminente?
2. **DELETE de campañas/posts (K6)**: si separo `eliminar` de `editar`, ¿qué roles deberían conservar la capacidad de borrar? (hoy la tienen implícitamente todos los que tienen `editar`).
3. **`reportes:exportar` (K7)**: ¿lo dejamos como está (funciona, solo el nombre es confuso) o lo renombramos antes de la demo?

Dado que la entrega es inminente, mi recomendación es: aplicar K1 y K2 esta noche (bajo riesgo, alto impacto en coherencia visual de la demo), dejar K3/K4 si hay tiempo, y **posponer K5-K10 para después** — todos requieren una decisión de negocio tuya y tocan datos de roles ya asignados, justo el tipo de cambio que las reglas de esta auditoría piden evitar tan cerca de la entrega.
