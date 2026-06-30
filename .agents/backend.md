# Convenciones NestJS

- Un módulo por dominio dentro de cada microservicio
- Controladores solo coordinan: reciben request → llaman servicio → devuelven respuesta
- Servicios contienen la lógica de negocio
- Repositorios abstraen el acceso a Prisma
- Guards en TODOS los endpoints protegidos: JwtAuthGuard, BrandAccessGuard, PermissionGuard
- DTOs con class-validator en todos los endpoints que reciben body
- Nunca lanzar errores HTTP desde los servicios; solo desde controladores o filtros
- Transiciones inválidas de post → 422 | Rechazo sin comentario → 400 | Auto-aprobación → 403
