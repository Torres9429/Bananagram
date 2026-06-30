# ADR-0002 — JWT stateless + refresh token rotation

**Decisión**: HS256 con secreto compartido. Sin Redis. Sin OIDC/JWKS.

**Access token**: 15 min. **Refresh token**: 7 días, UUID en tabla refresh_tokens, single-use con rotación.

**JWT contiene**: userId, email, role, brandIds[], permissions{}
