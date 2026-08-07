# ADR-0002 — JWT stateless + refresh token rotation

> **SUPERADO por [ADR-0004](./ADR-0004-jwt-rs256-multirol.md)** (2026-08-05): la firma pasó de HS256 a
> RS256/JWKS, se agregó denylist de access tokens en Redis, y el JWT pasó a multi-rol (`roles[]` en vez
> de `role`). Este documento se conserva como referencia histórica de la decisión original.

**Decisión (histórica)**: HS256 con secreto compartido. Sin Redis. Sin OIDC/JWKS.

**Access token**: 15 min. **Refresh token**: 7 días, UUID en tabla refresh_tokens, single-use con rotación
(esta parte sigue vigente, no cambió).

**JWT contiene (histórico)**: userId, email, role, brandIds[], permissions{}
