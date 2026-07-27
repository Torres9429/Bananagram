import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthRepository {
  findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { role: true },
    });
  }

  findRoleByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  }

  createUser(email: string, passwordHash: string, roleId: string) {
    return prisma.user.create({
      data: { email, passwordHash, roleId },
      include: { role: true },
    });
  }

  async getPermissions(roleId: string): Promise<Record<string, string[]>> {
    const perms = await prisma.rolePermission.findMany({
      where: { roleId, allowed: true },
      include: { module: true, action: true },
    });
    return perms.reduce((acc: Record<string, string[]>, p) => {
      const mod = p.module.slug;
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(p.action.slug);
      return acc;
    }, {});
  }

  createRefreshToken(userId: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return prisma.refreshToken.create({
      data: { token: uuidv4(), userId, expiresAt },
    });
  }

  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { role: true } } },
    });
  }

  markTokenUsed(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { usedAt: new Date() } });
  }

  revokeAllTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
