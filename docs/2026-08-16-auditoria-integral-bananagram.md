# Auditoría integral — Bananagram (2026-08-16)

> **Estado de este documento:** 5 de 6 frentes de auditoría completados (frontend, backend, base de datos/arquitectura/Docker, seguridad, integraciones Ayrshare/Alexa). Falta el frente transversal (variables de entorno, manejo de errores, testing, performance, código muerto, documentación) — las secciones 7, 8 y parte del Plan recomendado se completarán en cuanto termine y este documento se actualizará in-place.
>
> Metodología: 5 agentes de exploración de solo lectura, cada uno con un ámbito acotado del repositorio, instruidos a citar archivo:línea para cada hallazgo y a marcar explícitamente "no verificable" en vez de asumir. No se ejecutó ningún servidor de desarrollo, migración, seed ni comando destructivo durante la auditoría. Ningún archivo del proyecto fue modificado.

---

## 1. Resumen ejecutivo

Bananagram **no es un scaffold** — los 4 servicios de backend y la mayoría del frontend (login, publicaciones con flujo de aprobación de 11 estados, campañas, métricas/score, notificaciones en vivo, integración real con Ayrshare, Alexa Skill) están conectados de punta a punta con evidencia concreta de haber sido probados contra servicios reales, no solo maquetados. Al mismo tiempo, hay **bloqueantes reales de integridad de datos y despliegue**, y varias pantallas administrativas completas que aparentan funcionar pero no persisten nada.

**Estimación aproximada de completitud — ~70-75%**, calculada como: de las 9 funcionalidades principales evaluadas en la matriz de la sección 2, 6 están "Completas" o "Completas con huecos menores", 2 están "Parciales" (mitad real, mitad mock) y 1 está "No implementada" (generación de reportes reales). Es una estimación gruesa por conteo de funcionalidades, no una métrica de cobertura de código.

**Principales riesgos (P0/P1):**
- **Integridad de datos**: la tabla `audit_log` — declarada explícitamente como invariante inmutable del proyecto — nunca se escribe en ningún flujo real; el único interceptor que debería poblarla es un archivo huérfano que ni siquiera compila.
- **Despliegue containerizado roto en al menos 3 puntos**: `docker-compose.yml` en modo `--profile full` deja a `alexa-service` sin poder alcanzar ni su propia base de datos ni `core-service`, y al gateway sin poder alcanzar `alexa-service` — el stack completo en Docker no funciona hoy tal como está configurado, aunque `pnpm dev` en el host sí.
- **Seguridad**: 2 endpoints internos de servicio-a-servicio sin ninguna autenticación (solo protegidos por "el gateway no los expone", sin defensa en profundidad), y un IDOR real en `GET /reports/:id` (cualquier usuario con el permiso genérico `reportes:ver` puede leer reportes de cualquier marca ajena).
- **Funcionalidades "falsamente terminadas"**: `admin-front` completo (`/users`, `/roles`) y el dashboard de administrador en `web-shell` tienen UI pulida con diálogos, confirmaciones y botones que aparentan persistir cambios, pero solo tocan estado local de React — el backend real (8 endpoints) ya existe y no tiene ningún consumidor.

**Lo que sí está sólido:** el flujo de autenticación completo (login, rotación de refresh tokens con detección de reuso, logout con revocación real, JWKS) está bien implementado y sin huecos encontrados; la integración con Ayrshare es genuinamente real (llamadas HTTP reales, circuit breaker funcionando, comentarios de código que documentan bugs reales encontrados en pruebas en vivo contra Instagram) aunque con cobertura incompleta de redes en las métricas; y la migración de `apps/backend/commons` a paquete workspace real (`@repo/backend-commons`), hecha en esta misma sesión, quedó limpia sin duplicados residuales.

---

## 2. Mapa de funcionalidades

| Funcionalidad | Frontend | Backend | BD | Integración | Estado |
|---|---|---|---|---|---|
| Autenticación (login/refresh/logout) | ✅ | ✅ | ✅ | — | **Completa** |
| Gestión de usuarios/roles (admin) | ❌ Mock | ✅ | ✅ | — | **Solo backend** — front 100% mock, cero conexión |
| Gestión de marcas | ✅ | ✅ | ✅ | — | **Completa** |
| Publicaciones (flujo de aprobación) | ✅ | ✅ | ✅ | Ayrshare | **Completa** |
| Campañas | ✅ | ✅ | ✅ | — | **Completa** |
| Métricas / analítica | ✅ (parcial) | ✅ | ✅ | Ayrshare (4/6 redes) | **Parcial** — LinkedIn/YouTube sin mapper |
| Puntuación digital (score) | ✅ | ✅ | ✅ | — | **Completa** (fórmula real difiere de la documentada, ver §5) |
| Redes sociales (conexión + publish) | ✅ | ✅ | ✅ | Ayrshare real | **Completa**, con huecos menores (sin validación de char-limits por red) |
| Reportes | ❌ (no verificado a fondo) | 🟡 Solo registra la solicitud | ✅ (`fileUrl` siempre null) | — | **No implementado** — generación real del archivo nunca se construyó |
| Permisos (RBAC dinámico) | ✅ | ✅ | ✅ | — | **Completa** |
| Alexa (5 de 6 funciones del contrato) | n/a | ✅ | ✅ | HTTP interno | **Completa parcial** — generación de ideas con IA confirmada ausente (no mockeada, honestamente no implementada) |
| Auditoría (`audit_log`) | n/a | ❌ Nunca se escribe | ✅ Tabla existe | — | **No implementada** — invariante de negocio declarada, sin implementación real |

---

## 3. Hallazgos críticos (solo P0/P1)

| Prioridad | Área | Problema | Evidencia | Impacto | Solución propuesta | Complejidad |
|---|---|---|---|---|---|---|
| 🔴 P0 | Integridad de datos | `audit_log` nunca se puebla en ningún flujo real; `AuditInterceptor` es un TODO sin implementar que además vive fuera de `src/` y no compila ni se exporta | `apps/backend/commons/interceptors/audit.interceptor.ts:1-17`; excluido por `apps/backend/commons/tsconfig.json:6` (`include: ["src/**/*"]`) | Viola una invariante de negocio explícitamente declarada ("audit_log es inmutable, solo insert") — sin auditoría real de quién hizo qué | Mover el interceptor a `src/`, implementar el insert real (actor, requestId, before/after), registrarlo como `APP_INTERCEPTOR` global en los 3 servicios | Media |
| 🔴 P0 | Docker / despliegue | `docker-compose.yml --profile full`: `alexa-service` no recibe `DATABASE_URL_CORE` ni `CORE_SERVICE_URL` en su override de entorno — caen a `localhost`, no resuelven dentro de la red del contenedor | `docker-compose.yml:75-77` vs `alexa-service/src/app.module.ts:9`, `ideas.service.ts:15`, `campaigns.service.ts:43` | `/ideas` y `/campaigns` de alexa-service quedan completamente rotos en modo containerizado completo (el contenedor arranca, pero cada request falla) | Agregar ambas variables al override de `alexa-service` en `docker-compose.yml` apuntando a los nombres de servicio de la red interna | Baja |
| 🔴 P0 | Docker / despliegue | `api-gateway` no recibe `ALEXA_SERVICE_URL` en su override — cae a `localhost:3004`, no resuelve en la red del contenedor | `docker-compose.yml:87-94` vs `gateway/src/main.ts:49` | `/api/ideas/*` inalcanzable a través del gateway en modo `--profile full` (ya sospechado en documentación previa, ahora confirmado leyendo el código) | Agregar `ALEXA_SERVICE_URL: http://alexa-service:3004` al override del gateway | Baja |
| 🟠 P1 | Seguridad | `POST /internal/notifications` (auth-service) y `GET/POST /internal/user-profiles` (core-service) no tienen ningún guard ni verificación de secreto compartido — su única protección es que el gateway no los expone | `auth-service/src/notifications/internal-notifications.controller.ts:15`; `core-service/src/internal/user-profiles.controller.ts:17,22` | Si el puerto del servicio es alcanzable directamente (red Docker plana, `localhost` en dev, futura infraestructura mal configurada), cualquiera puede leer/escribir perfiles de cualquier usuario o forjar notificaciones sin ninguna credencial | Agregar verificación de secreto compartido (header HMAC o similar) entre servicios internos | Baja-Media |
| 🟠 P1 | Seguridad | IDOR real: `GET /reports/:id` no valida ownership de marca — solo verifica el permiso genérico `reportes:ver` | `core-service/src/reports/reports.controller.ts:25-29`, `reports.service.ts:30-34` (bare `findUnique` sin filtro de marca) | Cualquier usuario autenticado con el permiso `reportes:ver` (otorgado a CM/Diseñador/Cliente) puede leer reportes de marcas ajenas conociendo o adivinando el id | Filtrar `getReport` por ownership igual que ya hace `listReports` | Baja |
| 🟠 P1 | Frontend — falsamente terminado | `admin-front` `/users` y `/roles`: UI completa (diálogos, confirmaciones, toggles) que aparenta persistir, pero solo modifica `useState` local; comentario propio en el código lo admite ("Mock: persiste solo en estado local") | `CreateUserDialog.tsx:32-56`, `roles/page.tsx:92-97` | El backend ya expone 8 endpoints reales (`auth-service/src/admin/{users,roles}.controller.ts`) sin ningún consumidor — cualquiera que pruebe la pantalla cree que está gestionando usuarios reales | Conectar ambas pantallas a los endpoints reales vía RTK Query | Media |
| 🟠 P1 | Frontend — falsamente terminado | `web-shell`'s `DashboardAdmin` — 4 `WidgetCard` con aspecto de KPIs reales alimentados 100% por `MOCK_ADMIN_DASHBOARD` | `web-shell/src/components/dashboard/DashboardAdmin.tsx:17,24` | Cualquier admin que entra al dashboard ve números fijos, no reales | Conectar a los endpoints reales de conteo/actividad, o retirar el dashboard hasta tenerlos | Media |
| 🟠 P1 | Frontend | `auth-front`'s `RegisterForm` sigue mock (JWT sin firmar generado en cliente, usuarios de mock) pese a que el backend de registro es real | `RegisterForm.tsx:26,125` | Registro de usuarios nuevos no funciona de verdad desde el frontend | Conectar a `POST /auth/register` real | Media |
| 🟠 P1 | Frontend | Árbol legado `brands-front` `/brands/[id]/{metrics,score,reports,calendar}` sigue en mock pese a que las versiones nuevas y reales de esas vistas ya existen en otras rutas | `brands/[id]/metrics/page.tsx:10,23` (lee `MOCK_PROFILES`/`MOCK_CAMPAIGNS`) | Rutas alcanzables que muestran datos falsos en vez de un 404 o un redirect a la versión real | Eliminar el árbol legado o redirigir a las rutas reales equivalentes | Baja |
| 🟠 P1 | Base de datos | ~15 columnas FK/de consulta frecuente en el schema de `core-service` (brandId, campaignId, postId, userId, etc.) no tienen `@@index` — este Prisma no las indexa automáticamente | `core-service/prisma/schema.prisma:239-633`, confirmado contra el SQL de migración (solo hay índices en columnas `@@unique`) | Cada listado por marca/campaña/CM hace table scan; se degrada conforme crece la data | Agregar `@@index` a las columnas FK más consultadas y generar la migración correspondiente | Baja |
| 🟠 P1 | Base de datos | `Media` tiene campo `deletedAt` (soft-delete) pero `posts.service.ts` hace `prisma.media.delete()` — borrado físico real | `core-service/src/posts/posts.service.ts:599-602` vs `schema.prisma:469` | Viola la regla de negocio explícita "nunca borrar registros físicamente" — datos de media se pierden sin posibilidad de recuperación/auditoría | Cambiar a soft-delete (`update({ deletedAt: new Date() })`) | Baja |
| 🟠 P1 | Ayrshare / integraciones | Los mappers de métricas solo cubren 4 de 6 redes sociales (Instagram/Facebook/TikTok/X) — LinkedIn y YouTube están explícitamente fuera de alcance en el código | `mapper.registry.ts:12-17,19-24` | Posts publicados en LinkedIn/YouTube nunca generan filas en `PostMetric` — degrada en silencio (se loguea, no rompe, pero no hay métricas nunca para esas 2 redes) | Implementar los 2 mappers faltantes o documentar explícitamente la limitación en la UI | Media |
| 🟠 P1 | Ayrshare / integraciones | `CHAR_LIMITS` (límites de caracteres por red) está definido pero nunca se importa en ningún punto del backend — sin validación previa a publicar | `char-limits.map.ts:1-8`, cero referencias en el resto de `apps/backend` | Un post que excede el límite de X (280 caracteres) no se bloquea antes de publicar; falla del lado de Ayrshare sin aviso previo al usuario | Usar `CHAR_LIMITS` en la validación del DTO o servicio de publicación antes de enviar a Ayrshare | Baja |
| 🟠 P1 | Docker | Dockerfile de `alexa-service` corre `pnpm db:generate` a nivel raíz, que genera los clientes de auth-service y core-service — **no genera el propio cliente de alexa-service** (el que sí necesita); el comentario del Dockerfile además describe un "schema compartido" que no existe | `alexa-service/Dockerfile:23-24` vs `package.json` (script raíz `db:generate` omite alexa-service) | Paso de build que hace trabajo incorrecto/desperdiciado; funciona hoy solo porque el hook `prebuild` de Nest genera el cliente correcto por su cuenta — frágil, no verificado a prueba de fallos | Corregir el comentario, quitar o corregir el `pnpm db:generate` de esa línea | Baja |
| 🟠 P1 | Docker | `core-service` no recibe `AUTH_SERVICE_URL` en su override de `docker-compose.yml` — cae a `localhost:3001`, no resuelve en red de contenedor | `docker-compose.yml:62-65` vs `notifications-client.service.ts:18` | Notificaciones in-app se degradan en silencio en modo `--profile full` (está envuelto en try/catch + circuit breaker, así que no rompe otros flujos, pero notificaciones dejan de llegar) | Agregar `AUTH_SERVICE_URL` al override de `core-service` | Baja |

---

## 4. Hallazgos por aplicación

### Frontend

**web-shell**
- 🟠 P1 `DashboardAdmin` 100% hardcoded (ver tabla de hallazgos críticos).
- 🔵 P3 5 archivos `store/api/{ai,metrics,notifications,posts,reports}.api.ts` completamente huérfanos — no registrados en `store/index.ts`, sin ningún importador. Código muerto que aparenta ser la integración real de esas áreas a nivel shell.
- 🟡 P2 `next.config.ts` no tiene rewrite para `/my-team`, `/my-brand` ni `/onboarding`; el propio `Sidebar.tsx` de `brands-front` enlaza a `/my-team` con href relativo en vez de absoluto — navegar desde el shell (puerto 3000) produce un 404 real. `posts-front`/`analytics-front` sí usan URL absoluta para el mismo ítem, así que el bug es local a `brands-front`.

**admin-front**
- 🔴 P1 `/users` y `/roles` 100% mock (ver tabla de hallazgos críticos) — caso de "falsamente terminado" más claro de todo el frontend.
- 🟢 `/catalogs/*` sí es real (RTK Query + mutaciones reales, registrado en el store).

**auth-front**
- 🟢 `LoginForm` es real de punta a punta (mutación real, 2 cookies de sesión, JWT decodificado, redirect por rol).
- 🔴 P1 `RegisterForm` sigue mock (ver tabla de hallazgos críticos).
- 🟠 P2 `ForgotPasswordForm`/`ActivateForm` mock pese a que la mutación real ya existe y apunta a un endpoint real — el propio comentario del código dice "Diseño sin backend".
- 🟡 P3 Único `console.log` de todo el frontend (credenciales demo desactualizadas, ya no coinciden con el seed real).

**brands-front**
- 🟢 Rutas core reales confirmadas (`/brands/[id]/campaigns/[campaignId]` usa RTK Query real de punta a punta).
- 🔴 P1 Árbol legado mock (ver tabla de hallazgos críticos).
- 🟡 P2 `/my-team` sin rewrite desde el shell (hallazgo cruzado, ver web-shell arriba).

**posts-front**
- 🟢 El más completo de las 6 apps: filtros de status/campaña enviados de verdad al backend, no filtrado falso en cliente.
- 🟠 P2 No desestructura `isLoading`/`isError` en la pantalla principal de posts — un 500 real se vería idéntico a "sin resultados".

**analytics-front**
- 🟢 9 de 17 widgets confirmados reales.
- 🟠 P2 Los widgets "reales" no manejan loading/error explícitamente — valores por defecto (`0`, arrays vacíos) esconden tanto la carga como un error de red.
- 🔵 P3 `AnalyticsDashboardLayout` confirmado sin ningún importador — componente muerto.
- ⚪ 5 widgets con `EmptyState` honesto — patrón correcto, no es un hallazgo negativo.

**@repo/ui (frontend commons)**
- 🟢 Refresh de token real y bien diseñado: dedupe de refreshes concurrentes, reintento único, logout+redirect si falla.
- 🟠 P1 (transversal) `DataTable` no tiene prop `loading` — ninguna tabla del sistema muestra skeleton mientras carga.
- 🔵 `RoleSwitcher` exportado pero sin ningún import activo — código muerto.
- 🔵 Sistema de toasts (`useToast`) solo usado en `posts-front`/`brands-front` — `admin-front`/`analytics-front` no lo usan para errores de mutación.

### Backend

**gateway**
- 🟢 No es un proxy tonto: valida JWT/JWKS real y aplica rate-limiting real con Redis antes de proxear, con defensa en profundidad real (cada servicio downstream revalida independientemente).
- 🔴 P0 Falta `ALEXA_SERVICE_URL` en el override de Docker (ver tabla de hallazgos críticos).
- 🟡 P2 Comentario del Dockerfile afirma que el gateway importa tipos Prisma de un `apps/backend/commons/prisma/schema.prisma` que **no existe** — comentario desactualizado, corregir o borrar.

**auth-service**
- 🟢 Flujo de auth completo verificado correcto (login, refresh con rotación+detección de reuso, logout con revocación real, JWKS público).
- 🟠 P1 `POST /internal/notifications` sin ninguna autenticación (ver tabla de hallazgos críticos).

**core-service**
- 🟢 Migración a `@repo/backend-commons` confirmada limpia — cero imports relativos residuales a guards/decorators locales.
- 🟠 P1 `GET /reports/:id` con IDOR real (ver tabla de hallazgos críticos).
- 🟠 P1 `GET/POST /internal/user-profiles` sin ninguna autenticación (ver tabla de hallazgos críticos).
- 🔵 P2 Violación pervasiva y consistente de la convención propia del repo ("nunca lanzar HTTP exceptions desde services") — 114 ocurrencias en 16 archivos across los 3 servicios. Es el patrón real con el que corre todo el sistema, no accidentes aislados; más barato actualizar la convención documentada que refactorizar 16 archivos.
- 🟡 P2 `BrandAccessGuard` correctamente no aplicado donde `:id` no es un `brandId` (campaigns, posts, score) — todos con verificación manual de ownership documentada inline. El hallazgo de CLAUDE.md sobre esto es preciso pero incompleto (solo menciona campaigns, no posts/score).

**alexa-service**
- 🟢 5 de 6 funciones del contrato documentado confirmadas reales de punta a punta.
- 🔴 Generación de ideas con IA confirmada genuinamente ausente — sin ningún código relacionado a `ANTHROPIC_API_KEY` en el backend, y honestamente no simulada (no hay mock que aparente funcionar).
- 🟢 Cero código residual del diseño viejo descartado (Lambda llamando a Claude directo) — el descarte quedó limpio también en código, no solo en documentación.
- 🟠 P1 Dockerfile con paso de build incorrecto (ver tabla de hallazgos críticos).
- 🔴 P0 Variables de entorno faltantes en Docker (ver tabla de hallazgos críticos).

**@repo/backend-commons**
- 🟢 Migración de esta misma sesión confirmada limpia en los 3 servicios consumidores.
- 🔵 P3 `HttpExceptionFilter` y `LoggingInterceptor` exportados pero nunca registrados (`useGlobalFilters`/`useGlobalInterceptors`) en ningún servicio — código muerto de facto.
- 🔴 P0 `AuditInterceptor` (ver tabla de hallazgos críticos).

---

## 5. Hallazgos de arquitectura

**Monorepo / pnpm / Turborepo**
- 🟢 `pnpm-workspace.yaml` y `turbo.json` correctamente configurados; `@repo/backend-commons` y `@repo/ui` se resuelven bien como paquetes workspace.
- 🟡 P2 El script raíz `db:generate` omite `alexa-service` — cualquiera que corra `pnpm db:generate` desde la raíz no genera el cliente de alexa-service.

**Base de datos — separación por microservicio**
- 🟢 La arquitectura declarada (auth-service y core-service con BD propia, alexa-service escribiendo directo a la BD física de core-service sin migrar nunca desde ahí) se confirma correctamente implementada — `alexa-service/prisma/` no tiene carpeta `migrations/`.
- 🟢 No se encontró ningún caso de un servicio accediendo accidentalmente a la BD de otro fuera del patrón documentado.
- 🟡 P2 Seed (`packages/seed`) solo puebla usuarios/roles/permisos — no crea ninguna marca, campaña, catálogo, etc. Una base recién levantada da cuentas de login pero un `core-service` vacío hasta que un admin cree catálogos a mano.

**Docker**
- 3 Dockerfiles de servicios backend confirmados usando `turbo run build` (no `pnpm --filter` plano) — el cambio hecho en esta sesión para respetar el grafo de dependencias del workspace está presente y correcto.
- 3 gaps de variables de entorno en `docker-compose.yml --profile full` (ver tabla de hallazgos críticos) — el stack completo containerizado no funciona hoy tal cual está configurado, aunque cada Dockerfile individualmente construye bien.
- 🟢 Ningún Dockerfile expone secretos ni hace `COPY` de material sensible (la llave privada JWT se monta como volumen, no se copia a la imagen).
- 🟢 P3 Ningún Dockerfile tiene `HEALTHCHECK` — mejora, no bloqueante.

---

## 6. Hallazgos de seguridad

*(Ver también los ítems P0/P1 de seguridad ya listados en la sección 3 — no se repiten aquí, solo hallazgos adicionales de menor prioridad.)*

| Prioridad | Hallazgo | Evidencia | Severidad real |
|---|---|---|---|
| 🟡 P2 | Verificación de revocación (`TokenDenylistService` compartida usada por core-service/alexa-service, y la del gateway) falla en modo "abierto" (`return false`) si Redis está caído — un token recién revocado seguiría siendo aceptado durante una caída de Redis. La versión propia de auth-service sí tiene respaldo en Postgres y falla en modo "cerrado". Asimetría no documentada como decisión aceptada. | `commons/src/guards/token-denylist.service.ts:15-21` vs `auth-service/src/auth/token-denylist.service.ts:40-53` | Real pero acotado a ventanas de caída de Redis |
| 🟡 P2 | Rate limiting es un presupuesto global por IP (no por cuenta ni por endpoint) y falla en modo abierto si Redis cae — sin bloqueo a nivel de cuenta tras intentos fallidos de login | `gateway/src/rate-limit/rate-limit.middleware.ts:22-63` | Riesgo de fuerza bruta distribuida, mitigado parcialmente |
| 🟡 P2 | Código de vinculación de cuenta de Alexa es un PIN numérico de 4 dígitos (9,000 combinaciones), redimible en un endpoint público sin límite de intentos por código específico (solo el rate-limit global de IP) | `auth.repository.ts:19-26`, `auth.controller.ts:68` | Fuerza bruta distribuida plausible dentro de la ventana de 10 min |
| 🟡 P3 | Gateway usa `app.enableCors()` sin opciones → origen wildcard por defecto. Riesgo mitigado porque la auth es Bearer-token-en-localStorage, no cookies (sin combinación wildcard+credentials peligrosa) | `gateway/src/main.ts:15` | Bajo impacto real, pero es un borde de seguridad abierto sin necesidad |
| 🟡 P2 | Ventana de permisos obsoletos en el JWT: revocar un permiso vía `PATCH /admin/roles/:id/permissions` no invalida tokens de acceso ya emitidos — quedan con los permisos viejos hasta su expiración (máx. 15 min, no indefinido, ya que el refresh sí trae permisos frescos) | `commons/guards/permission.guard.ts:16-20` | Acotado a 15 min, probablemente aceptable pero no documentado como tal en ningún ADR |

**Verificado correcto y sin hallazgos:** hashing de contraseñas (argon2, mensajes de error genéricos sin fuga de "usuario no existe" vs "contraseña incorrecta"), rotación de refresh token con detección de reuso y revocación de familia completa, logout con revocación real server-side, JWKS público sin guard accidental, guards que fallan en modo cerrado ante errores de red/JWKS, DTOs sin mass assignment (sin spreads de `req.body` hacia Prisma), únicas 2 queries `$queryRaw` del sistema correctamente parametrizadas (sin SQL injection), sin `dangerouslySetInnerHTML` con contenido de usuario, sin `child_process.exec` en todo el repo, sin `ANTHROPIC_API_KEY` referenciada en ningún punto del frontend, `.env` reales correctamente excluidos de git (`.env.example` correctamente sí trackeados, sin secretos reales dentro).

---

## 7. Hallazgos de testing

*Pendiente — sección a completar cuando termine el frente transversal de la auditoría.*

## 8. Hallazgos de documentación

*Pendiente — sección a completar cuando termine el frente transversal de la auditoría. Un hallazgo ya confirmado de forma incidental por el agente de backend: `apps/backend/.claude/CLAUDE.md` describe `commons` como importado por path relativo con guards duplicados por servicio — desactualizado respecto al estado real post-migración de esta sesión (`@repo/backend-commons` ya es un paquete workspace real y limpio).*

---

## 9. Código muerto / deuda técnica

| Elemento | Ubicación | Clasificación |
|---|---|---|
| `AuditInterceptor` | `apps/backend/commons/interceptors/audit.interceptor.ts` | **Implementar** (ver P0 en §3) |
| `HttpExceptionFilter`, `LoggingInterceptor` | `@repo/backend-commons` | **Implementar** (registrar globalmente) o **eliminar** si se decide que no hacen falta |
| `web-shell/store/api/{ai,metrics,notifications,posts,reports}.api.ts` | 5 archivos | **Eliminar** (huérfanos, sin registrar, sin importar) |
| `AnalyticsDashboardLayout` | `apps/frontend/analytics-front` | **Eliminar** (sin importador) |
| `RoleSwitcher` | `apps/frontend/commons` | **Eliminar o conectar** (exportado, sin uso real) |
| `CHAR_LIMITS` | `apps/backend/services/core-service/.../char-limits.map.ts` | **Implementar** (usar en validación, ver P1 en §3) |
| `PostSocialAccount.retryCount` | Prisma schema de core-service | **Implementar** (columna modelada, nunca incrementada en código — lógica de reintento no conectada) |
| Árbol legado `/brands/[id]/{metrics,score,reports,calendar}` | `apps/frontend/brands-front` | **Eliminar** (mock, superado por rutas reales equivalentes) |
| Violación de convención "no lanzar excepciones HTTP desde services" | 114 ocurrencias, 16 archivos backend | **Mantener y actualizar la documentación** (es el patrón real y consistente del sistema, no vale la pena refactorizar 16 archivos para cumplir un ideal no aplicado desde el principio) |

---

## 10. Plan recomendado

### Fase 1 — Bloqueantes
| Tarea | Área | Prioridad | Dependencias | Archivos afectados | Complejidad |
|---|---|---|---|---|---|
| Agregar `DATABASE_URL_CORE`/`CORE_SERVICE_URL` al override de `alexa-service` en compose | Docker | P0 | Ninguna | `docker-compose.yml` | Baja |
| Agregar `ALEXA_SERVICE_URL` al override de `api-gateway` en compose | Docker | P0 | Ninguna | `docker-compose.yml` | Baja |
| Implementar `AuditInterceptor` real + registrarlo globalmente en los 3 servicios | Backend / Cumplimiento | P0 | Ninguna | `apps/backend/commons/src/interceptors/`, 3× `main.ts`/`app.module.ts` | Media |
| Proteger `/internal/*` con secreto compartido (auth-service + core-service) | Seguridad | P1 | Ninguna | `internal-notifications.controller.ts`, `user-profiles.controller.ts` | Baja-Media |
| Corregir IDOR en `GET /reports/:id` | Seguridad | P1 | Ninguna | `reports.service.ts` | Baja |
| Cambiar `Media` a soft-delete real | Backend / Cumplimiento | P1 | Ninguna | `posts.service.ts` | Baja |

### Fase 2 — Funcionalidades incompletas
| Tarea | Área | Prioridad | Dependencias | Archivos afectados | Complejidad |
|---|---|---|---|---|---|
| Conectar `admin-front` `/users`/`/roles` a los endpoints reales | Frontend | P1 | Ninguna | `admin-front/src/app/{users,roles}` | Media |
| Conectar `DashboardAdmin` de `web-shell` a datos reales | Frontend | P1 | Backend de conteo/actividad (verificar si ya existe) | `web-shell/src/components/dashboard/DashboardAdmin.tsx` | Media |
| Conectar `RegisterForm` de `auth-front` al registro real | Frontend | P1 | Ninguna | `auth-front/src/components/RegisterForm.tsx` | Media |
| Eliminar árbol legado mock de `brands-front` | Frontend | P1 | Confirmar rutas reales equivalentes cubren todo | `brands-front/src/app/brands/[id]/{metrics,score,reports,calendar}` | Baja |
| Agregar índices faltantes en `core-service` | Base de datos | P1 | Ninguna | `schema.prisma` + migración nueva | Baja |
| Corregir Dockerfile de `alexa-service` (paso `db:generate` incorrecto) | Docker | P1 | Ninguna | `alexa-service/Dockerfile` | Baja |
| Agregar `AUTH_SERVICE_URL` al override de `core-service` en compose | Docker | P1 | Ninguna | `docker-compose.yml` | Baja |

### Fase 3 — Integraciones
| Tarea | Área | Prioridad | Dependencias | Archivos afectados | Complejidad |
|---|---|---|---|---|---|
| Implementar mappers de métricas para LinkedIn y YouTube | Ayrshare | P1 | Ninguna | `mapper.registry.ts` + 2 mappers nuevos | Media |
| Usar `CHAR_LIMITS` en validación previa a publicar | Ayrshare | P1 | Ninguna | DTO/servicio de publicación de posts | Baja |
| Implementar generación real de reportes (`fileUrl`) | Reportes | P1/P2 | Decidir formato (CSV/PDF) y almacenamiento | `reports.service.ts` | Alta |
| Conectar `PostSocialAccount.retryCount` a lógica real de reintento | Ayrshare | P2 | Ninguna | `post-scheduler.service.ts` o similar | Media |
| Evaluar implementar generación de ideas con IA (bloqueado por `ANTHROPIC_API_KEY` de pago) | Alexa | P2/P3 | Decisión de negocio sobre presupuesto de API | `alexa-service/src/ideas/` | Alta |

### Fase 4 — Calidad
*Se detallará al completar el frente transversal de la auditoría (tests, manejo de errores, performance).*

Adelanto de lo ya confirmado por los otros frentes, relevante para esta fase:
- Actualizar la convención documentada de "no lanzar excepciones HTTP desde services" para reflejar el patrón real (114 ocurrencias en 16 archivos) — decisión de documentación, no de código.
- Poblar `packages/seed` con marcas/campañas/catálogos de ejemplo para que un entorno recién levantado sea usable sin trabajo manual de admin.

### Fase 5 — Limpieza
| Tarea | Área | Prioridad | Complejidad |
|---|---|---|---|
| Eliminar los 5 archivos huérfanos `web-shell/store/api/*.ts` | Frontend | P3 | Baja |
| Eliminar o conectar `RoleSwitcher` y `AnalyticsDashboardLayout` | Frontend | P3 | Baja |
| Registrar globalmente o eliminar `HttpExceptionFilter`/`LoggingInterceptor` | Backend | P3 | Baja |
| Corregir comentarios desactualizados en Dockerfiles (gateway menciona un schema Prisma de commons que no existe) | Docker | P3 | Baja |
| Actualizar `apps/backend/.claude/CLAUDE.md` para reflejar la migración real de `@repo/backend-commons` | Documentación | P2 | Baja |

---

*Documento generado a partir de 5 auditorías paralelas de solo lectura sobre el estado real del código al 2026-08-16. Cada hallazgo cita archivo y línea aproximada; donde no fue posible verificar algo con certeza, se marcó explícitamente como tal en el detalle de cada frente. Pendiente: frente transversal (env vars, manejo de errores, testing, performance, código muerto adicional, documentación) — este documento se actualizará al completarse.*
