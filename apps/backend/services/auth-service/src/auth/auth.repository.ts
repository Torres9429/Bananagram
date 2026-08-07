import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { v4 as uuidv4 } from 'uuid';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type UserWithRoles = {
  id: string;
  email: string;
  passwordHash: string;
  roles: { role: { id: string; name: string } }[];
};

type RotateResult =
  | { status: 'not_found' }
  | { status: 'reused' }
  | { status: 'rotated'; user: UserWithRoles; refreshToken: { token: string } };

@Injectable()
export class AuthRepository {
  findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
  }

  findRoleByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  }

  // Multirol: un usuario nace con uno o varios roles (el auto-registro
  // público siempre manda un solo id; el alta desde Admin también, hoy —
  // roles adicionales se agregan después vía addRoleToUser).
  createUser(email: string, passwordHash: string, roleIds: string[]) {
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { include: { role: true } } },
    });
  }

  // Los privilegios efectivos de un usuario son la UNIÓN de los permisos de
  // TODOS sus roles — un Set por módulo evita duplicar la misma acción si
  // dos roles comparten el mismo permiso.
  async getPermissions(roleIds: string[]): Promise<Record<string, string[]>> {
    const perms = await prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds }, allowed: true },
      include: { module: true, action: true },
    });
    const byModule: Record<string, Set<string>> = {};
    for (const p of perms) {
      const mod = p.module.slug;
      if (!byModule[mod]) byModule[mod] = new Set();
      byModule[mod].add(p.action.slug);
    }
    return Object.fromEntries(Object.entries(byModule).map(([mod, set]) => [mod, [...set]]));
  }

  // Nueva sesión (login/register): nace su propia familyId. Todo lo que
  // rote a partir de este token hereda esa familyId (ver rotateRefreshToken).
  createRefreshToken(userId: string) {
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    return prisma.refreshToken.create({
      data: { token: uuidv4(), userId, familyId: uuidv4(), expiresAt },
    });
  }

  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });
  }

  // Consumir + crear el reemplazo en una sola transacción: si dos requests
  // rotan el mismo token en paralelo, solo uno gana el UPDATE condicional
  // (usedAt: null) y el otro cae en la rama de reuso, que revoca la familia
  // entera — incluido el token que sí ganó la carrera. Es el trade-off
  // documentado por ControlAcceso (GUIA.md): prioriza detectar robo sobre
  // tolerar una carrera legítima entre pestañas.
  async rotateRefreshToken(oldToken: string, newToken: string): Promise<RotateResult> {
    return prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { token: oldToken },
        include: { user: { include: { roles: { include: { role: true } } } } },
      });
      if (!stored) return { status: 'not_found' };

      const consumed = await tx.refreshToken.updateMany({
        where: { id: stored.id, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      if (consumed.count !== 1) {
        await tx.refreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { status: 'reused' };
      }

      const created = await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          token: newToken,
          familyId: stored.familyId,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
      });

      return { status: 'rotated', user: stored.user, refreshToken: created };
    });
  }

  revokeAllTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  createPasswordResetToken(userId: string) {
    return prisma.passwordResetToken.create({
      data: {
        userId,
        token: uuidv4(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
  }

  findValidPasswordResetToken(token: string) {
    return prisma.passwordResetToken.findFirst({
      where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async consumePasswordResetToken(id: string, userId: string, passwordHash: string) {
    await prisma.$transaction([
      prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Cambiar la contraseña invalida todas las sesiones activas: si alguien
      // más tenía el password viejo (o robó el refresh token), queda fuera.
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // --- Multirol: asignación puntual de roles a un usuario ya existente ---
  // (usado por POST/DELETE /admin/users/:id/roles — ver admin-users.service.ts)

  async addRoleToUser(userId: string, roleId: string) {
    try {
      return await prisma.userRole.create({
        data: { userId, roleId },
        include: { role: true },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('El usuario ya tiene ese rol');
      }
      throw error;
    }
  }

  async removeRoleFromUser(userId: string, roleId: string) {
    // Un usuario sin roles se queda sin permisos y con un JWT inútil para
    // depurar — nunca se permite dejarlo en ese estado.
    const count = await prisma.userRole.count({ where: { userId } });
    if (count <= 1) {
      throw new BadRequestException('El usuario debe conservar al menos un rol');
    }
    try {
      return await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('El usuario no tiene ese rol asignado');
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
  }

  private isNotFoundError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025';
  }
}
