import Chip from '@mui/material/Chip';
import type { PostStatus } from '../../../types/post.types';

export const STATUS_COLORS: Record<PostStatus, { bg: string; color: string }> = {
  borrador: { bg: '#F5F5F5', color: '#616161' },
  en_revision: { bg: '#E3F2FD', color: '#1565C0' },
  aprobado: { bg: '#E8F5E9', color: '#2E7D32' },
  rechazado: { bg: '#FFEBEE', color: '#C62828' },
  rechazado_cliente: { bg: '#FFEBEE', color: '#C62828' },
  programado: { bg: '#FFF3E0', color: '#E65100' },
  publicando: { bg: '#E1F5FE', color: '#0277BD' },
  publicado: { bg: '#E8F5E9', color: '#2E7D32' },
  parcial: { bg: '#FFFDE7', color: '#F9A825' },
  error: { bg: '#FDE2E2', color: '#B71C1C' },
  cancelado: { bg: '#EEEEEE', color: '#757575' },
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  rechazado_cliente: 'Rechazado por el cliente',
  programado: 'Programado',
  publicando: 'Publicando',
  publicado: 'Publicado',
  parcial: 'Parcial',
  error: 'Error',
  cancelado: 'Cancelado',
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
