# Base de datos

PostgreSQL · Prisma ORM · 18 tablas en 3FN

## Dominios

| Dominio           | Tablas                                                          |
|-------------------|-----------------------------------------------------------------|
| Identidad/acceso  | users, roles, actions, modules, role_permissions, refresh_tokens|
| Catálogos         | categories, specialties, social_networks                        |
| Pivotes usuario   | user_categories, user_specialties                               |
| Marcas            | brands, brand_profiles, brand_users                             |
| Contenido         | campaigns, campaign_team, campaign_categories, posts, post_status_history |
| Analítica         | post_metrics, brand_scores, reports                             |
| Auditoría         | audit_log, notifications                                        |

## Decisiones clave

- Soft delete con `deleted_at` en todas las tablas principales
- UUIDs como PKs (excepción: audit_log usa BIGINT)
- `brand_id` presente en todas las tablas de negocio (multi-tenancy por row)
- `post_status_history` es inmutable (no hay UPDATE ni DELETE)
- `audit_log` es inmutable y tiene PK BIGINT por volumen
