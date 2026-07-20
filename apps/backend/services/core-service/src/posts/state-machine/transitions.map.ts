import { PostStatus } from '../../../../../commons/types/post-status.enum';

export const VALID_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  [PostStatus.BORRADOR]:    [PostStatus.EN_REVISION],
  [PostStatus.EN_REVISION]: [PostStatus.APROBADO, PostStatus.RECHAZADO],
  [PostStatus.APROBADO]:    [PostStatus.PROGRAMADO],
  [PostStatus.RECHAZADO]:   [PostStatus.BORRADOR],
  [PostStatus.PROGRAMADO]:  [PostStatus.PUBLICADO],
  [PostStatus.PUBLICADO]:   [],
};
