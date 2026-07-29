import { BadRequestException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { validateTransition } from '../services/core-service/src/posts/state-machine/post-state-machine';
import { PostStatus } from '../services/core-service/src/types/post-status.enum';

describe('Posts Flow Integration', () => {
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
});
