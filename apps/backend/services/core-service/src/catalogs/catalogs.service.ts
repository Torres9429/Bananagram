import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateSocialNetworkDto } from './dto/create-social-network.dto';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateSocialNetworkDto } from './dto/update-social-network.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@Injectable()
export class CatalogsService {
  async listCategories() {
    return prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async getCategory(id: string) {
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} no existe`);
    }

    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    this.assertNonEmptyString(dto.name, 'name');

    return this.runWithUniqueGuard(
      () =>
        prisma.category.create({
          data: { name: dto.name },
        }),
      'name',
    );
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.getCategory(id);
    this.assertAtLeastOneProvided(dto, ['name']);
    this.assertOptionalNonEmptyString(dto.name, 'name');

    return this.runWithUniqueGuard(
      () =>
        prisma.category.update({
          where: { id },
          data: { name: dto.name },
        }),
      'name',
    );
  }

  async removeCategory(id: string) {
    await this.getCategory(id);

    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listSpecialties() {
    return prisma.specialty.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async getSpecialty(id: string) {
    const specialty = await prisma.specialty.findFirst({
      where: { id, deletedAt: null },
    });

    if (!specialty) {
      throw new NotFoundException(`Specialty ${id} no existe`);
    }

    return specialty;
  }

  async createSpecialty(dto: CreateSpecialtyDto) {
    this.assertNonEmptyString(dto.name, 'name');

    return this.runWithUniqueGuard(
      () =>
        prisma.specialty.create({
          data: { name: dto.name },
        }),
      'name',
    );
  }

  async updateSpecialty(id: string, dto: UpdateSpecialtyDto) {
    await this.getSpecialty(id);
    this.assertAtLeastOneProvided(dto, ['name']);
    this.assertOptionalNonEmptyString(dto.name, 'name');

    return this.runWithUniqueGuard(
      () =>
        prisma.specialty.update({
          where: { id },
          data: { name: dto.name },
        }),
      'name',
    );
  }

  async removeSpecialty(id: string) {
    await this.getSpecialty(id);

    return prisma.specialty.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listSocialNetworks() {
    return prisma.socialNetwork.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async getSocialNetwork(id: string) {
    const socialNetwork = await prisma.socialNetwork.findFirst({
      where: { id, deletedAt: null },
    });

    if (!socialNetwork) {
      throw new NotFoundException(`SocialNetwork ${id} no existe`);
    }

    return socialNetwork;
  }

  async createSocialNetwork(dto: CreateSocialNetworkDto) {
    this.assertNonEmptyString(dto.name, 'name');
    this.assertNonEmptyString(dto.code, 'code');
    const baseEngagementRate = this.parseFiniteNumber(dto.baseEngagementRate, 'baseEngagementRate');

    return this.runWithUniqueGuard(
      () =>
        prisma.socialNetwork.create({
          data: {
            name: dto.name,
            code: dto.code,
            baseEngagementRate,
          },
        }),
      'code',
    );
  }

  async updateSocialNetwork(id: string, dto: UpdateSocialNetworkDto) {
    await this.getSocialNetwork(id);
    this.assertAtLeastOneProvided(dto, ['name', 'code', 'baseEngagementRate']);
    this.assertOptionalNonEmptyString(dto.name, 'name');
    this.assertOptionalNonEmptyString(dto.code, 'code');
    const baseEngagementRate =
      dto.baseEngagementRate === undefined
        ? undefined
        : this.parseFiniteNumber(dto.baseEngagementRate, 'baseEngagementRate');

    return this.runWithUniqueGuard(
      () =>
        prisma.socialNetwork.update({
          where: { id },
          data: {
            name: dto.name,
            code: dto.code,
            baseEngagementRate,
          },
        }),
      'code',
    );
  }

  async removeSocialNetwork(id: string) {
    await this.getSocialNetwork(id);

    return prisma.socialNetwork.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async runWithUniqueGuard<T>(operation: () => Promise<T>, fieldName: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(`Ya existe un registro con ese ${fieldName}`);
      }

      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
  }

  private assertNonEmptyString(value: unknown, fieldName: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} es obligatorio`);
    }
  }

  private assertOptionalNonEmptyString(value: unknown, fieldName: string): void {
    if (value === undefined) {
      return;
    }

    this.assertNonEmptyString(value, fieldName);
  }

  private assertAtLeastOneProvided(dto: object, fieldNames: string[]): void {
    const hasAnyValue = fieldNames.some((fieldName) => {
      const value = (dto as Record<string, unknown>)[fieldName];
      return value !== undefined && value !== null;
    });

    if (!hasAnyValue) {
      throw new BadRequestException(`Debes enviar al menos un campo para actualizar`);
    }
  }

  private parseFiniteNumber(value: unknown, fieldName: string): number {
    const parsedValue = typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(parsedValue) || !Number.isFinite(parsedValue) || parsedValue < 0) {
      throw new BadRequestException(`${fieldName} debe ser un número mayor o igual a 0`);
    }

    return parsedValue;
  }
}