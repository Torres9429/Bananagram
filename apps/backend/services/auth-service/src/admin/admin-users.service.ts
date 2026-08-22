import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { UserStatus } from '../../node_modules/.prisma-client';
import * as argon2 from 'argon2';
import { AuthRepository } from '../auth/auth.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SELECT_SAFE = {
  id: true,
  email: true,
  status: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
  createdAt: true,
  updatedAt: true,
} as const;

const ROLE_ALIASES: Record<string, string> = {
  cliente: 'cliente',
  cm: 'community_manager',
  community_manager: 'community_manager',
  disenador: 'disenador',
  diseñador: 'disenador',
  administrador: 'administrador',
};

@Injectable()
export class AdminUsersService {
  constructor(private readonly authRepo: AuthRepository) {}

  listUsers(roleName?: string): Promise<any> {
    const normalizedRoleName = roleName ? this.resolveRoleName(roleName) : undefined;

    return prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(normalizedRoleName ? { roles: { some: { role: { name: normalizedRoleName } } } } : {}),
      },
      select: SELECT_SAFE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUser(id: string): Promise<any> {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: SELECT_SAFE });
    if (!user) throw new NotFoundException(`User ${id} no existe`);
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<any> {
    const role = await prisma.role.findUnique({ where: { name: dto.roleName } });
    if (!role) throw new BadRequestException(`Rol '${dto.roleName}' no existe`);

    const passwordHash = await argon2.hash(dto.password);
    try {
      return await prisma.user.create({
        data: { email: dto.email, passwordHash, roles: { create: [{ roleId: role.id }] } },
        select: SELECT_SAFE,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) throw new ConflictException('Email ya registrado');
      throw error;
    }
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<any> {
    await this.getUser(id);

    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { email: dto.email, status: dto.status as UserStatus | undefined },
        select: SELECT_SAFE,
      });
      // Bug real (2026-08-20): suspender/despendientizar a un usuario desde
      // el panel nunca cortaba su sesión activa — con el login/refresh ya
      // validando status (auth.service.ts), un refresh futuro lo bloquea,
      // pero sin esto seguía teniendo un access token válido (hasta 15 min)
      // y, más grave, un refresh token todavía sin usar que revive la
      // sesión en el momento en que se llame — se revoca de una vez, mismo
      // criterio que ya usa removeUser().
      if (dto.status && dto.status !== 'active') {
        await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return updated;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) throw new ConflictException('Email ya registrado');
      throw error;
    }
  }

  async removeUser(id: string) {
    await this.getUser(id);
    // Baja lógica + corta cualquier sesión activa (mismo criterio que un
    // reset de contraseña forzado).
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
      prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { removed: true };
  }

  // --- Multirol: asignación puntual (POST/DELETE /admin/users/:id/roles) ---

  async assignRole(userId: string, roleId: string) {
    await this.getUser(userId);
    await this.authRepo.addRoleToUser(userId, roleId);
    return this.getUser(userId);
  }

  async unassignRole(userId: string, roleId: string) {
    await this.getUser(userId);
    await this.authRepo.removeRoleFromUser(userId, roleId);
    return this.getUser(userId);
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
  }

  private resolveRoleName(roleName: string): string {
    const normalized = ROLE_ALIASES[roleName.trim().toLowerCase()];
    if (!normalized) {
      throw new BadRequestException(`Rol '${roleName}' no existe`);
    }

    return normalized;
  }
}
