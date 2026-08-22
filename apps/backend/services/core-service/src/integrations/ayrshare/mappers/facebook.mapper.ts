import { MappedMetrics, MetricsMapper, RawMetricsResponse, toNullableNumber } from './mapper.interface';

// Tabla de auditoría §7. Facebook no expone `reach` de forma clara — queda
// `null`, nunca 0.
export const facebookMapper: MetricsMapper = (raw: RawMetricsResponse): MappedMetrics => ({
  likes: toNullableNumber(raw.likeCount),
  comments: toNullableNumber(raw.commentsCount),
  shares: toNullableNumber(raw.sharesCount),
  views: toNullableNumber(raw.mediaView),
  reach: null,
});
