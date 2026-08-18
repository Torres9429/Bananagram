import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class AdminRolesService {
  constructor(private readonly permissions: PermissionsService) {}
  // Bug real encontrado en vivo: sin el where en el include, una fila de
  // RolePermission con allowed:false (ej. tras apagar un switch) seguía
  // apareciendo en role.permissions[] — el admin-front la contaba como
  // "otorgado" solo por existir la fila, sin mirar el booleano, así que un
  // permiso apagado nunca se veía apagado. auth.repository.ts.getPermissions
  // (lo que arma el JWT real) ya filtraba bien allowed:true — la aplicación
  // real del permiso nunca estuvo mal, solo esta vista de admin.
  listRoles() {
    return prisma.role.findMany({
      where: { deletedAt: null },
      include: { permissions: { where: { allowed: true }, include: { module: true, action: true } } },
    });
  }

  async getRole(id: string) {
    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: { permissions: { where: { allowed: true }, include: { module: true, action: true } } },
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

  // Los roles son parte de la tabla de permisos, no código — el admin debe
  // poder crear uno nuevo sin que nadie toque el seed. Nace sin ningún
  // RolePermission (tabla en blanco): el admin decide todo desde la matriz
  // después, nada se pre-asigna.
  async createRole(dto: CreateRoleDto) {
    try {
      return await prisma.role.create({ data: { name: dto.name.trim() } });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) throw new ConflictException(`Ya existe un rol llamado '${dto.name}'`);
      throw error;
    }
  }

  // El catálogo module/action + la matriz role_permissions viven en BD (ver
  // CLAUDE.md: "NUNCA hardcodear permisos") — este es el único punto de
  // escritura de esa matriz vía HTTP.
  //
  // Cascada ver↔(cualquier otra acción), genérica por módulo — no es un caso
  // especial de "ver+editar": aplica a CUALQUIER acción que no sea 'ver'
  // (crear, editar, eliminar, aprobar, rechazar, asignar, exportar,
  // configurar), para cualquier módulo. No tiene sentido conceder
  // 'metricas:exportar' sin 'metricas:ver', así que se activa sola; y si se
  // apaga 'ver', ninguna otra acción de ese módulo puede seguir teniendo
  // sentido, así que se apagan todas. Vive aquí (no solo en el frontend)
  // porque este es el único punto real de escritura de la tabla — así queda
  // protegido también si algo más llama al endpoint directo.
  async updateRolePermission(roleId: string, moduleSlug: string, actionSlug: string, allowed: boolean) {
    await this.getRole(roleId);

    const module = await prisma.module.findUnique({ where: { slug: moduleSlug } });
    if (!module) throw new BadRequestException(`Módulo '${moduleSlug}' no existe`);

    const action = await prisma.action.findUnique({ where: { slug: actionSlug } });
    if (!action) throw new BadRequestException(`Acción '${actionSlug}' no existe`);

    if (allowed && actionSlug !== 'ver') {
      const verAction = await prisma.action.findUnique({ where: { slug: 'ver' } });
      if (verAction) {
        await this.permissions.updateRolePermission(roleId, module.id, verAction.id, true);
      }
    }

    const result = await this.permissions.updateRolePermission(roleId, module.id, action.id, allowed);

    if (!allowed && actionSlug === 'ver') {
      const otherGranted = await prisma.rolePermission.findMany({
        where: { roleId, moduleId: module.id, allowed: true, actionId: { not: action.id } },
      });
      for (const rp of otherGranted) {
        await this.permissions.updateRolePermission(roleId, module.id, rp.actionId, false);
      }
    }

    return result;
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
  }
}
