export const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));

// Solo fecha, sin hora — para campos que son un día calendario (rango de
// campaña), no un instante (createdAt/scheduledFor siguen usando formatDate).
export const formatDateOnly = (date: string | Date) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

// Antes: 8 sitios repetían `{c.startDate ?? 'Sin definir'} – {c.endDate ?? 'Sin definir'}`
// interpolando el ISO crudo del backend (ej. "2026-08-12T00:00:00.000Z") sin
// formatear — se veía técnico y roto en producción, aunque los datos eran
// correctos.
export const formatDateRange = (start?: string | Date | null, end?: string | Date | null) =>
  `${start ? formatDateOnly(start) : 'Sin definir'} – ${end ? formatDateOnly(end) : 'Sin definir'}`;
