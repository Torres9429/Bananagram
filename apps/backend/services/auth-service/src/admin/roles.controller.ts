import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminRolesService } from './admin-roles.service';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin')
export class RolesController {
  constructor(private readonly roles: AdminRolesService) {}

  @Get('roles')
  @RequirePermission('privilegios', 'ver')
  findAll() {
    return this.roles.listRoles();
  }

  @Get('roles/:id')
  @RequirePermission('privilegios', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.getRole(id);
  }

  @Get('modules')
  @RequirePermission('privilegios', 'ver')
  listModules() {
    return this.roles.listModules();
  }

  @Get('actions')
  @RequirePermission('privilegios', 'ver')
  listActions() {
    return this.roles.listActions();
  }

  @Patch('roles/:id/permissions')
  @RequirePermission('privilegios', 'editar')
  updatePermission(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRolePermissionDto) {
    return this.roles.updateRolePermission(id, dto.moduleSlug, dto.actionSlug, dto.allowed);
  }
}
