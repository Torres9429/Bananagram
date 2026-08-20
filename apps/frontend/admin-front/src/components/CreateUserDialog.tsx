'use client';

import { useState } from 'react';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { FormDialog, LabeledField, LabeledSelect, useToast } from '@repo/ui/ui';
import { formatRoleName } from '@repo/ui/utils';
import { useCreateUserMutation } from '../store/api/admin.api';
import { useListRolesQuery } from '../store/api/admin.api';

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

// El backend (auth-service.createUser) crea la cuenta activa de inmediato con
// la contraseña dada por el admin — no existe flujo de invitación/activación
// por correo en el backend real (eso quedó como mock puro en la versión
// anterior de este diálogo, nunca tuvo respaldo). Roles vienen de
// GET /admin/roles en vez de una lista fija, para no hardcodear qué roles
// existen (mismo criterio que el resto del sistema de permisos).
export function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('');
  const { data: roles = [] } = useListRolesQuery();
  const [createUser, { isLoading }] = useCreateUserMutation();
  const { showSuccess, showError } = useToast();

  function handleClose() {
    setEmail('');
    setPassword('');
    setRoleName('');
    onClose();
  }

  async function handleCreate() {
    if (!email.trim() || password.length < 6 || !roleName) return;
    try {
      await createUser({ email: email.trim(), password, roleName }).unwrap();
      showSuccess(`Usuario ${email.trim()} creado.`);
      handleClose();
    } catch {
      showError('No se pudo crear el usuario — verifica que el correo no esté ya registrado.');
    }
  }

  return (
    <FormDialog
      open={open}
      title="Nuevo usuario"
      confirmLabel="Crear usuario"
      confirmDisabled={!email.trim() || password.length < 6 || !roleName || isLoading}
      onClose={handleClose}
      onConfirm={handleCreate}
    >
      <LabeledField
        label="Correo electrónico"
        type="email"
        placeholder="nombre@bananagram.mx"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoFocus
      />
      <LabeledField
        label="Contraseña inicial"
        type="password"
        placeholder="Mínimo 6 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <LabeledSelect label="Rol" value={roleName} onChange={(e) => setRoleName(e.target.value as string)}>
        {roles.map((r) => (
          <MenuItem key={r.id} value={r.name}>{formatRoleName(r.name)}</MenuItem>
        ))}
      </LabeledSelect>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        La cuenta queda activa de inmediato con esta contraseña — comunícasela al usuario por un canal
        seguro.
      </Typography>
      {(roleName === 'community_manager' || roleName === 'disenador') && (
        <Typography variant="caption" color="text.secondary" display="block">
          Para aparecer en las listas de asignación de campaña, el usuario debe iniciar sesión y completar
          su perfil (nombre, categorías y especialidades) desde "Mi perfil" — no aparece de inmediato.
        </Typography>
      )}
    </FormDialog>
  );
}
