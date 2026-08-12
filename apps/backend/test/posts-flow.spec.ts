import { BadRequestException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { CloudinaryService, UploadableFile } from '../services/core-service/src/cloudinary/cloudinary.service';
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
  const outsiderUserId = randomUUID();

  let brandId: string;
  let campaignId: string;
  let inactiveCampaignId: string;
  let socialNetworkIds: string[];

  const ownerClaims = { sub: ownerUserId, roles: ['cliente'] };
  const cmClaims = { sub: cmUserId, roles: ['community_manager'] };
  const outsiderClaims = { sub: outsiderUserId, roles: ['cliente'] };
  const cloudinaryMock = {
    uploadFile: jest.fn(async (file: UploadableFile) => ({
      public_id: `bananagram/posts/${file.originalname}`,
      secure_url: `https://res.cloudinary.com/demo/${file.originalname}`,
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
      .overrideProvider(CloudinaryService)
      .useValue(cloudinaryMock)
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

  it('rechazado regresa a borrador (regla de negocio #4)', () => {
    expect(() => validateTransition(PostStatus.RECHAZADO, PostStatus.BORRADOR)).not.toThrow();
    expect(() => validateTransition(PostStatus.RECHAZADO, PostStatus.EN_REVISION)).toThrow(
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

  it('rechaza enviar a revisión un post que no pertenece al CM asignado', async () => {
    const post = await postsService.createPost(
      {
        brandId,
        campaignId,
        socialNetworkIds,
        content: 'Pendiente de revisión ajena',
      } as any,
      ownerClaims,
    );

    await expect(postsService.submitPostForReview(post.id, ownerClaims)).rejects.toBeInstanceOf(
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

  it('aprueba una publicación en revisión (Cliente dueño de la marca)', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Para aprobar' } as any,
      cmClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);

    const approved = await postsService.approvePost(post.id, ownerClaims);
    expect(approved.status).toBe(PostStatus.APROBADO);

    const history = await corePrisma.postStatusHistory.findMany({
      where: { postId: post.id },
      orderBy: { id: 'asc' },
    });
    expect(history[history.length - 1].toStatus).toBe(PostStatus.APROBADO);
  });

  it('rechaza aprobar si el usuario no es dueño de la marca ni admin', async () => {
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

    await expect(postsService.approvePost(post.id, ownerClaims)).rejects.toBeInstanceOf(
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
      postsService.rejectPost(post.id, { comment: '' } as any, ownerClaims),
    ).rejects.toBeInstanceOf(BadRequestException);

    const rejected = await postsService.rejectPost(post.id, { comment: 'Faltan hashtags' } as any, ownerClaims);
    expect(rejected.status).toBe(PostStatus.RECHAZADO);
  });

  it('programa una publicación aprobada cuando la marca tiene las redes conectadas', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Para programar' } as any,
      cmClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);
    await postsService.approvePost(post.id, ownerClaims);

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
      cmClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);
    await postsService.approvePost(post.id, ownerClaims);

    await expect(
      postsService.schedulePost(post.id, { scheduledAt: '2026-09-01T10:00:00.000Z' } as any, cmClaims),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancela una publicación programada', async () => {
    const post = await postsService.createPost(
      { brandId, campaignId, socialNetworkIds, content: 'Para cancelar' } as any,
      cmClaims,
    );
    await postsService.submitPostForReview(post.id, cmClaims);
    await postsService.approvePost(post.id, ownerClaims);
    await postsService.schedulePost(post.id, { scheduledAt: '2026-09-01T10:00:00.000Z' } as any, cmClaims);

    const cancelled = await postsService.cancelPost(post.id, cmClaims);
    expect(cancelled.status).toBe(PostStatus.CANCELADO);
  });
});
