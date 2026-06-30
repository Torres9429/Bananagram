'use client';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { LabeledField } from '@repo/ui';

export interface CampaignDraft {
  name: string;
  startDate: string;
  endDate: string;
  objective: string;
}

interface Props {
  value: CampaignDraft;
  onChange: (v: CampaignDraft) => void;
  brandName: string;
}

export function StepCampaign({ value, onChange, brandName }: Props) {
  return (
    <Stack gap={2}>
      <Typography variant="caption" color="text.secondary">
        Esta será la primera campaña de <strong>{brandName}</strong>. Podrás crear más campañas después.
      </Typography>

      <LabeledField
        label="Nombre de la campaña:"
        placeholder="Ej. Lanzamiento Verano 2026"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        required
      />

      <LabeledField
        label="Objetivo de la campaña:"
        placeholder="Ej. Aumentar reconocimiento de marca en redes"
        value={value.objective}
        onChange={(e) => onChange({ ...value, objective: e.target.value })}
        required
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <LabeledField
            label="Fecha de inicio:"
            type="date"
            value={value.startDate}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            required
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <LabeledField
            label="Fecha de fin:"
            type="date"
            value={value.endDate}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            required
          />
        </Box>
      </Box>
    </Stack>
  );
}
