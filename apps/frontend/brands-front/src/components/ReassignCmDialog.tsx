'use client';

import { useState } from 'react';
import { FormDialog, useToast } from '@repo/ui/ui';
import { useUpdateCampaignMutation } from '../store/api/campaigns.api';
import { CmPicker } from './CmPicker';

interface ReassignCmDialogProps {
  open: boolean;
  campaignId: string;
  categoryIds: string[];
  onClose: () => void;
}

// Fase K: cuando un CM rechaza, el Cliente ahora puede elegir a otro sin
// pasar por curl — el backend ya lo soportaba desde la Fase J (updateCampaign
// permite reasignar cmId mientras cmStatus !== 'aceptada', resetea a
// 'pendiente' y notifica al nuevo CM).
export function ReassignCmDialog({ open, campaignId, categoryIds, onClose }: ReassignCmDialogProps) {
  const [cmId, setCmId] = useState<string | null>(null);
  const [updateCampaign, { isLoading }] = useUpdateCampaignMutation();
  const { showSuccess, showError } = useToast();

  function handleClose() {
    setCmId(null);
    onClose();
  }

  async function handleConfirm() {
    if (!cmId) return;
    try {
      await updateCampaign({ id: campaignId, cmId }).unwrap();
      setCmId(null);
      onClose();
      showSuccess('Se reasignó la campaña — se notificó al nuevo Community Manager.');
    } catch {
      showError('No se pudo reasignar el Community Manager.');
    }
  }

  return (
    <FormDialog
      open={open}
      title="Elegir otro Community Manager"
      maxWidth="sm"
      confirmLabel={isLoading ? 'Reasignando…' : 'Reasignar'}
      confirmDisabled={!cmId || isLoading}
      onClose={handleClose}
      onConfirm={handleConfirm}
    >
      <CmPicker categoryIds={categoryIds} value={cmId} onChange={setCmId} skip={!open} />
    </FormDialog>
  );
}
