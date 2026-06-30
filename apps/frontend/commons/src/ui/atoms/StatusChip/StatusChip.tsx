import Chip from '@mui/material/Chip';
import type { PostStatus } from '../../../types/post.types';

export const STATUS_COLORS: Record<PostStatus, { bg: string; color: string }> = {
  borrador: { bg: '#F5F5F5', color: '#616161' },
  en_revision: { bg: '#E3F2FD', color: '#1565C0' },
  aprobado: { bg: '#E8F5E9', color: '#2E7D32' },
  rechazado: { bg: '#FFEBEE', color: '#C62828' },
  programado: { bg: '#FFF3E0', color: '#E65100' },
  publicado: { bg: '#E8F5E9', color: '#2E7D32' },
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  programado: 'Programado',
  publicado: 'Publicado',
};

export function StatusChip({ status }: { status: PostStatus }) {
  const s = STATUS_COLORS[status] ?? { bg: '#F5F5F5', color: '#616161' };
  return (
    <Chip
      label={STATUS_LABELS[status] || status}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 10 }}
    />
  );
}
