import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { getAyrshareConfig, getAyrshareErrorMessage } from '../brands/ayrshare.util';

type AyrshareUserResponse =
  | {
      activeSocialAccounts?: string[];
      displayNames?: { platform: string; username?: string }[];
    }
  | { action?: string; status: 'error'; code: number; message: string };

@Injectable()
export class SocialAccountsService {
  private readonly logger = new Logger(SocialAccountsService.name);

  async listByBrand(brandId: string) {
    return prisma.socialAccount.findMany({
      where: { brandId, deletedAt: null },
      include: { socialNetwork: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Cierra el loop de "conectar redes": Ayrshare no manda webhook para esto
  // sin plan Premium + URL pública, así que se sincroniza a demanda contra
  // GET /user (scoped al profileKey de la marca), que devuelve qué redes
  // están activas ahora mismo — ver docs/apis/user/profile-details en
  // Ayrshare.
  async syncFromAyrshare(brandId: string) {
    const brand = await prisma.brand.findFirst({ where: { id: brandId, deletedAt: null } });
    if (!brand) throw new NotFoundException(`Brand ${brandId} no existe`);
    if (!brand.profileKey) {
      throw new BadRequestException('Esta marca todavía no conectó su perfil de Ayrshare');
    }

    const { apiKey, baseUrl } = getAyrshareConfig();
    const response = await fetch(`${baseUrl}/user`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Profile-Key': brand.profileKey,
      },
    });

    const payload = (await response.json()) as AyrshareUserResponse;
    if (!response.ok || 'status' in payload) {
      throw new BadRequestException(
        getAyrshareErrorMessage(payload as { message?: string; code?: number }, 'No se pudo consultar el estado de Ayrshare'),
      );
    }

    const activeCodes = new Set(payload.activeSocialAccounts ?? []);
    const usernameByCode = new Map((payload.displayNames ?? []).map((entry) => [entry.platform, entry.username]));

    const socialNetworks = await prisma.socialNetwork.findMany({ where: { deletedAt: null } });
    const networkByCode = new Map(socialNetworks.map((network) => [network.code, network]));

    for (const code of activeCodes) {
      const network = networkByCode.get(code);
      if (!network) {
        // Regla de negocio #8 (matching orientativo, no restrictivo): si
        // Ayrshare reporta una red que el Admin no dio de alta en el
        // catálogo local todavía, se ignora en vez de romper el sync.
        this.logger.warn(`Ayrshare reportó la red "${code}" pero no existe en el catálogo local (SocialNetwork.code)`);
        continue;
      }

      await prisma.socialAccount.upsert({
        where: { brandId_socialNetworkId: { brandId, socialNetworkId: network.id } },
        create: {
          brandId,
          socialNetworkId: network.id,
          handle: usernameByCode.get(code) ?? null,
          active: true,
        },
        update: {
          handle: usernameByCode.get(code) ?? null,
          active: true,
          deletedAt: null,
        },
      });
    }

    // Redes que estaban activas localmente pero ya no aparecen en Ayrshare
    // (el usuario las desconectó) — se marcan inactivas, no se soft-deletean:
    // desconectar no es "borrar el registro", es un cambio de estado.
    await prisma.socialAccount.updateMany({
      where: {
        brandId,
        deletedAt: null,
        active: true,
        socialNetwork: { code: { notIn: [...activeCodes] } },
      },
      data: { active: false },
    });

    return this.listByBrand(brandId);
  }
}
