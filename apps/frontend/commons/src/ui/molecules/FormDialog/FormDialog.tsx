'use client';

import type { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface Props {
  open: boolean;
  title: string;
  maxWidth?: 'xs' | 'sm' | 'md';
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: ReactNode;
}

export function FormDialog({
  open,
  title,
  maxWidth = 'xs',
  confirmLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  confirmDisabled = false,
  onClose,
  onConfirm,
  children,
}: Props) {
  const theme = useTheme();
  // Mobile: los diálogos van a pantalla completa en vez de quedar como una
  // caja angosta con márgenes fijos de 32px por lado (patrón estándar de
  // MUI, ver sus docs de "Full-screen dialogs").
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth fullScreen={fullScreen}>
      <DialogTitle

        sx={(theme) => ({
          position: 'relative',
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          fontWeight: 700,
          pr: 6,
          mb: 1,
        })}
      >
        {title}
        <IconButton
          onClick={onClose}
          size="medium"
          sx={(theme) => ({
            position: 'absolute',
            top: 8,
            right: 8,
            color: theme.palette.primary.contrastText,
          })}
        >
          <CloseIcon fontSize="large" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>{children}</DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={(theme) => ({
            bgcolor: theme.palette.background.paper,
            color: theme.palette.secondary.main,
            borderColor: theme.palette.primary.main,
            '&:hover': { bgcolor: theme.palette.primary.light, borderColor: theme.palette.primary.main },
          })}
        >
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary" disabled={confirmDisabled}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
