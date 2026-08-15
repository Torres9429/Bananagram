import { PostStatus } from '../types/post-status.enum';

// Función pura, testeable sin BD ni red (auditoría §4/§18) — decide el
// estado agregado de un Post a partir de los resultados por red que
// devuelve SocialProvider.publish(). El publish de este proyecto es
// síncrono (una sola llamada HTTP, respuesta inmediata) — nunca hay un
// estado intermedio "publicando" persistido entre redes, solo 'publicado'
// o 'error' por resultado.
export function computeAggregateStatus(perNetworkStatuses: Array<'publicado' | 'error'>): PostStatus {
  if (perNetworkStatuses.length === 0) return PostStatus.ERROR;
  if (perNetworkStatuses.every((status) => status === 'publicado')) return PostStatus.PUBLICADO;
  if (perNetworkStatuses.every((status) => status === 'error')) return PostStatus.ERROR;
  return PostStatus.PARCIAL;
}
