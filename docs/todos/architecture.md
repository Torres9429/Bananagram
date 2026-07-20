# Arquitectura del sistema

## Microservicios

| Servicio              | Puerto | Responsabilidad                                          |
|-----------------------|--------|-----------------------------------------------------------|
| api-gateway           | 4000   | Único punto de entrada HTTP externo                        |
| auth-service          | 3001   | Login, refresh, usuarios, roles, permisos                  |
| brands-service        | 3002   | Marcas, perfiles por red, brand_users, campañas y equipo    |
| content-service       | 3003   | Publicaciones, máquina de estados, calendario, cron         |
| analytics-service     | 3005   | Métricas simuladas, score digital y reportes (PDF/CSV)      |

## ADRs

- ADR-0001: Multi-tenancy por row-level (brand_id en todas las tablas de negocio)
- ADR-0002: JWT HS256 stateless + refresh token rotation (sin Redis)
- ADR-0003: REST síncrono entre servicios + circuit breaker opossum
