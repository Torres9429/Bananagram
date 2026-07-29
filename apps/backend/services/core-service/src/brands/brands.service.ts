import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

type CurrentUser = { sub: string; role: string };

@Injectable()
export class BrandsService {
  // Multi-tenancy row-level (ADR-0001): cada rol ve solo las marcas con las
  // que tiene relación — el Administrador ve todas, el resto solo las
  // suyas (dueño) o las de campañas donde participa como CM/Diseñador.
  async listBrands(user: CurrentUser) {
    if (user.role === 'administrador') {
      return prisma.brand.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
    }

    return prisma.brand.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: user.sub },
          {
            campaigns: {
              some: {
                deletedAt: null,
                OR: [{ cmId: user.sub }, { designers: { some: { userId: user.sub } } }],
              },
            },
          },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  async getBrand(id: string) {
    const brand = await prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!brand) throw new NotFoundException(`Brand ${id} no existe`);
    return brand;
  }

  // ownerId siempre es un Cliente (regla de negocio) — se toma del JWT, no
  // del body: nadie puede crear una marca a nombre de otro usuario.
  async createBrand(dto: CreateBrandDto, user: CurrentUser) {
    if (user.role !== 'cliente' && user.role !== 'administrador') {
      throw new ForbiddenException('Solo un Cliente puede crear una marca');
    }
    return this.runWithUniqueGuard(() =>
      prisma.brand.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          profileType: dto.profileType,
          categoryId: dto.categoryId,
          logoUrl: dto.logoUrl,
          primaryColor: dto.primaryColor,
          ownerId: user.sub,
        },
      }),
    );
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    await this.getBrand(id);
    this.assertAtLeastOneProvided(dto);

    return this.runWithUniqueGuard(() =>
      prisma.brand.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          profileType: dto.profileType,
          categoryId: dto.categoryId,
          logoUrl: dto.logoUrl,
          primaryColor: dto.primaryColor,
        },
      }),
    );
  }

  async removeBrand(id: string) {
    await this.getBrand(id);
    return prisma.brand.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async runWithUniqueGuard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya existe una marca con ese slug');
      }
      throw error;
    }
  }

  private assertAtLeastOneProvided(dto: object): void {
    const hasAnyValue = Object.values(dto).some((value) => value !== undefined && value !== null);
    if (!hasAnyValue) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }
  }
}
