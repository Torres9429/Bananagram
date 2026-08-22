'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Mismo lenguaje visual que FormDialog (barra de título de color primario,
// X para cerrar, botón "Cancelar" outlined) — antes este componente se
// quedaba con el look por defecto de MUI, distinto al resto de diálogos de
// la app. La barra de título siempre usa primary.main, igual que FormDialog
// (no cambia a rojo en destructive) — solo el botón de confirmar sí.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
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
          onClick={onCancel}
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
      {description && (
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button
          onClick={onCancel}
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
        <Button onClick={onConfirm} variant="contained" color={'primary'}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
