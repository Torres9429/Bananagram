# Reglas de negocio críticas

1. Un CM puede estar en múltiples campañas activas sin límite
2. Un Cliente solo puede seleccionar un CM por campaña
3. El CM selecciona a los Diseñadores dentro de su campaña
4. Publicaciones rechazadas regresan a DRAFT con motivo obligatorio
5. audit_log y post_status_history son INMUTABLES
6. RBAC dinámico: privilegios en BD, no hardcodeados
7. Soft delete en todas las tablas principales
8. Matching de categorías es orientativo, no restrictivo
9. Marca y Perfil son funcionalmente idénticos (campo type)
10. El catálogo de redes lo gestiona solo el Administrador
