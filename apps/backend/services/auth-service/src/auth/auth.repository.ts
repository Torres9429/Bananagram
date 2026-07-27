import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { v4 as uuidv4 } from 'uuid';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type RotateResult =
  | { status: 'not_found' }
  | { status: 'reused' }
  | { status: 'rotated'; user: { id: string; email: string; roleId: string; role: { name: string } }; refreshToken: { token: string } };

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
      include: { user: { include: { role: true } } },
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
        include: { user: { include: { role: true } } },
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
}
