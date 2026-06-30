# ADR-0003 — REST síncrono entre microservicios

**Decisión**: HTTP interno. Sin Kafka ni mensajería asíncrona.

**Razón**: Complejidad operativa fuera del alcance del hackathon.

**Mitigación**: Circuit breaker con `opossum`. Correlation ID (X-Request-ID) propagado entre servicios.
