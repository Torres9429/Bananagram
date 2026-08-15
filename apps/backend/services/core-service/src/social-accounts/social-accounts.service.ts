import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { getAyrshareConfig, getAyrshareErrorMessage } from '../brands/ayrshare.util';

type CurrentUser = { sub: string; roles: string[] };

type AyrshareUserResponse =
  | {
      activeSocialAccounts?: string[];
      displayNames?: { platform: string; username?: string }[];
    }
  | { action?: string; status: 'error'; code: number; message: string };

// Shape a confirmar en vivo (no hay doc previa verificada en este proyecto) —
// se prueba primero con curl contra la cuenta real antes de conectar el
// botón del frontend, mismo criterio que se usó para descubrir el límite de
// perfiles de Ayrshare en la Fase D. A diferencia de fetchFollowerCounts,
// esta llamada NUNCA debe fallar en silencio: si Ayrshare la rechaza, el
// error se propaga (no se marca nada como desconectado localmente).
type AyrshareDeactivateResponse =
  | { status: 'success' }
  | { action?: string; status: 'error'; code: number; message: string };

// Shape confirmada en vivo contra POST /analytics/social: los datos vienen
// un nivel más anidados de lo que se asumió originalmente
// (payload[code].analytics.followersCount, no payload[code].followersCount)
// — no es una restricción de plan, era un bug de lectura.
type AyrshareAnalyticsResponse = Record<
  string,
  { analytics?: { followersCount?: number; followers?: number } } | undefined
>;

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

  // Crecimiento de seguidores es información de negocio del dueño de la
  // marca — mismo criterio (más estricto que BrandAccessGuard) que
  // score.service.ts.assertIsBrandOwnerOrAdmin: solo dueño o Administrador,
  // nunca CM ni Diseñador aunque tengan acceso a alguna campaña de la marca.
  async assertIsBrandOwnerOrAdmin(brandId: string, user: CurrentUser): Promise<void> {
    if (user.roles.includes('administrador')) return;
    const brand = await prisma.brand.findFirst({ where: { id: brandId, deletedAt: null }, select: { ownerId: true } });
    if (!brand) throw new NotFoundException(`Brand ${brandId} no existe`);
    if (brand.ownerId !== user.sub) {
      throw new ForbiddenException('Solo el dueño de la marca puede ver el crecimiento de sus cuentas conectadas');
    }
  }

  async getMetricsHistory(brandId: string, from?: Date, to?: Date) {
    return prisma.socialAccountMetricSnapshot.findMany({
      where: {
        socialAccount: { brandId },
        capturedAt: { gte: from, lte: to },
      },
      include: { socialAccount: { include: { socialNetwork: true } } },
      orderBy: { capturedAt: 'asc' },
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
    const followersByCode = await this.fetchFollowerCounts(brand.profileKey, [...activeCodes]);

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

      const followers = followersByCode.get(code);

      await prisma.socialAccount.upsert({
        where: { brandId_socialNetworkId: { brandId, socialNetworkId: network.id } },
        create: {
          brandId,
          socialNetworkId: network.id,
          handle: usernameByCode.get(code) ?? null,
          active: true,
          ...(followers !== undefined ? { followers } : {}),
        },
        update: {
          handle: usernameByCode.get(code) ?? null,
          active: true,
          deletedAt: null,
          // Sin dato de seguidores nuevo, no se toca el valor ya guardado
          // (mejor mantener el último conocido que resetearlo a 0).
          ...(followers !== undefined ? { followers } : {}),
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

  // Desconectar una red puntual (a diferencia del sync de arriba, que solo
  // refleja lo que Ayrshare ya reporta) — el usuario lo pide desde la UI.
  // No borra el registro (deletedAt): mismo criterio que ya usa el sync para
  // redes que Ayrshare deja de reportar, "desconectar es un cambio de
  // estado, no un borrado".
  async disconnect(brandId: string, socialAccountId: string) {
    const account = await prisma.socialAccount.findFirst({
      where: { id: socialAccountId, brandId, deletedAt: null },
      include: { socialNetwork: true },
    });
    if (!account) throw new NotFoundException(`Cuenta social ${socialAccountId} no existe para esta marca`);

    const brand = await prisma.brand.findFirst({ where: { id: brandId, deletedAt: null } });
    if (!brand?.profileKey) {
      throw new BadRequestException('Esta marca todavía no conectó su perfil de Ayrshare');
    }

    await this.deactivateAyrshareSocialAccount(brand.profileKey, account.socialNetwork.code);

    await prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: { active: false, disconnectedAt: new Date() },
    });

    return this.listByBrand(brandId);
  }

  private async deactivateAyrshareSocialAccount(profileKey: string, platform: string): Promise<void> {
    const { apiKey, baseUrl } = getAyrshareConfig();
    const response = await fetch(`${baseUrl}/profiles/social`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Profile-Key': profileKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ platform }),
    });

    const payload = (await response.json().catch(() => ({}))) as AyrshareDeactivateResponse | Record<string, never>;
    if (!response.ok || (payload as { status?: string }).status === 'error') {
      throw new BadRequestException(
        getAyrshareErrorMessage(payload as { message?: string; code?: number }, 'No se pudo desconectar la red en Ayrshare'),
      );
    }
  }

  // Best-effort: GET /user (arriba) nunca trae seguidores, solo qué redes
  // están activas. Se intenta un segundo endpoint de analíticas; si falla
  // (plan de Ayrshare sin analíticas, red no soportada, shape distinto al
  // esperado, etc.) se ignora por completo — nunca debe tumbar el resto del
  // sync, que sí es el dato crítico (qué cuentas están conectadas).
  private async fetchFollowerCounts(profileKey: string, codes: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (!codes.length) return result;

    try {
      const { apiKey, baseUrl } = getAyrshareConfig();
      const response = await fetch(`${baseUrl}/analytics/social`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Profile-Key': profileKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platforms: codes }),
      });

      if (!response.ok) {
        this.logger.warn(`No se pudieron obtener seguidores reales de Ayrshare (HTTP ${response.status}) — se deja el valor anterior`);
        return result;
      }

      const payload = (await response.json()) as AyrshareAnalyticsResponse;
      for (const code of codes) {
        const followers = payload[code]?.analytics?.followersCount ?? payload[code]?.analytics?.followers;
        if (typeof followers === 'number' && Number.isFinite(followers)) {
          result.set(code, followers);
        }
      }
    } catch (error) {
      this.logger.warn(`Error consultando analíticas de Ayrshare, se deja el valor de seguidores anterior: ${error}`);
    }

    return result;
  }
}
