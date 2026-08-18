import { UnprocessableEntityException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostStatus } from '../../types/post-status.enum';
import { VALID_TRANSITIONS } from './transitions.map';

export function validateTransition(
  from: PostStatus,
  to: PostStatus,
  comment?: string,
  createdBy?: string,
  userId?: string,
  options?: { allowSelfApproval?: boolean },
) {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new UnprocessableEntityException(`Transición inválida: ${from} → ${to}`);
  }
  if ((to === PostStatus.RECHAZADO || to === PostStatus.RECHAZADO_CLIENTE) && !comment?.trim()) {
    throw new BadRequestException('El motivo de rechazo es obligatorio');
  }
  // allowSelfApproval: excepción explícita para cuando el creador ES el CM
  // asignado a la campaña — no hay nadie de mayor autoridad a quien pedirle
  // la aprobación (ver PostsService.approvePost). Por defecto sigue
  // bloqueado: un Diseñador (o cualquier otro creador) nunca puede
  // aprobar su propia publicación.
  if (to === PostStatus.APROBADO && createdBy === userId && !options?.allowSelfApproval) {
    throw new ForbiddenException('El creador de una publicación no puede aprobarla');
  }
}
