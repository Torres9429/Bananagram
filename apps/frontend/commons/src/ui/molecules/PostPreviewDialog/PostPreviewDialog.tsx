'use client';

import type { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { StatusChip } from '../../atoms/StatusChip/StatusChip';
import type { PostStatus } from '../../../types/post.types';

export interface PostPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  status?: PostStatus;
  networkLabel?: string;
  /** `null` = "sin campaña" (se muestra explícitamente); `undefined` = fila oculta. */
  campaignName?: string | null;
  scheduledAt?: string;
  description?: string;
  /** Acción secundaria opcional — ej. abrir el detalle completo en otro microfrontend. */
  onViewFull?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

/**
 * Vista rápida de una publicación/evento en un modal — para calendarios o
 * listados que necesitan mostrar el detalle sin navegar a otra pantalla ni
 * cambiar de ruta. Genérica: no depende de ningún microfrontend en particular,
 * solo recibe datos ya resueltos por el caller. Aprobar/Rechazar/Ver completo
 * son opcionales — el caller decide cuáles pasar (ej. según permisos o si
 * existe una ruta de detalle real).
 */
export function PostPreviewDialog({
  open,
  onClose,
  title,
  status,
  networkLabel,
  campaignName,
  scheduledAt,
  description,
  onViewFull,
  onApprove,
  onReject,
}: PostPreviewDialogProps) {
  const rows: { label: string; value: ReactNode }[] = [
    ...(networkLabel ? [{ label: 'Red social', value: networkLabel }] : []),
    ...(campaignName !== undefined ? [{ label: 'Campaña', value: campaignName ?? 'Sin campaña' }] : []),
    ...(scheduledAt ? [{ label: 'Fecha y hora', value: scheduledAt }] : []),
  ];

  const hasActions = !!(onViewFull || onApprove || onReject);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle
        sx={(theme) => ({
          position: 'relative',
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          fontWeight: 700,
          pr: 6,
        })}
      >
        {title}
        <IconButton
          onClick={onClose}
          size="medium"
          sx={(theme) => ({ position: 'absolute', top: 8, right: 8, color: theme.palette.primary.contrastText })}
        >
          <CloseIcon fontSize="large" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, mt: 2 }}>
        {status && (
          <Box mb={2}>
            <StatusChip status={status} />
          </Box>
        )}
        {rows.length > 0 && (
          <Stack gap={1} mb={description ? 2 : 0}>
            {rows.map((row) => (
              <Stack key={row.label} direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                <Typography variant="body2" fontWeight={500}>{row.value}</Typography>
              </Stack>
            ))}
          </Stack>
        )}
        {description && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{description}</Typography>
            </Box>
          </>
        )}
      </DialogContent>
      {hasActions && (
        <DialogActions>
          {onViewFull && (
            <Button onClick={onViewFull} variant="outlined" sx={{ mr: 'auto' }}>
              Ver publicación completa
            </Button>
          )}
          {onReject && (
            <Button onClick={onReject} variant="outlined" sx={{ color: '#C62828', borderColor: '#C62828' }}>
              Rechazar
            </Button>
          )}
          {onApprove && (
            <Button onClick={onApprove} variant="contained" sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}>
              Aprobar
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}
