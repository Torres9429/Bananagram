import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

export type PostContext = {
  id: string;
  content: string;
  status: string;
  brandName?: string;
  campaignName?: string;
  platforms: string[];
  imageUrl: string | null;
};

type RawPost = {
  id: string;
  content: string;
  status: string;
  brand?: { name?: string };
  campaign?: { name?: string };
  socialNetworks?: { socialNetwork?: { name?: string; code?: string } }[];
  media?: { media?: { url?: string; mimeType?: string } }[];
};

// BFF puro sobre HTTP, mismo patrón que
// alexa-service/src/campaigns/campaigns.service.ts: reenvía el Bearer del
// caller tal cual — core-service vuelve a correr JwtAuthGuard +
// PermissionGuard('publicaciones','ver') + su propia lógica de pertenencia
// real (dueño de marca, CM asignado, diseñador asignado, admin) en
// posts.service.ts:getPost. ai-service NO reimplementa esa lógica ni
// consulta Prisma directo — así se cumple "no permitir postId de otra
// marca" sin duplicar reglas de negocio.
@Injectable()
export class CoreServiceClient {
  private readonly coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';

  async fetchPostContext(postId: string, authHeader: string): Promise<PostContext> {
    const response = await fetch(`${this.coreServiceUrl}/api/posts/${postId}`, {
      headers: { Authorization: authHeader },
    });

    if (response.status === 404) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (response.status === 403) {
      throw new ForbiddenException('No tienes permiso para ver esta publicación');
    }
    if (!response.ok) {
      throw new BadRequestException(`core-service respondió ${response.status} al pedir la publicación`);
    }

    const post = (await response.json()) as RawPost;

    const platforms = (post.socialNetworks ?? [])
      .map((entry) => entry.socialNetwork?.name ?? entry.socialNetwork?.code)
      .filter((name): name is string => Boolean(name));

    const firstImage = (post.media ?? []).find((entry) => entry.media?.mimeType?.startsWith('image/'));

    return {
      id: post.id,
      content: post.content,
      status: post.status,
      brandName: post.brand?.name,
      campaignName: post.campaign?.name,
      platforms,
      imageUrl: firstImage?.media?.url ?? null,
    };
  }
}
