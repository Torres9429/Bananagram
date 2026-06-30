# Convenciones de base de datos

- Todas las tablas de negocio tienen brand_id UUID NOT NULL FK → brands
- Soft delete con deleted_at (nunca borrar físicamente datos de negocio)
- Timestamps created_at y updated_at en todas las tablas
- UUIDs como primary keys (no integers), excepción: audit_log usa BIGINT
- Índices en brand_id, user_id, status y created_at en tablas grandes
- 18 tablas en 3FN, motor PostgreSQL (AWS RDS en producción)
