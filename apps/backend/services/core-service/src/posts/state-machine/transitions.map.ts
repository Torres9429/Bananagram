import { PostStatus } from '../../types/post-status.enum';

// Cubre los dos tramos documentados en docs/base/modelo2.txt (comentario de
// PostStatus): aprobación (borrador→en_revision→aprobado/rechazado) y
// publicación multi-red (programado→publicando→publicado/parcial/error/cancelado).
// rechazado→borrador es la regla de negocio #4 (regresa con motivo obligatorio).
export const VALID_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  [PostStatus.BORRADOR]:    [PostStatus.EN_REVISION],
  [PostStatus.EN_REVISION]: [PostStatus.APROBADO, PostStatus.RECHAZADO],
  [PostStatus.APROBADO]:    [PostStatus.PROGRAMADO],
  [PostStatus.RECHAZADO]:   [PostStatus.BORRADOR],
  [PostStatus.PROGRAMADO]:  [PostStatus.PUBLICANDO, PostStatus.CANCELADO],
  [PostStatus.PUBLICANDO]:  [PostStatus.PUBLICADO, PostStatus.PARCIAL, PostStatus.ERROR, PostStatus.CANCELADO],
  [PostStatus.PUBLICADO]:   [],
  [PostStatus.PARCIAL]:     [],
  [PostStatus.ERROR]:       [],
  [PostStatus.CANCELADO]:   [],
};
