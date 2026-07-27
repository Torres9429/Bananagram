import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class AdminRolesService {
  constructor(private readonly permissions: PermissionsService) {}
  listRoles() {
    return prisma.role.findMany({
      where: { deletedAt: null },
      include: { permissions: { include: { module: true, action: true } } },
    });
  }

  async getRole(id: string) {
    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: { permissions: { include: { module: true, action: true } } },
    });
    if (!role) throw new NotFoundException(`Role ${id} no existe`);
    return role;
  }

  listModules() {
    return prisma.module.findMany({ orderBy: { slug: 'asc' } });
  }

  listActions() {
    return prisma.action.findMany({ orderBy: { slug: 'asc' } });
  }

  // El catálogo module/action + la matriz role_permissions viven en BD (ver
  // CLAUDE.md: "NUNCA hardcodear permisos") — este es el único punto de
  // escritura de esa matriz vía HTTP.
  async updateRolePermission(roleId: string, moduleSlug: string, actionSlug: string, allowed: boolean) {
    await this.getRole(roleId);

    const module = await prisma.module.findUnique({ where: { slug: moduleSlug } });
    if (!module) throw new BadRequestException(`Módulo '${moduleSlug}' no existe`);

    const action = await prisma.action.findUnique({ where: { slug: actionSlug } });
    if (!action) throw new BadRequestException(`Acción '${actionSlug}' no existe`);

    return this.permissions.updateRolePermission(roleId, module.id, action.id, allowed);
  }
}
