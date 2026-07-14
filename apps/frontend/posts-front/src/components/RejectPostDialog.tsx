'use client';

import { useState } from 'react';
import { FormDialog, LabeledField } from '@repo/ui/ui';

interface RejectPostDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

// Reutilizado entre /posts/[id] y /posts/approvals (§3 modal de rechazo) —
// pedir motivo antes de rechazar, en vez de cambiar el estado directo.
export function RejectPostDialog({ open, onClose, onConfirm }: RejectPostDialogProps) {
  const [reason, setReason] = useState('');

  function handleClose() {
    setReason('');
    onClose();
  }

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  }

  return (
    <FormDialog
      open={open}
      title="Rechazar publicación"
      confirmLabel="Rechazar"
      confirmDisabled={!reason.trim()}
      onClose={handleClose}
      onConfirm={handleConfirm}
    >
      <LabeledField
        label="Motivo del rechazo"
        placeholder="Explica qué debe corregirse antes de reenviar…"
        multiline
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
        autoFocus
      />
    </FormDialog>
  );
}
