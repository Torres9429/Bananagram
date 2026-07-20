import { UnprocessableEntityException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostStatus } from '../../../../../commons/types/post-status.enum';
import { VALID_TRANSITIONS } from './transitions.map';

export function validateTransition(from: PostStatus, to: PostStatus, comment?: string, createdBy?: string, userId?: string) {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new UnprocessableEntityException(`Transición inválida: ${from} → ${to}`);
  }
  if (to === PostStatus.RECHAZADO && !comment?.trim()) {
    throw new BadRequestException('El motivo de rechazo es obligatorio');
  }
  if (to === PostStatus.APROBADO && createdBy === userId) {
    throw new ForbiddenException('El creador de una publicación no puede aprobarla');
  }
}
