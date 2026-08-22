import { RawMetricsResponse, getPath, toNullableNumber } from './mapper.interface';

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
// - Facebook: followersCount SÍ coincide (ya funcionaba). Payload real
//   capturado en vivo (2026-08-19, cuenta de prueba, ver auditoría de
//   métricas): no hay ningún campo "commentsCount"/"shareCount"/"reachCount"
//   ni equivalente — Ayrshare no expone comentarios/shares/reach a nivel de
//   PÁGINA de Facebook en este endpoint (sí existen por publicación, endpoint
//   distinto). Sí hay 2 campos con correspondencia directa y honesta (no una
//   ratio inventada, valores reales de Meta): `reactions.total` (suma de
//   like/love/wow/haha/sorry/anger — es literalmente "likes" agregados de la
//   página) → likes, y `pageMediaView` (vistas de contenido de la página) →
//   views. `pagePostEngagements` se deja fuera a propósito: es una métrica
//   combinada propia de Meta (clics+reacciones+comentarios+shares) sin
//   equivalente limpio a ninguno de nuestros campos individuales — sumarlo a
//   cualquiera de ellos duplicaría conteos ya cubiertos por `reactions.total`.
//   `comments`/`shares`/`reach`/`posts` siguen en null AQUÍ (este mapper es
//   solo el baseline de /analytics/social, acotado por `quarters`) —
//   `posts`/`likes`/`comments`/`shares`/`views` de Facebook se RE-CALCULAN
//   aparte en ayrshare.service.ts.getAccountMetrics() contando GET
//   /history/facebook (all-time, sin ventana), porque /analytics/social deja
//   estos campos casi en 0 para páginas con actividad real pero vieja
//   (verificado en vivo 2026-08-19). Solo `reach` sigue sin ninguna fuente
//   real conocida para Facebook.
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
  // Total de publicaciones de la cuenta completa — confirmado en vivo
  // 2026-08-18 contra Ayrshare real: Instagram expone `mediaCount`, TikTok
  // `videoCountTotal`. Facebook/X no traen campo equivalente, queda null.
  posts: number | null;
}

export type AccountMetricsMapper = (raw: RawMetricsResponse) => AccountMappedMetrics;

const instagramAccountMapper: AccountMetricsMapper = (raw) => ({
  followers: toNullableNumber(raw.followersCount),
  likes: toNullableNumber(raw.likeCount),
  comments: toNullableNumber(raw.commentsCount),
  shares: toNullableNumber(raw.shareCount),
  views: toNullableNumber(raw.viewsCount),
  reach: toNullableNumber(raw.reachCount),
  posts: toNullableNumber(raw.mediaCount),
});

const facebookAccountMapper: AccountMetricsMapper = (raw) => ({
  followers: toNullableNumber(raw.followersCount),
  likes: toNullableNumber(getPath(raw, ['reactions', 'total'])),
  // Ayrshare no expone comentarios/shares/reach/conteo de publicaciones a
  // nivel de página de Facebook en este endpoint — sin equivalente real, no
  // se inventa uno.
  comments: null,
  shares: null,
  views: toNullableNumber(raw.pageMediaView),
  reach: null,
  posts: null,
});

const tiktokAccountMapper: AccountMetricsMapper = (raw) => ({
  followers: toNullableNumber(raw.followerCount),
  likes: toNullableNumber(raw.likeCountTotal),
  comments: toNullableNumber(raw.commentCountTotal),
  shares: toNullableNumber(raw.shareCountTotal),
  views: toNullableNumber(raw.viewCountTotal),
  reach: null, // Ayrshare no expone reach de cuenta para TikTok en este endpoint.
  posts: toNullableNumber(raw.videoCountTotal),
});

const xAccountMapper: AccountMetricsMapper = (raw) => ({
  followers: toNullableNumber(raw.followersCount ?? raw.followers),
  likes: null,
  comments: null,
  shares: null,
  views: null,
  reach: null,
  posts: null,
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

// audienceCountry — Instagram/Facebook ya devuelven Record<string,number>
// (`audienceCountry`, mismo nombre que nuestro campo). TikTok NO: expone
// `audienceCountries`, un ARRAY `[{percentage, country}]` (confirmado contra
// documentación oficial de Ayrshare) — se convierte acá a la misma forma
// Record que ya usa AudienceCountryChart, sin fabricar ningún dato nuevo
// (percentage real de Ayrshare, solo cambia de forma). X/Twitter no expone
// demografía en absoluto en este endpoint (confirmado en documentación:
// "returns profile metadata only") — null real, no un gap.
export function getAudienceCountryForNetwork(networkCode: string, raw: RawMetricsResponse): Record<string, number> | null {
  if (networkCode === 'tiktok') {
    const countries = raw.audienceCountries as { percentage?: number; country?: string }[] | undefined;
    if (!Array.isArray(countries) || countries.length === 0) return null;
    const record: Record<string, number> = {};
    for (const entry of countries) {
      if (entry?.country && typeof entry.percentage === 'number') record[entry.country] = entry.percentage;
    }
    return Object.keys(record).length > 0 ? record : null;
  }
  const value = raw.audienceCountry as Record<string, number> | undefined;
  return value && Object.keys(value).length > 0 ? value : null;
}

// audienceGenderAge — deliberadamente SIN soporte para TikTok. Ayrshare
// expone `audienceAges`/`audienceGenders` como 2 arrays PLANOS e
// INDEPENDIENTES (no un cruce edad×género como sí es `audienceGenderAge` de
// Instagram) — combinarlos produciría una tabla cruzada inventada (ej.
// asumir una distribución uniforme entre géneros dentro de cada rango de
// edad), no un dato real de Ayrshare. Se deja explícitamente sin mapear acá
// en vez de forzar una equivalencia falsa (regla de la auditoría: "no
// fuerces equivalencias"). Documentado como pendiente real, no un olvido —
// para mostrarlo de verdad haría falta un modelo de datos con edad y género
// como series separadas, no el mismo audienceGenderAge combinado.
