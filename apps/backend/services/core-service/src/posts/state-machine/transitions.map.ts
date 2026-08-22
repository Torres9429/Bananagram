import { PostStatus } from '../../types/post-status.enum';

// Fase O — dos tramos de aprobación reales: Diseñador → CM → Cliente.
// rechazado (CM rechaza al Diseñador) va directo a en_revision — el Diseñador
// ya puede editar el contenido estando en rechazado y reenviar directo, sin
// necesitar pasar por borrador como parada intermedia (regla de negocio #4
// documentada como "regresan a borrador" nunca tuvo código real detrás antes
// de esta fase; esto es funcionalmente equivalente con un salto menos).
// rechazado_cliente sí es una parada real: ahí el CM decide entre editar y
// reenviar al Cliente (→ aprobado) o reenviar al Diseñador (→ borrador).
export const VALID_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  [PostStatus.BORRADOR]:           [PostStatus.EN_REVISION],
  [PostStatus.EN_REVISION]:        [PostStatus.APROBADO, PostStatus.RECHAZADO],
  [PostStatus.RECHAZADO]:          [PostStatus.EN_REVISION],
  [PostStatus.APROBADO]:           [PostStatus.PROGRAMADO, PostStatus.RECHAZADO_CLIENTE],
  [PostStatus.RECHAZADO_CLIENTE]:  [PostStatus.APROBADO, PostStatus.BORRADOR],
  [PostStatus.PROGRAMADO]:         [PostStatus.PUBLICANDO, PostStatus.CANCELADO],
  [PostStatus.PUBLICANDO]:         [PostStatus.PUBLICADO, PostStatus.PARCIAL, PostStatus.ERROR, PostStatus.CANCELADO],
  [PostStatus.PUBLICADO]:          [],
  [PostStatus.PARCIAL]:            [],
  [PostStatus.ERROR]:              [],
  [PostStatus.CANCELADO]:          [],
};
