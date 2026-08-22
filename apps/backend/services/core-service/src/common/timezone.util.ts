// Sin dependencia nueva: Intl.DateTimeFormat (nativo de Node) ya resuelve
// conversión de timezone real (reglas de horario de verano incluidas) sin
// necesitar date-fns-tz/luxon — auditoría B11/B18: antes score.service.ts
// usaba Date.getHours() (hora LOCAL DEL SERVIDOR) mientras
// campaign-metrics.service.ts usaba Date.getUTCDay()/getUTCHours() (UTC) —
// dos criterios distintos para el mismo concepto ("¿en qué hora ocurrió
// esto?") dentro del mismo pipeline de métricas. Brand.timezone ya existe en
// el schema para esto exacto, nullable, con fallback de aplicación aquí.
export const DEFAULT_TIMEZONE = 'America/Mexico_City';

export function getHourInTimezone(date: Date, timezone: string | null): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone ?? DEFAULT_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).format(date);
  // Intl puede devolver "24" para medianoche en vez de "0" dependiendo del
  // locale/runtime — se normaliza al rango 0-23.
  return Number(hour) % 24;
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function getDayOfWeekInTimezone(date: Date, timezone: string | null): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone ?? DEFAULT_TIMEZONE,
    weekday: 'short',
  }).format(date);
  return WEEKDAY_INDEX[weekday] ?? date.getUTCDay();
}
