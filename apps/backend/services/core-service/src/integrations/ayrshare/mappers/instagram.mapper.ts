import { MappedMetrics, MetricsMapper, RawMetricsResponse, toNullableNumber } from './mapper.interface';

// Tabla de auditoría §7. Instagram es la única red de las 4 que expone
// `reach` de forma clara.
export const instagramMapper: MetricsMapper = (raw: RawMetricsResponse): MappedMetrics => ({
  likes: toNullableNumber(raw.likeCount),
  comments: toNullableNumber(raw.commentsCount),
  shares: toNullableNumber(raw.sharesCount),
  views: toNullableNumber(raw.viewsCount ?? raw.mediaView),
  reach: toNullableNumber(raw.reachCount),
});
