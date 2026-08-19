import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus } from '../../node_modules/.prisma-client';
import { CloudinaryService, UploadableFile } from '../cloudinary/cloudinary.service';
import { NotificationsClient } from '../notifications/notifications-client.service';
import { PostSchedulerService } from '../scheduler/post-scheduler.service';
import { prisma } from '../prisma/client';
import { PostStatus } from '../types/post-status.enum';
import { CreatePostDto } from './dto/create-post.dto';
import { RejectPostDto } from './dto/reject-post.dto';
import { SchedulePostDto } from './dto/schedule-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ForwardToDesignerDto } from './dto/forward-to-designer.dto';
import { validateTransition } from './state-machine/post-state-machine';

type CurrentUser = { sub: string; roles: string[] };

function snippet(content: string): string {
  return content.length > 60 ? `${content.slice(0, 60)}…` : content;
}

// El Cliente (dueño de marca) no debe ver el trabajo interno de Diseñador/CM
// (borrador/en_revision/rechazado) — recién le corresponde desde que el CM
// aprueba y se lo reenvía (aprobado en adelante, incluida la vuelta de
// rechazado_cliente). CM/Diseñador/administrador siguen viendo todo, sin
// esta restricción — la necesitan para trabajar el post completo.
const CLIENT_VISIBLE_STATUSES: PostStatus[] = [
  PostStatus.APROBADO,
  PostStatus.RECHAZADO_CLIENTE,
  PostStatus.PROGRAMADO,
  PostStatus.PUBLICANDO,
  PostStatus.PUBLICADO,
  PostStatus.PARCIAL,
  PostStatus.ERROR,
  PostStatus.CANCELADO,
];

@Injectable()
export class PostsService {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly notifications: NotificationsClient,
    private readonly postScheduler: PostSchedulerService,
  ) {}

  async createPost(dto: CreatePostDto, user: CurrentUser): Promise<any> {
    const brand = await prisma.brand.findFirst({ where: { id: dto.brandId, deletedAt: null } });
    if (!brand) {
      throw new NotFoundException('La marca indicada no existe o fue eliminada');
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: dto.campaignId, brandId: dto.brandId, deletedAt: null, status: CampaignStatus.active },
      include: { designers: true },
    });
    if (!campaign) {
      throw new BadRequestException('La campaña indicada no es válida para esta marca');
    }

    // Bug real (pre-existente, no de esta sesión): este chequeo nunca
    // incluía a los Diseñadores asignados a la campaña, aunque el seed les
    // da publicaciones:crear y attachMediaToPost (abajo) ya sí los incluye
    // — nadie lo había ejercitado como Diseñador real hasta la Fase N.
    if (
      !user.roles.includes('administrador') &&
      brand.ownerId !== user.sub &&
      campaign.cmId !== user.sub &&
      !campaign.designers.some((designer) => designer.userId === user.sub)
    ) {
      throw new ForbiddenException('No tienes permiso para crear esta publicación');
    }

    const socialNetworks = await prisma.socialNetwork.findMany({
      where: { id: { in: dto.socialNetworkIds }, deletedAt: null },
      select: { id: true },
    });
    if (socialNetworks.length !== dto.socialNetworkIds.length) {
      throw new BadRequestException('Una o más redes sociales indicadas no son válidas');
    }

    return prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          brandId: dto.brandId,
          campaignId: dto.campaignId,
          content: dto.content.trim(),
          instructions: dto.instructions?.trim() || undefined,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          createdBy: user.sub,
          status: PostStatus.BORRADOR,
          socialNetworks: {
            create: dto.socialNetworkIds.map((socialNetworkId) => ({
              socialNetwork: { connect: { id: socialNetworkId } },
            })),
          },
        },
      });

      return tx.post.findUniqueOrThrow({
        where: { id: post.id },
        include: {
          socialNetworks: { include: { socialNetwork: true } },
        },
      });
    });
  }

  // Fase O: lo puede enviar el Diseñador que lo creó, el CM asignado, el
  // dueño de marca, o un administrador — mismo criterio amplio que
  // createPost/attachMediaToPost. Antes solo lo permitía el CM (el bug real
  // que encontró el usuario probando como Diseñador). Válido desde borrador
  // o rechazado (el Diseñador corrige un rechazo del CM y reenvía directo,
  // sin pasar por borrador como parada intermedia — ver decisión técnica en
  // el plan de esta fase).
  async submitPostForReview(postId: string, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: { include: { designers: true } } },
    });

    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }

    if (
      !user.roles.includes('administrador') &&
      post.brand.ownerId !== user.sub &&
      post.campaign.cmId !== user.sub &&
      !post.campaign.designers.some((designer) => designer.userId === user.sub)
    ) {
      throw new ForbiddenException('No tienes permiso para enviar esta publicación a revisión');
    }

    validateTransition(post.status as PostStatus, PostStatus.EN_REVISION, undefined, post.createdBy, user.sub);

    // Si el propio CM asignado a la campaña es quien creó Y envía el post,
    // pedirle un segundo paso de "aprobar" su propio trabajo no aporta nada
    // — ya es la máxima autoridad de este primer tramo. Se salta
    // en_revision y pasa directo a aprobado (visible para el Cliente),
    // registrando igual los 2 pasos reales en post_status_history (inmutable,
    // no se pierde trazabilidad). Pedido explícito del usuario (2026-08-17).
    // NO toca post-state-machine.ts: la regla de "el creador no puede
    // aprobar su propia publicación" sigue intacta para approvePost — un
    // Diseñador (o cualquiera que no sea el CM asignado) sigue necesitando
    // que el CM apruebe, sin excepción.
    const cmSelfApproves = post.createdBy === post.campaign.cmId && user.sub === post.campaign.cmId;

    const updatedPost = await prisma.$transaction(async (tx) => {
      let current = await tx.post.update({
        where: { id: postId },
        data: { status: PostStatus.EN_REVISION },
      });

      await tx.postStatusHistory.create({
        data: {
          postId,
          fromStatus: post.status,
          toStatus: PostStatus.EN_REVISION,
          changedBy: user.sub,
        },
      });

      if (cmSelfApproves) {
        current = await tx.post.update({
          where: { id: postId },
          data: { status: PostStatus.APROBADO },
        });

        await tx.postStatusHistory.create({
          data: {
            postId,
            fromStatus: PostStatus.EN_REVISION,
            toStatus: PostStatus.APROBADO,
            changedBy: user.sub,
          },
        });
      }

      return current;
    });

    if (cmSelfApproves) {
      void this.notifications.notify(post.brand.ownerId, 'post_pending_client_approval', {
        postId,
        campaignId: post.campaignId,
        campaignName: post.campaign.name,
        postSnippet: snippet(post.content),
      });
    } else {
      void this.notifications.notify(post.campaign.cmId, 'post_submitted_for_review', {
        postId,
        campaignId: post.campaignId,
        campaignName: post.campaign.name,
        postSnippet: snippet(post.content),
      });
    }

    return updatedPost;
  }

  // Fase O — primer tramo de aprobación: el CM revisa el trabajo del
  // Diseñador (antes esto lo hacía el Cliente directo, sin pasar por el CM
  // — corregido según el flujo real de negocio). También cubre el segundo
  // tramo: el CM edita y reenvía tras un rechazo del Cliente (mismo destino,
  // aprobado, sin duplicar lógica — ver rechazado_cliente → aprobado).
  async approvePost(postId: string, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: true },
    });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (!user.roles.includes('administrador') && post.campaign.cmId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para aprobar esta publicación');
    }

    // validateTransition también bloquea la auto-aprobación (createdBy ===
    // userId) — salvo cuando el creador ES el CM asignado a la campaña: ahí
    // no hay nadie de mayor autoridad a quien pedirle la aprobación (mismo
    // criterio ya aplicado en submitPostForReview). Sigue bloqueado sin
    // excepción para cualquier otro creador (ej. Diseñador).
    validateTransition(post.status as PostStatus, PostStatus.APROBADO, undefined, post.createdBy, user.sub, {
      allowSelfApproval: post.createdBy === post.campaign.cmId,
    });

    const updatedPost = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({ where: { id: postId }, data: { status: PostStatus.APROBADO } });
      await tx.postStatusHistory.create({
        data: { postId, fromStatus: post.status, toStatus: PostStatus.APROBADO, changedBy: user.sub },
      });
      return updated;
    });

    void this.notifications.notify(post.brand.ownerId, 'post_pending_client_approval', {
      postId,
      campaignId: post.campaignId,
      campaignName: post.campaign.name,
      postSnippet: snippet(post.content),
    });

    return updatedPost;
  }

  // Fase O — rechazo del CM hacia el Diseñador (primer tramo). Antes esto lo
  // hacía el Cliente directo — corregido según el flujo real de negocio.
  async rejectPost(postId: string, dto: RejectPostDto, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: true },
    });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (!user.roles.includes('administrador') && post.campaign.cmId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para rechazar esta publicación');
    }

    // El comentario obligatorio ya lo exige validateTransition (regla de negocio #4).
    validateTransition(post.status as PostStatus, PostStatus.RECHAZADO, dto.comment, post.createdBy, user.sub);

    const updatedPost = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({ where: { id: postId }, data: { status: PostStatus.RECHAZADO } });
      await tx.postStatusHistory.create({
        data: {
          postId,
          fromStatus: post.status,
          toStatus: PostStatus.RECHAZADO,
          changedBy: user.sub,
          comment: dto.comment,
        },
      });
      return updated;
    });

    void this.notifications.notify(post.createdBy, 'post_rejected_by_cm', {
      postId,
      campaignId: post.campaignId,
      campaignName: post.campaign.name,
      reason: dto.comment,
    });

    return updatedPost;
  }

  // Fase O — segundo tramo: el Cliente rechaza una publicación ya aprobada
  // por el CM. Va a rechazado_cliente (no a rechazado — ese es el destino
  // del rechazo del CM, un tramo distinto) porque el CM todavía tiene que
  // decidir: editarla él mismo y reenviarla, o reenviarla al Diseñador.
  async clientRejectPost(postId: string, dto: RejectPostDto, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: true },
    });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (!user.roles.includes('administrador') && post.brand.ownerId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para rechazar esta publicación');
    }

    validateTransition(post.status as PostStatus, PostStatus.RECHAZADO_CLIENTE, dto.comment, post.createdBy, user.sub);

    const updatedPost = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({ where: { id: postId }, data: { status: PostStatus.RECHAZADO_CLIENTE } });
      await tx.postStatusHistory.create({
        data: {
          postId,
          fromStatus: post.status,
          toStatus: PostStatus.RECHAZADO_CLIENTE,
          changedBy: user.sub,
          comment: dto.comment,
        },
      });
      return updated;
    });

    void this.notifications.notify(post.campaign.cmId, 'post_rejected_by_client', {
      postId,
      campaignId: post.campaignId,
      campaignName: post.campaign.name,
      reason: dto.comment,
    });

    return updatedPost;
  }

  // Fase O — el CM decide no editarla él mismo y la reenvía al Diseñador
  // (rechazado_cliente → borrador). El comentario del CM es opcional: el
  // motivo del Cliente SIEMPRE llega al Diseñador (vía el payload de la
  // notificación y el historial, no depende de que el CM agregue algo) —
  // ver clientReason abajo, tomado de la fila de historial del rechazo del
  // Cliente, no del comentario (opcional) de esta transición.
  async forwardToDesigner(postId: string, dto: ForwardToDesignerDto, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { campaign: true },
    });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (!user.roles.includes('administrador') && post.campaign.cmId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para reenviar esta publicación al Diseñador');
    }

    validateTransition(post.status as PostStatus, PostStatus.BORRADOR, undefined, post.createdBy, user.sub);

    const lastClientRejection = await prisma.postStatusHistory.findFirst({
      where: { postId, toStatus: PostStatus.RECHAZADO_CLIENTE },
      orderBy: { id: 'desc' },
    });

    const updatedPost = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({ where: { id: postId }, data: { status: PostStatus.BORRADOR } });
      await tx.postStatusHistory.create({
        data: {
          postId,
          fromStatus: post.status,
          toStatus: PostStatus.BORRADOR,
          changedBy: user.sub,
          comment: dto.comment?.trim() || undefined,
        },
      });
      return updated;
    });

    void this.notifications.notify(post.createdBy, 'post_forwarded_to_designer', {
      postId,
      campaignId: post.campaignId,
      campaignName: post.campaign.name,
      clientReason: lastClientRejection?.comment ?? null,
      cmComment: dto.comment?.trim() || null,
    });

    return updatedPost;
  }

  // Fase O — edición de contenido, sin cambiar status. Diseñador/CM/dueño de
  // marca/admin pueden editar mientras está en borrador o rechazado (mismo
  // criterio amplio de createPost); en rechazado_cliente solo el CM (es el
  // paso "editarla él mismo" antes de reenviarla al Cliente).
  async updatePost(postId: string, dto: UpdatePostDto, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: { include: { designers: true } } },
    });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }

    // EN_REVISION agregado 2026-08-19: el CM puede ajustar el contenido
    // mientras lo tiene en revisión, sin necesidad de rechazarlo primero solo
    // para poder editarlo (fricción real reportada) — igual que
    // RECHAZADO_CLIENTE, edita SOLO el CM (no Diseñador/Cliente, el post no
    // está en su cancha en ese momento) y el status se queda igual (esto no
    // aprueba ni rechaza nada, sigue siendo una acción aparte). Sin cambios a
    // attachMedia/removeMedia — media sigue restringida a borrador/rechazado
    // (mismo criterio que ya aplicaba a RECHAZADO_CLIENTE).
    const status = post.status as PostStatus;
    const cmOnlyEditStatuses: PostStatus[] = [PostStatus.RECHAZADO_CLIENTE, PostStatus.EN_REVISION];
    const editableStatuses: PostStatus[] = [PostStatus.BORRADOR, PostStatus.RECHAZADO, ...cmOnlyEditStatuses];
    if (!editableStatuses.includes(status)) {
      throw new BadRequestException('Solo se puede editar una publicación en borrador, rechazada, en revisión (CM), o rechazada por el cliente');
    }

    const isCm = post.campaign.cmId === user.sub;
    const canEdit =
      user.roles.includes('administrador') ||
      (cmOnlyEditStatuses.includes(status)
        ? isCm
        : post.brand.ownerId === user.sub || isCm || post.campaign.designers.some((designer) => designer.userId === user.sub));

    if (!canEdit) {
      throw new ForbiddenException('No tienes permiso para editar esta publicación');
    }

    return prisma.post.update({
      where: { id: postId },
      data: {
        content: dto.content?.trim(),
        instructions: dto.instructions?.trim() || undefined,
      },
      include: {
        socialNetworks: { include: { socialNetwork: true } },
        media: { include: { media: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  // Fase O — programar/publicar es acción del Cliente en el segundo tramo
  // (antes de esta fase solo el CM podía; se mantiene el bypass de CM/admin
  // por si necesitan intervenir).
  async schedulePost(postId: string, dto: SchedulePostDto, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: true, socialNetworks: { include: { socialNetwork: true } } },
    });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (
      !user.roles.includes('administrador') &&
      post.campaign.cmId !== user.sub &&
      post.brand.ownerId !== user.sub
    ) {
      throw new ForbiddenException('No tienes permiso para programar esta publicación');
    }

    // Bug real encontrado en vivo: "Publicar ahora" (sin fecha) mandaba 400
    // porque no había fallback a "ahora" — solo se aceptaba dto.scheduledAt o
    // un post.scheduledAt ya existente desde la creación (que el formulario
    // de creación nunca manda). "Publicar directo" siempre debió ser "sin
    // fecha = ahora mismo", el cron de PostSchedulerService la recoge sola.
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : post.scheduledAt ?? new Date();

    // No se puede programar un post para una red que la marca no tiene
    // conectada — el scheduler (Fase 4) asume que toda PostSocialNetwork
    // resuelve a una SocialAccount real al momento de publicar.
    const socialNetworkIds = post.socialNetworks.map((psn) => psn.socialNetworkId);
    const connectedAccounts = await prisma.socialAccount.findMany({
      where: { brandId: post.brandId, socialNetworkId: { in: socialNetworkIds }, active: true, deletedAt: null },
      select: { socialNetworkId: true },
    });
    const connectedNetworkIds = new Set(connectedAccounts.map((account) => account.socialNetworkId));
    const missingNetworks = post.socialNetworks
      .filter((psn) => !connectedNetworkIds.has(psn.socialNetworkId))
      .map((psn) => psn.socialNetwork.name);
    if (missingNetworks.length > 0) {
      throw new BadRequestException(
        `La marca no tiene conectadas estas redes sociales: ${missingNetworks.join(', ')}`,
      );
    }

    validateTransition(post.status as PostStatus, PostStatus.PROGRAMADO, undefined, post.createdBy, user.sub);

    const updatedPost = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({
        where: { id: postId },
        data: { status: PostStatus.PROGRAMADO, scheduledAt },
      });
      await tx.postStatusHistory.create({
        data: { postId, fromStatus: post.status, toStatus: PostStatus.PROGRAMADO, changedBy: user.sub },
      });
      return updated;
    });

    // Sin cron por sondeo (ver post-scheduler.service.ts) — el timer exacto
    // se arma aquí, justo después de confirmar la transición.
    this.postScheduler.scheduleTimer(postId, scheduledAt);

    return updatedPost;
  }

  async cancelPost(postId: string, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, include: { campaign: true } });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (!user.roles.includes('administrador') && post.campaign.cmId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para cancelar esta publicación');
    }

    validateTransition(post.status as PostStatus, PostStatus.CANCELADO, undefined, post.createdBy, user.sub);

    const updatedPost = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({ where: { id: postId }, data: { status: PostStatus.CANCELADO } });
      await tx.postStatusHistory.create({
        data: { postId, fromStatus: post.status, toStatus: PostStatus.CANCELADO, changedBy: user.sub },
      });
      return updated;
    });

    // Si el post tenía un timer de publicación pendiente, se desarma —
    // nunca debe publicarse algo que ya se canceló.
    this.postScheduler.cancelTimer(postId);

    return updatedPost;
  }

  // Lectura (Fase N) — mismo criterio de pertenencia que el resto del
  // service: dueño de marca, CM asignado a la campaña, o Diseñador asignado
  // a esa campaña (no solo quien creó el post), bypass para administrador.
  async listPosts(
    filters: { campaignId?: string; brandId?: string; status?: PostStatus },
    user: CurrentUser,
  ): Promise<any> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.status) where.status = filters.status;

    if (!user.roles.includes('administrador')) {
      where.OR = [
        { brand: { ownerId: user.sub }, status: { in: CLIENT_VISIBLE_STATUSES } },
        { campaign: { cmId: user.sub } },
        { campaign: { designers: { some: { userId: user.sub } } } },
      ];
    }

    return prisma.post.findMany({
      where,
      include: {
        campaign: { select: { name: true } },
        socialNetworks: { include: { socialNetwork: true } },
        media: { include: { media: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPost(postId: string, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: {
        brand: true,
        campaign: { include: { designers: true } },
        socialNetworks: { include: { socialNetwork: true } },
        socialAccounts: { include: { socialAccount: { include: { socialNetwork: true } } } },
        media: { include: { media: true }, orderBy: { order: 'asc' } },
        statusHistory: { orderBy: { id: 'asc' } },
      },
    });

    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }

    const isClientAllowedNow =
      post.brand.ownerId === user.sub && CLIENT_VISIBLE_STATUSES.includes(post.status as PostStatus);

    if (
      !user.roles.includes('administrador') &&
      !isClientAllowedNow &&
      post.campaign.cmId !== user.sub &&
      !post.campaign.designers.some((designer) => designer.userId === user.sub)
    ) {
      throw new ForbiddenException('No tienes permiso para ver esta publicación');
    }

    // PostStatusHistory.id es BigInt (única tabla de posts con ese tipo de
    // PK, ver docs/base — id es BIGINT autoincrement, inmutable) — JSON.
    // stringify no sabe serializar BigInt y el endpoint tiraba 500 al armar
    // la respuesta HTTP (nunca se detectó en los tests porque llaman al
    // service directo, sin pasar por la serialización HTTP real).
    return {
      ...post,
      statusHistory: post.statusHistory.map((h) => ({ ...h, id: h.id.toString() })),
    };
  }

  // Borrador recién creado que se queda sin imagen porque Cloudinary falló
  // (ver posts-front/app/posts/new): en vez de dejar el post huérfano, el
  // front lo borra llamando esto justo después del fallo — mismo criterio de
  // "solo se puede tocar en borrador/rechazado" que updatePost/attachMedia.
  async deletePost(postId: string, user: CurrentUser): Promise<void> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: { include: { designers: true } } },
    });

    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }

    if (post.status !== PostStatus.BORRADOR && post.status !== PostStatus.RECHAZADO) {
      throw new BadRequestException('Solo se puede eliminar una publicación en borrador o rechazada');
    }

    if (
      !user.roles.includes('administrador') &&
      post.brand.ownerId !== user.sub &&
      post.campaign.cmId !== user.sub &&
      !post.campaign.designers.some((designer) => designer.userId === user.sub)
    ) {
      throw new ForbiddenException('No tienes permiso para eliminar esta publicación');
    }

    await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
  }

  // Quita una imagen/video ya adjuntado — el join PostMedia y el propio
  // Media no tienen deletedAt (no son "tabla principal", ver schema.prisma:
  // Media solo vive colgado de un Post), así que se borran físicamente aquí
  // y se limpia el archivo real en Cloudinary — mismo public_id que se
  // guardó como fileName al subirlo (ver attachMediaToPost).
  async removeMediaFromPost(postId: string, mediaId: string, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: { include: { designers: true } } },
    });

    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }

    if (post.status !== PostStatus.BORRADOR && post.status !== PostStatus.RECHAZADO) {
      throw new BadRequestException('Solo se pueden quitar recursos de una publicación en borrador o rechazada');
    }

    if (
      !user.roles.includes('administrador') &&
      post.brand.ownerId !== user.sub &&
      post.campaign.cmId !== user.sub &&
      !post.campaign.designers.some((designer) => designer.userId === user.sub)
    ) {
      throw new ForbiddenException('No tienes permiso para editar los recursos de esta publicación');
    }

    const postMedia = await prisma.postMedia.findFirst({ where: { postId, mediaId }, include: { media: true } });
    if (!postMedia) {
      throw new NotFoundException('El recurso indicado no está adjunto a esta publicación');
    }

    await prisma.$transaction([
      prisma.postMedia.delete({ where: { postId_mediaId: { postId, mediaId } } }),
      prisma.media.delete({ where: { id: mediaId } }),
    ]);

    if (postMedia.media.fileName) {
      await this.cloudinary.deleteFile(postMedia.media.fileName);
    }

    return prisma.post.findUniqueOrThrow({
      where: { id: postId },
      include: { media: { include: { media: true }, orderBy: { order: 'asc' } } },
    });
  }

  async attachMediaToPost(postId: string, files: UploadableFile[] | undefined, user: CurrentUser): Promise<any> {
    if (!files?.length) {
      throw new BadRequestException('Debes adjuntar al menos un archivo');
    }

    const invalidFile = files.find(
      (file) => !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'),
    );
    if (invalidFile) {
      throw new BadRequestException('Solo se admiten imágenes o videos');
    }

    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: { include: { designers: true } } },
    });

    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }

    // Antes solo permitía borrador — el Diseñador que corrige una imagen
    // tras un rechazo del CM (status rechazado) no podía tocarla (bug real
    // reportado en vivo). Mismo criterio de estados que canEditNow en el
    // front y que updatePost.
    if (post.status !== PostStatus.BORRADOR && post.status !== PostStatus.RECHAZADO) {
      throw new BadRequestException('Solo se pueden adjuntar recursos a una publicación en borrador o rechazada');
    }

    if (
      !user.roles.includes('administrador') &&
      post.brand.ownerId !== user.sub &&
      post.campaign.cmId !== user.sub &&
      !post.campaign.designers.some((designer) => designer.userId === user.sub)
    ) {
      throw new ForbiddenException('No tienes permiso para adjuntar recursos a esta publicación');
    }

    const uploadedFiles = [] as Array<{
      public_id?: string;
      secure_url?: string;
      url?: string;
      width?: number;
      height?: number;
      duration?: number;
    }>;

    try {
      for (const file of files) {
        uploadedFiles.push(await this.cloudinary.uploadFile(file));
      }

      // Bug real (encontrado en vivo con datos reales, ver contentTypeBreakdown
      // de analytics-front): index + 1 se calculaba solo contra el lote que se
      // está subiendo en ESTE momento, sin contar los adjuntos que el post ya
      // tenía de subidas anteriores — dos subidas distintas al mismo post
      // terminaban ambas con order 1. Se calcula el offset real primero.
      const existingMediaCount = await prisma.postMedia.count({ where: { postId } });

      return await prisma.$transaction(async (tx) => {
        const updatedPost = await tx.post.update({
          where: { id: postId },
          data: {
            media: {
              create: uploadedFiles.map((uploadedFile, index) => ({
                order: existingMediaCount + index + 1,
                media: {
                  create: {
                    brandId: post.brandId,
                    fileName: uploadedFile.public_id || files[index].originalname,
                    originalName: files[index].originalname,
                    mimeType: files[index].mimetype,
                    url: uploadedFile.secure_url || uploadedFile.url || '',
                    size: files[index].size,
                    width: uploadedFile.width,
                    height: uploadedFile.height,
                    duration: uploadedFile.duration,
                  },
                },
              })),
            },
          },
          include: {
            media: { include: { media: true }, orderBy: { order: 'asc' } },
          },
        });

        return updatedPost;
      });
    } catch (error) {
      await Promise.all(uploadedFiles.map((uploadedFile) => uploadedFile.public_id && this.cloudinary.deleteFile(uploadedFile.public_id)));
      throw error;
    }
  }
}