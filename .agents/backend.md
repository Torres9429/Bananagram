# Convenciones NestJS

- Un módulo por dominio dentro de cada microservicio
- Controladores solo coordinan: reciben request → llaman servicio → devuelven respuesta
- Servicios contienen la lógica de negocio y pueden lanzar excepciones HTTP de Nest directo
  (`NotFoundException`, `ConflictException`, etc. — patrón idiomático de Nest, ver
  `docs/backend/guia-nuevos-modulos-backend.md` §5). El `HttpExceptionFilter` las formatea sin importar
  de dónde se lancen
- Repositorio opcional: úsalo cuando las queries tengan complejidad real que justifique la capa (caso
  `AuthRepository`); para CRUD simple, Prisma directo en el service está bien (caso `CatalogsService`)
- Guards en endpoints protegidos: `JwtAuthGuard` siempre; `BrandAccessGuard` cuando el endpoint toca un
  recurso de una marca específica; `PermissionGuard` sigue sin adoptarse en ningún servicio todavía
- DTOs con class-validator en todos los endpoints que reciben body
- Transiciones inválidas de post → 422 | Rechazo sin comentario → 400 | Auto-aprobación → 403
