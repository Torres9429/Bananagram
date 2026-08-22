'use client';

import { useState } from 'react';
import Typography from '@mui/material/Typography';
import { FormDialog, LabeledField, useToast } from '@repo/ui/ui';
import { useCreateRoleMutation } from '../store/api/admin.api';

interface CreateRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (roleId: string) => void;
}

// El rol nace sin ningún permiso asignado (tabla en blanco) — el admin los
// concede después desde la matriz de /roles. Mismo patrón que
// CreateUserDialog.tsx (FormDialog + mutación RTK Query + toast).
export function CreateRoleDialog({ open, onClose, onCreated }: CreateRoleDialogProps) {
  const [name, setName] = useState('');
  const [createRole, { isLoading }] = useCreateRoleMutation();
  const { showSuccess, showError } = useToast();

  function handleClose() {
    setName('');
    onClose();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const role = await createRole({ name: name.trim() }).unwrap();
      showSuccess(`Rol "${name.trim()}" creado — sin privilegios todavía, asígnalos desde la matriz.`);
      onCreated?.(role.id);
      handleClose();
    } catch {
      showError('No se pudo crear el rol — verifica que el nombre no esté ya en uso.');
    }
  }

  return (
    <FormDialog
      open={open}
      title="Nuevo rol"
      confirmLabel="Crear rol"
      confirmDisabled={!name.trim() || isLoading}
      onClose={handleClose}
      onConfirm={handleCreate}
    >
      <LabeledField
        label="Nombre del rol"
        placeholder="ej. solo_lectura"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
      />
      <Typography variant="caption" color="text.secondary">
        El rol se crea sin privilegios — actívalos desde la matriz de abajo una vez creado.
      </Typography>
    </FormDialog>
  );
}
