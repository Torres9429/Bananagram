import { MappedMetrics, MetricsMapper, RawMetricsResponse, toNullableNumber } from './mapper.interface';

// Tabla de auditoría §7. TikTok usa `shareCount` (singular), a diferencia de
// Instagram/Facebook (`sharesCount`) — nombres distintos, mismo concepto,
// responsabilidad exclusiva del mapper.
export const tiktokMapper: MetricsMapper = (raw: RawMetricsResponse): MappedMetrics => ({
  likes: toNullableNumber(raw.likeCount),
  comments: toNullableNumber(raw.commentsCount),
  shares: toNullableNumber(raw.shareCount),
  views: toNullableNumber(raw.videoViews),
  reach: toNullableNumber(raw.reach),
});
