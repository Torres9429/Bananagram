'use client';

import { useState } from 'react';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloseIcon from '@mui/icons-material/Close';
import { FormDialog, LabeledField, LabeledSelect, PrimaryButton } from '@repo/ui';
import { ZONE_URLS } from '@repo/ui/config';
import type { AppRole } from '@repo/ui/types';
import type { MockUser, CreatedUser, CreateUserDialogProps } from '../interfaces/interface';
import { CREATABLE_ROLES, ROLE_LABELS, generateMockId } from '../lib/mock-data';

export function CreateUserDialog({ open, onClose, onCreate }: CreateUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>(CREATABLE_ROLES[0]);
  const [confirmed, setConfirmed] = useState<CreatedUser | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCreate() {
    if (!name.trim() || !email.trim()) return;

    // status 'pending': el usuario no tiene contraseña hasta que activa la
    // cuenta con el link de abajo — coincide exactamente con la semántica de
    // UserStatus.pending (ver docs/frontend-db-alignment.md, decisión #4).
    const newUser: MockUser = {
      id: generateMockId('u'),
      name: name.trim(),
      email: email.trim(),
      role,
      status: 'pending',
      lastLogin: 'Nunca',
    };
    onCreate(newUser);

    // Genera la URL de activación mock — en producción el backend enviará esto por correo.
    const activationUrl = `${ZONE_URLS.authFront}/activate?email=${encodeURIComponent(email.trim())}`;
    setConfirmed({ name: name.trim(), email: email.trim(), activationUrl });

    // Limpia el form para próximo uso.
    setName('');
    setEmail('');
    setRole(CREATABLE_ROLES[0]);
  }

  function handleClose() {
    setConfirmed(null);
    setCopied(false);
    onClose();
  }

  function copyUrl() {
    if (!confirmed) return;
    navigator.clipboard.writeText(confirmed.activationUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // --- Pantalla de confirmación ---
  if (confirmed) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={(theme) => ({
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            fontWeight: 700,
            position: 'relative',
            pr: 6,
          })}
        >
          Invitación enviada
          <IconButton
            onClick={handleClose}
            size="medium"
            sx={(theme) => ({ position: 'absolute', top: 8, right: 8, color: theme.palette.primary.contrastText })}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack alignItems="center" gap={2} py={1}>
            <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#2E7D32' }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" fontWeight={700}>{confirmed.name}</Typography>
              <Typography variant="body2" color="text.secondary">{confirmed.email}</Typography>
            </Box>
            <Alert severity="success" sx={{ width: '100%', borderRadius: 2, textAlign: 'left' }}>
              La cuenta fue creada. En producción se enviará un correo de activación automáticamente.
            </Alert>
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.75 }}>
                Enlace de activación (solo en desarrollo):
              </Typography>
              <Stack direction="row" gap={1} alignItems="center"
                sx={{ bgcolor: '#F5F5F5', borderRadius: 2, px: 1.5, py: 1, border: '1px solid #E8E8E8' }}>
                <Typography
                  variant="caption"
                  sx={{ flex: 1, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 11 }}
                >
                  {confirmed.activationUrl}
                </Typography>
                <Tooltip title={copied ? '¡Copiado!' : 'Copiar enlace'}>
                  <IconButton size="small" onClick={copyUrl} sx={{ color: 'secondary.main' }}>
                    <ContentCopyOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              {copied && (
                <Chip label="¡Copiado!" size="small" sx={{ mt: 0.75, bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }} />
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <PrimaryButton onClick={handleClose}>
            Listo
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    );
  }

  // --- Formulario de creación ---
  return (
    <FormDialog
      open={open}
      title="Nuevo usuario"
      confirmLabel="Crear y enviar invitación"
      confirmDisabled={!name.trim() || !email.trim()}
      onClose={handleClose}
      onConfirm={handleCreate}
    >
      <LabeledField
        label="Nombre completo"
        placeholder="Ej. Ana García"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
      />
      <LabeledField
        label="Correo electrónico"
        type="email"
        placeholder="nombre@bananagram.mx"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <LabeledSelect label="Rol" value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
        {CREATABLE_ROLES.map((r) => (
          <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
        ))}
      </LabeledSelect>
      <Typography variant="caption" color="text.secondary">
        El usuario recibirá un correo para activar su cuenta y establecer su contraseña.
        Los Clientes se registran de forma autónoma.
      </Typography>
    </FormDialog>
  );
}
