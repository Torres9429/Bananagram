import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '@repo/backend-commons';
import { RequirePermission } from '@repo/backend-commons';
import { AdminAuditLogService } from './admin-audit-log.service';

// No existe un módulo 'auditoria' en el catálogo fijo de módulos (ver
// modules.enum.ts) — se reutiliza 'usuarios:ver' porque el contenido real
// de este log hoy es actividad de gestión de usuarios/roles/permisos. El
// audit_log de core-service (marcas/campañas/posts) sigue escribiéndose
// igual de real en su propia base, pero esta vista no lo agrega — decisión
// de alcance explícita, ver plan.
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/audit-log')
export class AuditLogController {
  constructor(private readonly auditLog: AdminAuditLogService) {}

  @Get()
  @RequirePermission('usuarios', 'ver')
  findRecent(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    return this.auditLog.listRecent(parsed && parsed > 0 && parsed <= 200 ? parsed : undefined);
  }
}
