import { RawMetricsResponse, toNullableNumber } from './mapper.interface';

// Mapper específico por red para métricas de CUENTA (POST /analytics/social),
// análogo a mapper.registry.ts (que ya existe para métricas de PUBLICACIÓN,
// POST /analytics/post) — son dos endpoints de Ayrshare distintos, con
// shapes de respuesta distintos, así que necesitan su propio registro.
//
// Antes (ayrshare.service.ts.getAccountMetrics) usaba un solo parser
// universal (followersCount/likeCount/commentsCount/shareCount/viewsCount/
// reachCount) para las 4 redes — funcionaba por casualidad para Instagram
// (sus nombres de campo coinciden) pero rompía TikTok en silencio.
//
// Verificado en vivo contra Ayrshare real (2026-08-17, cuentas de prueba
// conectadas — Facebook e Instagram tenían datos reales, TikTok también):
// - Instagram: followersCount, likeCount, commentsCount, shareCount,
//   viewsCount, reachCount — exactamente los nombres esperados.
// - TikTok: followerCount (SIN 's', singular — no followersCount ni
//   followers), likeCountTotal, commentCountTotal, shareCountTotal,
//   viewCountTotal. Confirmado con datos reales no-cero (7621 seguidores)
//   que el parser universal anterior perdía por completo. Sin ningún campo
//   de reach a nivel de cuenta — se mapea a null, no es un bug, Ayrshare no
//   lo expone para TikTok en este endpoint.
// - Facebook: followersCount SÍ coincide (ya funcionaba), pero NO existe
//   ningún campo equivalente a likes/comments/shares/views/reach en la
//   forma que esperamos — Facebook expone en su lugar agregados distintos
//   (reactions.*, pagePostEngagements, pageMediaView, pageVideoViews) sin
//   correspondencia 1:1 clara. Se dejan en null a propósito — mapear
//   "reactions.total" como si fuera "likes" sería inventar una equivalencia
//   no confirmada, decisión de producto pendiente (ver reporte de la
//   auditoría de métricas 2026-08-17).
// - X/Twitter: sin cuenta conectada para probar en vivo — se deja igual que
//   antes (followersCount ?? followers), sin verificar, documentado como
//   pendiente.
export interface AccountMappedMetrics {
  followers: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
}

export type AccountMetricsMapper = (raw: RawMetricsResponse) => AccountMappedMetrics;

const instagramAccountMapper: AccountMetricsMapper = (raw) => ({
  followers: toNullableNumber(raw.followersCount),
  likes: toNullableNumber(raw.likeCount),
  comments: toNullableNumber(raw.commentsCount),
  shares: toNullableNumber(raw.shareCount),
  views: toNullableNumber(raw.viewsCount),
  reach: toNullableNumber(raw.reachCount),
});

const facebookAccountMapper: AccountMetricsMapper = (raw) => ({
  followers: toNullableNumber(raw.followersCount),
  // Sin equivalente confirmado en la respuesta real — no se inventa uno.
  likes: null,
  comments: null,
  shares: null,
  views: null,
  reach: null,
});

const tiktokAccountMapper: AccountMetricsMapper = (raw) => ({
  followers: toNullableNumber(raw.followerCount),
  likes: toNullableNumber(raw.likeCountTotal),
  comments: toNullableNumber(raw.commentCountTotal),
  shares: toNullableNumber(raw.shareCountTotal),
  views: toNullableNumber(raw.viewCountTotal),
  reach: null, // Ayrshare no expone reach de cuenta para TikTok en este endpoint.
});

const xAccountMapper: AccountMetricsMapper = (raw) => ({
  followers: toNullableNumber(raw.followersCount ?? raw.followers),
  likes: null,
  comments: null,
  shares: null,
  views: null,
  reach: null,
});

const accountMapperRegistry: Record<string, AccountMetricsMapper> = {
  instagram: instagramAccountMapper,
  facebook: facebookAccountMapper,
  tiktok: tiktokAccountMapper,
  x: xAccountMapper,
};

export function getAccountMapperForNetwork(networkCode: string): AccountMetricsMapper {
  const mapper = accountMapperRegistry[networkCode];
  if (!mapper) {
    throw new Error(`No hay mapper de métricas de cuenta registrado para la red "${networkCode}"`);
  }
  return mapper;
}
