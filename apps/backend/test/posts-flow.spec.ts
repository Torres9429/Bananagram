import { BadRequestException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { S3Service, UploadableFile } from '../services/core-service/src/storage/s3.service';
import { PostsModule } from '../services/core-service/src/posts/posts.module';
import { PostsService } from '../services/core-service/src/posts/posts.service';
import { prisma as corePrisma } from '../services/core-service/src/prisma/client';
import { validateTransition } from '../services/core-service/src/posts/state-machine/post-state-machine';
import { PostStatus } from '../services/core-service/src/types/post-status.enum';
import { cleanDatabase } from './helpers/db.helper';

describe('Posts Flow Integration', () => {
  let postsService: PostsService;

  const ownerUserId = randomUUID();
  const cmUserId = randomUUID();
  const designerUserId = randomUUID();
  const outsiderUserId = randomUUID();

  let brandId: string;
  let campaignId: string;
  let inactiveCampaignId: string;
  let socialNetworkIds: string[];

  const ownerClaims = { sub: ownerUserId, roles: ['cliente'] };
  const cmClaims = { sub: cmUserId, roles: ['community_manager'] };
  const designerClaims = { sub: designerUserId, roles: ['disenador'] };
  const outsiderClaims = { sub: outsiderUserId, roles: ['cliente'] };
  const storageMock = {
    uploadFile: jest.fn(async (file: UploadableFile) => ({
      public_id: `bananagram/posts/${file.originalname}`,
      secure_url: `https://bananagram-media-test.s3.us-east-1.amazonaws.com/bananagram/posts/${file.originalname}`,
      width: 1200,
      height: 800,
      duration: file.mimetype.startsWith('video/') ? 9 : undefined,
    })),
    deleteFile: jest.fn(async () => undefined),
  };

  beforeAll(async () => {
    await cleanDatabase();

    const brand = await corePrisma.brand.create({
      data: { name: 'Marca de publicación', slug: `marca-publicacion-${randomUUID()}`, ownerId: ownerUserId },
    });
    brandId = brand.id;

    const campaign = await corePrisma.campaign.create({
      data: { brandId, name: 'Campaña activa', cmId: cmUserId, createdBy: ownerUserId },
    });
    campaignId = campaign.id;

    await corePrisma.campaignDesigner.create({ data: { campaignId, userId: designerUserId } });

    const inactiveCampaign = await corePrisma.campaign.create({
      data: {
        brandId,
        name: 'Campaña inactiva',
        cmId: cmUserId,
        status: 'paused',
        createdBy: ownerUserId,
      },
    });
    inactiveCampaignId = inactiveCampaign.id;

    const socialNetworks = await Promise.all([
      corePrisma.socialNetwork.create({
        data: {
          name: 'Instagram de prueba',
          code: `instagram-test-${randomUUID()}`,
          baseEngagementRate: 0.12,
        },
      }),
      corePrisma.socialNetwork.create({
        data: {
          name: 'TikTok de prueba',
          code: `tiktok-test-${randomUUID()}`,
          baseEngagementRate: 0.18,
        },
      }),
    ]);
    socialNetworkIds = socialNetworks.map((socialNetwork) => socialNetwork.id);

    // Cuentas sociales conectadas de la marca — necesarias para schedulePost
    // (valida que la marca tenga cada red del post ya conectada).
    await Promise.all(
      socialNetworkIds.map((socialNetworkId) =>
        corePrisma.socialAccount.create({ data: { brandId, socialNetworkId, active: true } }),
      ),
    );

    const moduleRef = await Test.createTestingModule({ imports: [PostsModule] })
      .overrideProvider(S3Service)
      .useValue(storageMock)
      .compile();
    postsService = moduleRef.get(PostsService);
  }, 30000);

  afterAll(async () => {
    await cleanDatabase();
    await corePrisma.$disconnect();
  });

  it('borrador → en_revision → aprobado → programado (transiciones válidas no lanzan)', () => {
    expect(() =>
      validateTransition(PostStatus.BORRADOR, PostStatus.EN_REVISION, undefined, 'creator', 'other'),
    ).not.toThrow();
    expect(() =>
      validateTransition(PostStatus.EN_REVISION, PostStatus.APROBADO, undefined, 'creator', 'approver'),
    ).not.toThrow();
    expect(() =>
      validateTransition(PostStatus.APROBADO, PostStatus.PROGRAMADO, undefined, 'creator', 'approver'),
    ).not.toThrow();
  });

  it('should return 422 on invalid transition', () => {
    expect(() => validateTransition(PostStatus.BORRADOR, PostStatus.APROBADO)).toThrow(
      UnprocessableEntityException,
    );
    expect(() => validateTransition(PostStatus.PUBLICADO, PostStatus.BORRADOR)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('should return 400 when rejecting without comment', () => {
    expect(() => validateTransition(PostStatus.EN_REVISION, PostStatus.RECHAZADO)).toThrow(BadRequestException);
    expect(() =>
      validateTransition(PostStatus.EN_REVISION, PostStatus.RECHAZADO, '   '),
    ).toThrow(BadRequestException);
    expect(() =>
      validateTransition(PostStatus.EN_REVISION, PostStatus.RECHAZADO, 'faltan hashtags'),
    ).not.toThrow();
  });

  it('should return 403 when creator tries to approve own post', () => {
    expect(() =>
      validateTransition(PostStatus.EN_REVISION, PostStatus.APROBADO, undefined, 'same-user', 'same-user'),
    ).toThrow(ForbiddenException);
    expect(() =>
      validateTransition(PostStatus.EN_REVISION, PostStatus.APROBADO, undefined, 'creator', 'other-user'),
    ).not.toThrow();
  });

  // Fase O: la regla de negocio #4 ("rechazadas regresan a borrador") nunca
  // tuvo código real detrás — ningún método hacía esa transición. Se
  // simplifica a un reenvío directo (el Diseñador ya puede editar estando en
  // rechazado y reenviar sin pasar por borrador como parada intermedia).
  it('rechazado reenvía directo a revisión (antes iba a borrador, nunca ejercitado)', () => {
    expect(() => validateTransition(PostStatus.RECHAZADO, PostStatus.EN_REVISION)).not.toThrow();
    expect(() => validateTransition(PostStatus.RECHAZADO, PostStatus.BORRADOR)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('crea una publicación en borrador con instructions y campaign obligatoria', async () => {
    const post = await postsService.createPost(
      {
        brandId,
        campaignId,
        socialNetworkIds,
        content: 'Texto base de la publicación',
        instructions: 'Usar formato visual limpio',
        scheduledAt: '2026-08-10T10:00:00.000Z',
      } as any,
      ownerClaims,
    );

    expect(post.status).toBe(PostStatus.BORRADOR);
    expect(post.brandId).toBe(brandId);
    expect(post.campaignId).toBe(campaignId);
    expect(post.createdBy).toBe(ownerUserId);
    expect(post.instructions).toBe('Usar formato visual limpio');
    expect(post.socialNetworks).toHaveLength(2);
  });

  it('permite crear la publicación al CM asignado a la campaña', async () => {
    const post = await postsService.createPost(
      {
        brandId,
        campaignId,
        socialNetworkIds,
        content: 'Otro borrador',
      } as any,
      cmClaims,
    );

    expect(post.createdBy).toBe(cmUserId);
    expect(post.status).toBe(PostStatus.BORRADOR);
  });

  // Bug real encontrado probando en vivo como Diseñador (fuera de esta
  // sesión, pre-existente): createPost nunca consideraba a los Diseñadores
  // asignados a la campaña, aunque el seed les da publicaciones:crear y
  // attachMediaToPost ya sí los incluía.
  it('permite crear la publicación al Diseñador asignado a la campaña', async () => {
    const post = await postsService.createPost(
      {
        brandId,
        campaignId,
        socialNetworkIds,
        content: 'Borrador de un Diseñador',
      } as any,
      designerClaims,
    );

    expect(post.createdBy).toBe(designerUserId);
    expect(post.status).toBe(PostStatus.BORRADOR);
  });

  it('rechaza crear una publicación si la campaña no está activa', async () => {
    await expect(
      postsService.createPost(
        {
          brandId,
          campaignId: inactiveCampaignId,
          socialNetworkIds,
          content: 'Borrador no permitido',
        } as any,
        ownerClaims,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza crear una publicación si no pertenece al owner ni al CM de la campaña', async () => {
    await expect(
      postsService.createPost(
        {
          brandId,
          campaignId,
          socialNetworkIds,
          content: 'Intento ajeno',
        } as any,
        outsiderClaims,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('envía un post de borrador a revisión y registra el historial', async () => {
    const post = await postsService.createPost(
      {
        brandId,
        campaignId,
        socialNetworkIds,
        content: 'Pendiente de revisión',
      } as any,
      cmClaims,
    );

    const updatedPost = await postsService.submitPostForReview(post.id, cmClaims);

    expect(updatedPost.status).toBe(PostStatus.EN_REVISION);

    const history = await corePrisma.postStatusHistory.findMany({ where: { postId: post.id } });
    expect(history).toHaveLength(1);
    expect(history[0].fromStatus).toBe(PostStatus.BORRADOR);
    expect(history[0].toStatus).toBe(PostStatus.EN_REVISION);
    expect(history[0].changedBy).toBe(cmUserId);
  });

  // Fase O: submitPostForReview amplió su pertenencia (dueño de marca, CM, o
  // Diseñador asignado) — un dueño de marca ya no es "ajeno" a su propia
  // publicación. El caso real de "ajeno" ahora es alguien sin ninguna
  // relación con la marca/campaña (outsiderClaims).
  it('rechaza enviar a revisión un post de alguien sin relación con la marca ni la campaña', async () => {
    const post = await postsService.createPost(
      {
        brandId,
        campaignId,
        socialNetworkIds,
        content: 'Pendiente de revisión ajena',
      } as any,
      ownerClaims,
    );

    await expect(postsService.submitPostForReview(post.id, outsiderClaims)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('adjunta recursos multimedia al borrador y guarda el orden', async () => {
    const post = await postsService.createPost(
      {
        brandId,
        campaignId,
        socialNetworkIds,
        content: 'Post con multimedia',
      } as any,
      cmClaims,
    );

    const updatedPost = await postsService.attachMediaToPost(
      post.id,
      [
        {
          buffer: Buffer.from('image-1'),
          originalname: 'imagen-1.png',
          mimetype: 'image/png',
          size: 1200,
        } as UploadableFile,
        {
          buffer: Buffer.from('video-1'),
          originalname: 'video-1.mp4',
          mimetype: 'video/mp4',
          size: 2400,
        } as UploadableFile,
      ],
      cmClaims,
    );

    expect(updatedPost.media).toHaveLength(2);
    expect(updatedPost.media[0].order).toBe(1);
    expect(updatedPost.media[1].order).toBe(2);
    expect(updatedPost.media[0].media.brandId).toBe(brandId);

    // El orden real vive en PostMedia.order, no en Media.createdAt — ambas
    // filas de Media se crean dentro de la misma prisma.$transaction(), y
    // Postgres congela now() al valor de inicio de la transacción para
    // TODOS sus statements, así que las dos quedan con el mismo createdAt
    // (orderBy: createdAt no puede desempatar, por eso este assert fallaba
    // de forma no determinística según el orden físico de Postgres, no por
    // un bug real de la app).
    const storedPostMedia = await corePrisma.postMedia.findMany({
      where: { postId: post.id },
      include: { media: true },
      orderBy: { order: 'asc' },
    });
    expect(storedPostMedia).toHaveLength(2);
    expect(storedPostMedia[0].media.originalName).toBe('imagen-1.png');
    expect(storedPostMedia[1].media.originalName).toBe('video-1.mp4');
  });

  // Fase O: aprobar es acción del CM (primer tramo), no del Cliente. Creado
  // por el Diseñador (no el CM) para no chocar con el bloqueo de
  // auto-aprobación (creador == aprobador).
  it('aprueba una publicación en revisión (CM asignado a la campaña)', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Para aprobar' } as any,
      designerClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);

    const approved = await postsService.approvePost(post.id, cmClaims);
    expect(approved.status).toBe(PostStatus.APROBADO);

    const history = await corePrisma.postStatusHistory.findMany({
      where: { postId: post.id },
      orderBy: { id: 'asc' },
    });
    expect(history[history.length - 1].toStatus).toBe(PostStatus.APROBADO);
  });

  it('rechaza aprobar si el usuario no es el CM asignado ni admin', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Aprobación ajena' } as any,
      cmClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);

    await expect(postsService.approvePost(post.id, outsiderClaims)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza aprobar sin pasar antes por revisión (transición inválida)', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Aprobación prematura' } as any,
      cmClaims,
    );

    await expect(postsService.approvePost(post.id, cmClaims)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rechaza un post en revisión sin motivo y lo marca rechazado con motivo válido', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Para rechazar' } as any,
      cmClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);

    await expect(
      postsService.rejectPost(post.id, { comment: '' } as any, cmClaims),
    ).rejects.toBeInstanceOf(BadRequestException);

    const rejected = await postsService.rejectPost(post.id, { comment: 'Faltan hashtags' } as any, cmClaims);
    expect(rejected.status).toBe(PostStatus.RECHAZADO);
  });

  it('programa una publicación aprobada cuando la marca tiene las redes conectadas', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Para programar' } as any,
      designerClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);
    await postsService.approvePost(post.id, cmClaims);

    const scheduled = await postsService.schedulePost(
      post.id,
      { scheduledAt: '2026-09-01T10:00:00.000Z' } as any,
      cmClaims,
    );
    expect(scheduled.status).toBe(PostStatus.PROGRAMADO);
    expect(scheduled.scheduledAt).toEqual(new Date('2026-09-01T10:00:00.000Z'));
  });

  it('rechaza programar si falta conectar alguna red social de la marca', async () => {
    const disconnectedNetwork = await corePrisma.socialNetwork.create({
      data: { name: 'Red sin conectar', code: `red-sin-conectar-${randomUUID()}`, baseEngagementRate: 0.1 },
    });

    const post = await postsService.createPost(
      {
        brandId,
        campaignId,
        socialNetworkIds: [...socialNetworkIds, disconnectedNetwork.id],
        content: 'Red faltante',
      } as any,
      designerClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);
    await postsService.approvePost(post.id, cmClaims);

    await expect(
      postsService.schedulePost(post.id, { scheduledAt: '2026-09-01T10:00:00.000Z' } as any, cmClaims),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancela una publicación programada', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Para cancelar' } as any,
      designerClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);
    await postsService.approvePost(post.id, cmClaims);
    await postsService.schedulePost(post.id, { scheduledAt: '2026-09-01T10:00:00.000Z' } as any, cmClaims);

    const cancelled = await postsService.cancelPost(post.id, cmClaims);
    expect(cancelled.status).toBe(PostStatus.CANCELADO);
  });

  // Lectura (Fase N) — mismo criterio de pertenencia que el resto del
  // service: dueño de marca y CM asignado ven el post; un Cliente sin
  // relación con la marca/campaña, no.
  it('listPosts solo devuelve lo que corresponde según pertenencia', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Post para listar' } as any,
      cmClaims,
    );

    const ownerList = await postsService.listPosts({ campaignId }, ownerClaims);
    expect(ownerList.some((p: { id: string }) => p.id === post.id)).toBe(true);

    const cmList = await postsService.listPosts({ campaignId }, cmClaims);
    expect(cmList.some((p: { id: string }) => p.id === post.id)).toBe(true);

    const outsiderList = await postsService.listPosts({ campaignId }, outsiderClaims);
    expect(outsiderList.some((p: { id: string }) => p.id === post.id)).toBe(false);
  });

  it('getPost devuelve el detalle completo y rechaza a quien no tiene pertenencia', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Post para detalle' } as any,
      cmClaims,
    );

    const detail = await postsService.getPost(post.id, ownerClaims);
    expect(detail.id).toBe(post.id);
    expect(detail.socialNetworks).toHaveLength(socialNetworkIds.length);
    expect(detail.brand.id).toBe(brandId);
    expect(detail.campaign.id).toBe(campaignId);

    await expect(postsService.getPost(post.id, outsiderClaims)).rejects.toBeInstanceOf(ForbiddenException);
  });

  // Bug real encontrado en vivo (Diseñador/CM veían "no existe o no tienes
  // acceso" justo después de enviar a revisión): PostStatusHistory.id es
  // BigInt (única tabla de posts con ese tipo de PK) — JSON.stringify no
  // sabe serializarlo, así que el endpoint tiraba 500 al armar la respuesta
  // HTTP real. Los tests que llaman al service directo nunca lo detectaron
  // (Jest compara objetos JS, no pasa por JSON.stringify) — este test
  // fuerza esa serialización a propósito para atrapar la clase de bug.
  it('getPost es serializable a JSON (PostStatusHistory.id es BigInt, no puede viajar como tal por HTTP)', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Post con historial' } as any,
      designerClaims,
    );
    await postsService.submitPostForReview(post.id, designerClaims);

    const detail = await postsService.getPost(post.id, cmClaims);
    expect(detail.statusHistory.length).toBeGreaterThan(0);
    expect(typeof detail.statusHistory[0].id).toBe('string');
    expect(() => JSON.stringify(detail)).not.toThrow();
  });

  // Fase O — flujo real de dos tramos: Diseñador → CM → Cliente. Camino 1:
  // el CM edita directamente y reenvía tras un rechazo del Cliente.
  it('flujo completo: Diseñador crea → CM rechaza → Diseñador corrige → CM aprueba → Cliente rechaza → CM edita y reenvía → Cliente programa', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Primer borrador del Diseñador' } as any,
      designerClaims,
    );
    expect(post.status).toBe(PostStatus.BORRADOR);

    await postsService.submitPostForReview(post.id, designerClaims);

    // El motivo es obligatorio.
    await expect(postsService.rejectPost(post.id, {} as any, cmClaims)).rejects.toBeInstanceOf(BadRequestException);

    const rejected = await postsService.rejectPost(post.id, { comment: 'Falta el hashtag de la campaña' } as any, cmClaims);
    expect(rejected.status).toBe(PostStatus.RECHAZADO);

    // El Diseñador corrige y reenvía directo (sin pasar por borrador).
    const resubmitted = await postsService.submitPostForReview(post.id, designerClaims);
    expect(resubmitted.status).toBe(PostStatus.EN_REVISION);

    // El Cliente no puede aprobar en este tramo — ahora es acción del CM.
    await expect(postsService.approvePost(post.id, ownerClaims)).rejects.toBeInstanceOf(ForbiddenException);

    const approved = await postsService.approvePost(post.id, cmClaims);
    expect(approved.status).toBe(PostStatus.APROBADO);

    // El CM ya no puede rechazar en el tramo del Cliente — ahora es del Cliente.
    await expect(
      postsService.clientRejectPost(post.id, { comment: 'x' } as any, cmClaims),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const clientRejected = await postsService.clientRejectPost(
      post.id,
      { comment: 'El copy no coincide con la campaña' } as any,
      ownerClaims,
    );
    expect(clientRejected.status).toBe(PostStatus.RECHAZADO_CLIENTE);

    // El CM edita directamente y reenvía (rechazado_cliente → aprobado).
    const updated = await postsService.updatePost(post.id, { content: 'Copy corregido' } as any, cmClaims);
    expect(updated.content).toBe('Copy corregido');

    const reApproved = await postsService.approvePost(post.id, cmClaims);
    expect(reApproved.status).toBe(PostStatus.APROBADO);

    // El Cliente programa (antes solo el CM podía).
    const scheduled = await postsService.schedulePost(
      post.id,
      { scheduledAt: '2026-09-01T10:00:00.000Z' } as any,
      ownerClaims,
    );
    expect(scheduled.status).toBe(PostStatus.PROGRAMADO);

    const detail = await postsService.getPost(post.id, designerClaims);
    const rejectionEntries = detail.statusHistory.filter((h: { toStatus: string }) => h.toStatus === 'rechazado');
    expect(rejectionEntries).toHaveLength(1);
    expect(rejectionEntries[0].comment).toBe('Falta el hashtag de la campaña');
  });

  // Fase O — Camino 2: el Cliente rechaza y el CM decide reenviar al
  // Diseñador (con y sin nota propia) en vez de editarla él mismo. El
  // Diseñador debe ver SIEMPRE el motivo del Cliente, con o sin nota del CM.
  it('Cliente rechaza → CM reenvía al Diseñador → el Diseñador ve el motivo del Cliente (y la nota del CM si existe)', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Post para reenviar' } as any,
      designerClaims,
    );
    await postsService.submitPostForReview(post.id, designerClaims);
    await postsService.approvePost(post.id, cmClaims);
    await postsService.clientRejectPost(post.id, { comment: 'Cambien la imagen principal' } as any, ownerClaims);

    // El Diseñador no puede reenviar al Diseñador (acción del CM).
    await expect(
      postsService.forwardToDesigner(post.id, {} as any, designerClaims),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // Sin nota propia del CM — el motivo del Cliente igual debe llegar.
    const forwarded = await postsService.forwardToDesigner(post.id, {} as any, cmClaims);
    expect(forwarded.status).toBe(PostStatus.BORRADOR);

    const detailWithoutCmNote = await postsService.getPost(post.id, designerClaims);
    const forwardEntry = detailWithoutCmNote.statusHistory.find(
      (h: { fromStatus: string; toStatus: string }) => h.fromStatus === 'rechazado_cliente' && h.toStatus === 'borrador',
    );
    const clientRejectEntry = detailWithoutCmNote.statusHistory.find(
      (h: { toStatus: string }) => h.toStatus === 'rechazado_cliente',
    );
    expect(clientRejectEntry.comment).toBe('Cambien la imagen principal');
    expect(forwardEntry.comment).toBeNull();

    // Segunda vuelta: esta vez el CM SÍ agrega una nota propia.
    await postsService.submitPostForReview(post.id, designerClaims);
    await postsService.approvePost(post.id, cmClaims);
    await postsService.clientRejectPost(post.id, { comment: 'Todavía falta el logo' } as any, ownerClaims);
    await postsService.forwardToDesigner(post.id, { comment: 'Usa el logo nuevo, no el viejo' } as any, cmClaims);

    const detailWithCmNote = await postsService.getPost(post.id, designerClaims);
    const history = detailWithCmNote.statusHistory as Array<{ toStatus: string; fromStatus: string; comment: string | null }>;
    const lastClientReject = [...history].reverse().find((h) => h.toStatus === 'rechazado_cliente');
    const lastForward = [...history].reverse().find((h) => h.fromStatus === 'rechazado_cliente' && h.toStatus === 'borrador');
    expect(lastClientReject?.comment).toBe('Todavía falta el logo');
    expect(lastForward?.comment).toBe('Usa el logo nuevo, no el viejo');
  });

  // Bug real encontrado en vivo: el Cliente veía el post desde que se creaba
  // (borrador/en_revision) — el trabajo interno de Diseñador/CM no le
  // corresponde todavía. Le toca desde que el CM aprueba y se lo reenvía.
  it('el Cliente no ve el post mientras está en trabajo interno (borrador/en_revision/rechazado), sí desde aprobado', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Post para visibilidad del Cliente' } as any,
      designerClaims,
    );

    await expect(postsService.getPost(post.id, ownerClaims)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await postsService.listPosts({ campaignId }, ownerClaims)).some((p: { id: string }) => p.id === post.id)).toBe(false);

    await postsService.submitPostForReview(post.id, designerClaims);
    await expect(postsService.getPost(post.id, ownerClaims)).rejects.toBeInstanceOf(ForbiddenException);

    await postsService.approvePost(post.id, cmClaims);
    const detail = await postsService.getPost(post.id, ownerClaims);
    expect(detail.id).toBe(post.id);
    expect((await postsService.listPosts({ campaignId }, ownerClaims)).some((p: { id: string }) => p.id === post.id)).toBe(true);

    // El CM y el Diseñador siguen viendo todo, sin esta restricción.
    await expect(postsService.getPost(post.id, cmClaims)).resolves.toBeDefined();
    await expect(postsService.getPost(post.id, designerClaims)).resolves.toBeDefined();
  });

  // Bug real encontrado en vivo: "Publicar ahora" (sin fecha) mandaba 400 —
  // faltaba el fallback a "ahora mismo" cuando no hay dto.scheduledAt ni
  // post.scheduledAt previo (el formulario de creación nunca lo manda).
  it('schedulePost sin fecha usa "ahora" en vez de exigir una (publicar directo)', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Publicar ahora' } as any,
      designerClaims,
    );
    await postsService.submitPostForReview(post.id, designerClaims);
    await postsService.approvePost(post.id, cmClaims);

    const before = Date.now();
    const scheduled = await postsService.schedulePost(post.id, {} as any, ownerClaims);
    expect(scheduled.status).toBe(PostStatus.PROGRAMADO);
    expect(scheduled.scheduledAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
