import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { getAyrshareConfig, getAyrshareErrorMessage } from './ayrshare.util';

type CurrentUser = { sub: string; roles: string[] };
type Brand = Awaited<ReturnType<typeof prisma.brand.create>>;
type BrandResponse = Omit<Brand, 'refId' | 'profileKey'> & { connectUrl?: string };

type AyrshareCreateProfileResponse =
  | { status: 'success'; title: string; refId: string; profileKey: string; messagingActive?: boolean }
  | { action?: string; status: 'error'; code: number; message: string };

type AyrshareGenerateJwtResponse =
  | { status: 'success'; title: string; token: string; url: string; emailSent?: boolean; expiresIn?: string }
  | { action?: string; status: 'error'; code: number; message: string };

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  // Multi-tenancy row-level (ADR-0001): cada rol ve solo las marcas con las
  // que tiene relación — el Administrador ve todas, el resto solo las
  // suyas (dueño) o las de campañas donde participa como CM/Diseñador.
  async listBrands(user: CurrentUser): Promise<BrandResponse[]> {
    if (user.roles.includes('administrador')) {
      const brands = await prisma.brand.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
      return brands.map((brand) => this.toBrandResponse(brand));
    }

    const brands = await prisma.brand.findMany({
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
    return brands.map((brand) => this.toBrandResponse(brand));
  }

  async getBrand(id: string): Promise<BrandResponse> {
    const brand = await prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!brand) throw new NotFoundException(`Brand ${id} no existe`);
    return this.toBrandResponse(brand);
  }

  // La autoridad de SI puede crear una marca es el permiso RBAC
  // (`marcas:crear`, ya validado por PermissionGuard) — no un chequeo de
  // rol. No hay recurso ajeno que proteger aquí: la marca todavía no
  // existe, y ownerId se toma del JWT (user.sub), nunca del body — nadie
  // puede crear una marca a nombre de otro usuario, pero cualquiera con el
  // permiso se vuelve dueño de lo que él mismo crea. Decisión de producto
  // confirmada 2026-08-17 (antes exigía roles.includes('cliente') a mano,
  // dejando `marcas:crear` sin efecto para cualquier otro rol).
  async createBrand(dto: CreateBrandDto, user: CurrentUser): Promise<BrandResponse> {
    const brand = await this.runWithUniqueGuard(() =>
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

    let profileKey: string | undefined;
    try {
      const profile = await this.createAyrshareProfile(brand.name);
      profileKey = profile.profileKey;
      const connectUrl = await this.createAyrshareConnectUrl(profile.profileKey, dto.allowedSocial);

      const updatedBrand = await prisma.brand.update({
        where: { id: brand.id },
        data: { refId: profile.refId, profileKey: profile.profileKey },
      });

      return this.toBrandResponse(updatedBrand, connectUrl);
    } catch (error) {
      if (profileKey) {
        await this.deleteAyrshareProfile(profileKey).catch((cleanupError) => {
          this.logger.warn(
            `No se pudo limpiar el perfil huérfano de Ayrshare (profileKey=${profileKey}): ${cleanupError}`,
          );
        });
      }
      await prisma.brand.update({ where: { id: brand.id }, data: { deletedAt: new Date() } });
      throw error;
    }
  }

  async updateBrand(id: string, dto: UpdateBrandDto): Promise<BrandResponse> {
    await this.getBrand(id);
    this.assertAtLeastOneProvided(dto);

    const updated = await this.runWithUniqueGuard(() =>
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
    return this.toBrandResponse(updated);
  }

  // Regenera el connectUrl de Ayrshare para una marca YA existente — a
  // diferencia de createBrand, que solo lo genera una vez al crear. Sin
  // allowedSocial explícito, ofrece todo el catálogo activo de redes (así
  // crece solo cuando el Admin agregue más redes al catálogo).
  async createConnectUrl(id: string, allowedSocial?: string[]): Promise<{ connectUrl: string }> {
    const brand = await prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!brand) throw new NotFoundException(`Brand ${id} no existe`);
    if (!brand.profileKey) {
      throw new BadRequestException('Esta marca no tiene un perfil de Ayrshare — no se puede generar un enlace de conexión');
    }

    const networks = allowedSocial?.length
      ? allowedSocial
      : (await prisma.socialNetwork.findMany({ where: { deletedAt: null }, select: { code: true } })).map((n) => n.code);

    if (!networks.length) {
      throw new BadRequestException('No hay redes sociales en el catálogo para conectar');
    }

    const connectUrl = await this.createAyrshareConnectUrl(brand.profileKey, networks);
    return { connectUrl };
  }

  // El perfil de Ayrshare se puede borrar desde el dashboard de Ayrshare sin
  // que nuestro backend se entere (no hay webhook para esto) — el
  // profileKey guardado queda huérfano y connect-url/sync empiezan a fallar
  // contra un perfil que ya no existe del lado de Ayrshare. A diferencia de
  // createBrand, aquí SÍ se reusa el mismo Brand.id (no se recrea la fila:
  // rompería la FK de Campaign/Post que ya apuntan a este brandId). Las
  // SocialAccount viejas quedan huérfanas del perfil anterior — se
  // soft-deletean (regla de negocio: nunca borrado físico) porque ya no
  // representan una conexión real; sync() las vuelve a crear tras reconectar.
  async reprovisionAyrshareProfile(id: string, allowedSocial?: string[]): Promise<{ connectUrl: string }> {
    const brand = await prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!brand) throw new NotFoundException(`Brand ${id} no existe`);

    const profile = await this.createAyrshareProfile(brand.name);
    const networks = allowedSocial?.length
      ? allowedSocial
      : (await prisma.socialNetwork.findMany({ where: { deletedAt: null }, select: { code: true } })).map((n) => n.code);
    const connectUrl = await this.createAyrshareConnectUrl(profile.profileKey, networks);

    await prisma.$transaction([
      prisma.brand.update({ where: { id }, data: { refId: profile.refId, profileKey: profile.profileKey } }),
      prisma.socialAccount.updateMany({ where: { brandId: id, deletedAt: null }, data: { deletedAt: new Date(), active: false } }),
    ]);

    return { connectUrl };
  }

  async removeBrand(id: string): Promise<BrandResponse> {
    await this.getBrand(id);
    const removed = await prisma.brand.update({ where: { id }, data: { deletedAt: new Date() } });
    return this.toBrandResponse(removed);
  }

  private toBrandResponse(brand: Brand, connectUrl?: string): BrandResponse {
    const { refId, profileKey, ...rest } = brand;
    return connectUrl ? { ...rest, connectUrl } : rest;
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
    const { apiKey, baseUrl } = getAyrshareConfig();

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
      throw new BadRequestException(getAyrshareErrorMessage(payload, 'No se pudo crear el perfil de Ayrshare'));
    }

    return { refId: payload.refId, profileKey: payload.profileKey };
  }

  private async createAyrshareConnectUrl(profileKey: string, allowedSocial: string[]): Promise<string> {
    const { apiKey, domain, privateKey, baseUrl } = getAyrshareConfig();

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
        // Sin esto, el widget de Ayrshare reusa la sesión ya autenticada del
        // navegador para esa red social — tras desconectar una cuenta y
        // pedir una nueva connectUrl, "Conectar" revinculaba la misma cuenta
        // vieja en vez de pedir login de nuevo (bug real reportado en vivo).
        // logout:true fuerza a Ayrshare a cerrar esa sesión antes de mostrar
        // la pantalla de vinculación.
        logout: true,
      }),
    });

    const payload = (await response.json()) as AyrshareGenerateJwtResponse;
    if (!response.ok || payload.status !== 'success') {
      throw new BadRequestException(getAyrshareErrorMessage(payload, 'No se pudo generar la URL de conexión de Ayrshare'));
    }

    return payload.url;
  }

  // Compensación cuando createAyrshareConnectUrl falla después de que el
  // perfil ya se creó — sin esto, queda un perfil huérfano en Ayrshare que
  // nadie más referencia (ni refId ni profileKey llegan a guardarse local).
  private async deleteAyrshareProfile(profileKey: string): Promise<void> {
    const { apiKey, baseUrl } = getAyrshareConfig();

    const response = await fetch(`${baseUrl}/profiles`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Profile-Key': profileKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as AyrshareCreateProfileResponse | Record<string, never>;
      throw new Error(getAyrshareErrorMessage(payload, 'No se pudo eliminar el perfil huérfano de Ayrshare'));
    }
  }
}
