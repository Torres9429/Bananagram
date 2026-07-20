# Base de datos

PostgreSQL · Prisma ORM · 19 tablas en 3FN

Todas las tablas viven en un único schema compartido
(`apps/backend/commons/prisma/schema.prisma`). A nivel de servicio: los
dominios Identidad/acceso quedan en **auth-service**; Catálogos, Pivotes
usuario, Marcas, Contenido y Analítica quedan todos en **core-service**
(fusiona lo que antes eran brands/content/analytics-service). `alexa-service`
no tiene tablas propias — consume las APIs de los otros dos.

## Dominios

| Dominio           | Tablas                                                          |
|-------------------|-----------------------------------------------------------------|
| Identidad/acceso  | users, roles, actions, modules, role_permissions, refresh_tokens|
| Catálogos         | categories, specialties, social_networks                        |
| Pivotes usuario   | user_categories, user_specialties                               |
| Marcas            | brands, brand_profiles, brand_users                             |
| Contenido         | campaigns, campaign_team, campaign_categories, posts, post_status_history, content_ideas |
| Analítica         | post_metrics, brand_scores, reports                             |
| Auditoría         | audit_log, notifications                                        |

## Decisiones clave

- Soft delete con `deleted_at` en todas las tablas principales
- UUIDs como PKs (excepción: audit_log usa BIGINT)
- `brand_id` presente en todas las tablas de negocio (multi-tenancy por row)
- `post_status_history` es inmutable (no hay UPDATE ni DELETE)
- `audit_log` es inmutable y tiene PK BIGINT por volumen
