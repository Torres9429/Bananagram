import { MetricsMapper } from './mapper.interface';
import { instagramMapper } from './instagram.mapper';
import { facebookMapper } from './facebook.mapper';
import { tiktokMapper } from './tiktok.mapper';
import { xMapper } from './x.mapper';

// Indexado por SocialNetwork.code (nombres completos en minúscula, ver
// apps/frontend/commons/src/types/social-network.types.ts). linkedin/youtube
// quedan fuera del alcance de esta fase (la auditoría §7 no cubre esas dos
// redes) — un intento de sincronizar métricas para ellas falla explícito en
// vez de devolver ceros/datos inventados.
const mapperRegistry: Record<string, MetricsMapper> = {
  instagram: instagramMapper,
  facebook: facebookMapper,
  tiktok: tiktokMapper,
  x: xMapper,
};

export function getMapperForNetwork(networkCode: string): MetricsMapper {
  const mapper = mapperRegistry[networkCode];
  if (!mapper) {
    throw new Error(`No hay mapper de métricas registrado para la red "${networkCode}"`);
  }
  return mapper;
}
