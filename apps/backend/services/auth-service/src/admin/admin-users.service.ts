import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { UserStatus } from '../../node_modules/.prisma-client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SELECT_SAFE = {
  id: true,
  email: true,
  status: true,
  roleId: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  listUsers(): Promise<any> {
    return prisma.user.findMany({ where: { deletedAt: null }, select: SELECT_SAFE, orderBy: { createdAt: 'desc' } });
  }

  async getUser(id: string): Promise<any> {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: SELECT_SAFE });
    if (!user) throw new NotFoundException(`User ${id} no existe`);
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<any> {
    const role = await prisma.role.findUnique({ where: { name: dto.roleName } });
    if (!role) throw new BadRequestException(`Rol '${dto.roleName}' no existe`);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      return await prisma.user.create({
        data: { email: dto.email, passwordHash, roleId: role.id },
        select: SELECT_SAFE,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) throw new ConflictException('Email ya registrado');
      throw error;
    }
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<any> {
    await this.getUser(id);

    let roleId: string | undefined;
    if (dto.roleName) {
      const role = await prisma.role.findUnique({ where: { name: dto.roleName } });
      if (!role) throw new BadRequestException(`Rol '${dto.roleName}' no existe`);
      roleId = role.id;
    }

    try {
      return await prisma.user.update({
        where: { id },
        data: { email: dto.email, roleId, status: dto.status as UserStatus | undefined },
        select: SELECT_SAFE,
      });
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

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
  }
}
