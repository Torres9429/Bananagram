import { getPath, MappedMetrics, MetricsMapper, RawMetricsResponse, toNullableNumber } from './mapper.interface';

// Tabla de auditoría §7. X/Twitter anida todo bajo `publicMetrics` y no
// expone `reach` — queda `null`. `views` se aproxima con `impressionCount`
// (la única red de las 4 con este nombre para ese concepto).
export const xMapper: MetricsMapper = (raw: RawMetricsResponse): MappedMetrics => ({
  likes: toNullableNumber(getPath(raw, ['publicMetrics', 'likeCount'])),
  comments: toNullableNumber(getPath(raw, ['publicMetrics', 'replyCount'])),
  shares: toNullableNumber(getPath(raw, ['publicMetrics', 'retweetCount'])),
  views: toNullableNumber(getPath(raw, ['publicMetrics', 'impressionCount'])),
  reach: null,
});
