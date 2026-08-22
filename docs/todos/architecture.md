# Arquitectura del sistema

## Microservicios

| Servicio              | Puerto | Responsabilidad                                          |
|-----------------------|--------|-----------------------------------------------------------|
| api-gateway           | 4000   | Único punto de entrada HTTP externo                        |
| auth-service          | 3001   | Login, refresh, usuarios, roles, permisos                  |
| core-service          | 3002   | Marcas, redes sociales, campañas y equipo, publicaciones, máquina de estados, calendario, cron, medios, métricas simuladas, score digital, reportes (PDF/CSV) e ideas de contenido (fusiona lo que antes eran brands/content/analytics-service) |
| alexa-service         | 3004   | BFF de la Alexa Skill, sin base de datos propia — consume las APIs de core-service y auth-service |

## ADRs

- ADR-0001: Multi-tenancy por row-level (brand_id en todas las tablas de negocio)
- ADR-0002: JWT HS256 stateless + refresh token rotation (sin Redis) — **superado por ADR-0004**
- ADR-0003: REST síncrono entre servicios + circuit breaker opossum
- ADR-0004: JWT RS256/JWKS + multi-rol + denylist de access tokens en Redis (gateway con rate-limit y
  validación JWT en el edge)
