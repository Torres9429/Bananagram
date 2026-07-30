import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

type CurrentUser = { sub: string; role: string };
type BrandWithConnection = Awaited<ReturnType<typeof prisma.brand.create>> & { connectUrl: string };

type AyrshareCreateProfileResponse =
  | { status: 'success'; title: string; refId: string; profileKey: string; messagingActive?: boolean }
  | { action?: string; status: 'error'; code: number; message: string };

type AyrshareGenerateJwtResponse =
  | { status: 'success'; title: string; token: string; url: string; emailSent?: boolean; expiresIn?: string }
  | { action?: string; status: 'error'; code: number; message: string };

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
  async createBrand(dto: CreateBrandDto, user: CurrentUser): Promise<BrandWithConnection> {
    if (user.role !== 'cliente' && user.role !== 'administrador') {
      throw new ForbiddenException('Solo un Cliente puede crear una marca');
    }

    const brand = await this.runWithUniqueGuard(() =>
      prisma.brand.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          profileType: dto.profileType,
          logoUrl: dto.logoUrl,
          primaryColor: dto.primaryColor,
          ownerId: user.sub,
        },
      }),
    );

    try {
      const profile = await this.createAyrshareProfile(brand.name);
      const connectUrl = await this.createAyrshareConnectUrl(profile.profileKey, dto.allowedSocial);

      const updatedBrand = await prisma.brand.update({
        where: { id: brand.id },
        data: { refId: profile.refId, profileKey: profile.profileKey } as any,
      });

      return { ...updatedBrand, connectUrl };
    } catch (error) {
      await prisma.brand.update({ where: { id: brand.id }, data: { deletedAt: new Date() } });
      throw error;
    }
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

  private async createAyrshareProfile(title: string): Promise<{ refId: string; profileKey: string }> {
    const { apiKey, baseUrl } = this.getAyrshareConfig();

    const response = await fetch(`${baseUrl}/profiles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    const payload = (await response.json()) as AyrshareCreateProfileResponse;
    if (!response.ok || payload.status !== 'success') {
      throw new BadRequestException(this.getAyrshareErrorMessage(payload, 'No se pudo crear el perfil de Ayrshare'));
    }

    return { refId: payload.refId, profileKey: payload.profileKey };
  }

  private async createAyrshareConnectUrl(profileKey: string, allowedSocial: string[]): Promise<string> {
    const { apiKey, domain, privateKey, baseUrl } = this.getAyrshareConfig();

    const response = await fetch(`${baseUrl}/profiles/generateJWT`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        privateKey,
        profileKey,
        allowedSocial,
      }),
    });

    const payload = (await response.json()) as AyrshareGenerateJwtResponse;
    if (!response.ok || payload.status !== 'success') {
      throw new BadRequestException(this.getAyrshareErrorMessage(payload, 'No se pudo generar la URL de conexión de Ayrshare'));
    }

    return payload.url;
  }

  private getAyrshareConfig(): { apiKey: string; domain: string; privateKey: string; baseUrl: string } {
    const apiKey = process.env.AYRSHARE_API_KEY;
    const domain = process.env.AYRSHARE_DOMAIN;
    const privateKey = Buffer.from(
        process.env.AYRSHARE_PRIVATE_KEY!,
        'base64',
      ).toString('utf8');
    const baseUrl = process.env.AYRSHARE_API_BASE_URL;

    if (!apiKey) {
      throw new BadRequestException('Falta configurar AYRSHARE_API_KEY');
    }
    if (!domain) {
      throw new BadRequestException('Falta configurar AYRSHARE_DOMAIN');
    }
    if (!privateKey) {
      throw new BadRequestException('Falta configurar AYRSHARE_PRIVATE_KEY');
    }
    if (!baseUrl) {
      throw new BadRequestException('Falta configurar AYRSHARE_API_BASE_URL');
    }

    return { apiKey, domain, privateKey, baseUrl };
  }

  private getAyrshareErrorMessage(
    payload: { message?: string; code?: number; status?: string },
    fallback: string,
  ): string {
    const prefix = payload.code ? `Ayrshare ${payload.code}: ` : '';
    return `${prefix}${payload.message ?? fallback}`;
  }
}
