# ADR-0004 — JWT RS256/JWKS + multi-rol + denylist en Redis

**Supera a**: [ADR-0002](./ADR-0002-jwt.md) (HS256 sin Redis, JWT de un solo rol).

**Decisión**: firma asimétrica RS256 en vez de HS256 con secreto compartido. Solo `auth-service` tiene la
llave privada (`pnpm generate-keys`, par en `keys/`, nunca commiteado); `core-service`, `alexa-service` y
el gateway verifican contra la llave pública publicada en `GET /.well-known/jwks.json` — ninguno de ellos
puede firmar tokens.

**Multi-rol**: `User.roleId` (FK escalar) reemplazado por la tabla puente `UserRole` — un usuario puede
tener N roles a la vez. Los permisos efectivos son la unión de los permisos de todos sus roles
(`AuthRepository.getPermissions`). El JWT pasa de `role: string` a `roles: string[]`.

**Hash de contraseñas**: argon2 en vez de bcrypt.

**Revocación de access tokens**: antes no existía (solo expiraban por TTL). Ahora logout revoca el `jti`
específico en una denylist de Redis (hot path, TTL = vida restante del token), con Postgres
(`RevokedAccessToken` en auth-service) como respaldo si Redis está caído. `core-service`/`alexa-service`/
el gateway consultan la misma denylist — un logout corta el acceso a todos los servicios de inmediato, sin
que ninguno de ellos toque la base de datos de auth-service.

**Gateway**: agrega rate-limit por IP (ventana fija en Redis) y validación JWT en el edge (misma denylist)
antes de proxear — antes el gateway era proxy puro sin ninguna capa de seguridad propia.

**Disponibilidad sobre estrictez**: si Redis está caído, tanto el rate-limit como la consulta a la
denylist fallan abierto (dejan pasar) en vez de tumbar el servicio — mismo criterio en los 4 puntos que
usan Redis (auth-service, core-service, alexa-service, gateway).

**Sigue vigente de ADR-0002**: access token 15 min, refresh token 7 días con rotación de un solo uso
(tabla `refresh_tokens`, detección de reuso por `familyId`).
