import { BadRequestException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
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

  const ownerClaims = { sub: ownerUserId, role: 'cliente' };
  const cmClaims = { sub: cmUserId, role: 'community_manager' };
  const outsiderClaims = { sub: outsiderUserId, role: 'cliente' };

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

    const moduleRef = await Test.createTestingModule({ imports: [PostsModule] }).compile();
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
  });

  it('permite crear la publicación al CM asignado a la campaña', async () => {
    const post = await postsService.createPost(
      {
        brandId,
        campaignId,
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
        content: 'Pendiente de revisión ajena',
      } as any,
      ownerClaims,
    );

    await expect(postsService.submitPostForReview(post.id, ownerClaims)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
