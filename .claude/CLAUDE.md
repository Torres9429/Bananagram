# Contexto global — Gestor de Redes Sociales y Puntuación Digital

Stack: Next.js (MFE host) + NestJS (microservicios) + PostgreSQL + Prisma + Turborepo

## Reglas críticas
- NUNCA hardcodear permisos: viven en role_permissions (BD)
- NUNCA borrar registros físicamente: usar deleted_at (soft delete)
- NUNCA exponer ANTHROPIC_API_KEY al frontend
- El creador de una publicación NO puede aprobarla (validar backend)
- post_status_history y audit_log son INMUTABLES

## Privilegios dinámicos
Decorator: @RequirePermission('módulo', 'acción')
Endpoint: GET /me/permissions → fuente de verdad del menú frontend
Hook: usePermissions() en Next.js

## Fórmula score digital
Score = (Consistencia×0.30) + (Engagement×0.40) + (Frecuencia×0.30)
