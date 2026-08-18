'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PrimaryButton, usePermissions } from '@repo/ui/ui';
import { CreateCampaignDialog } from '../../../components/CreateCampaignDialog';
import { useListCampaignsQuery } from '../../../store/api/campaigns.api';
import { useSelectedBrand } from '../../../hooks/useSelectedBrand';
import { CAMPAIGN_STATUS_LABEL } from '../../../lib/mock-data';

// Listado de campañas del Cliente en /profile — mismo contenido que
// brands-front/app/brands/[id]/campaigns, pero SIN BrandTabs. Usa la marca
// activa (useSelectedBrand, compartida con ClientSection) en vez de tomar
// myBrands[0] a ciegas — un Cliente puede tener varias marcas.
export default function ProfileCampaignsPage() {
  const { can } = usePermissions();
  const router = useRouter();
  const { selectedBrand: profile } = useSelectedBrand();
  const { data: allCampaigns = [] } = useListCampaignsQuery();
  const campaigns = profile ? allCampaigns.filter((c) => c.brandId === profile.id) : [];
  const [createOpen, setCreateOpen] = useState(false);

  if (!profile) return null;

  // El permiso RBAC es la única autoridad de SI puede crear (decisión de
  // producto confirmada 2026-08-17) — la relación con esta marca ya quedó
  // implícita en que `profile` viene de useListMyBrandsQuery (GET /brands),
  // que para no-admin ya filtra a solo marcas con relación real; el backend
  // (CampaignsService.createCampaign) la vuelve a validar de forma
  // independiente igualmente.
  const canCreateCampaign = can('campanas', 'crear');

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff', px: 1 }}>
        <Stack direction="row" alignItems="center">
          <Tooltip title="Volver a mi perfil">
            <IconButton onClick={() => router.push('/profile')} sx={{ color: 'secondary.main', ml: 1, my: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>Campañas — {profile.name}</Typography>
          {canCreateCampaign && (
            <PrimaryButton onClick={() => setCreateOpen(true)}>
              + Nueva campaña
            </PrimaryButton>
          )}
        </Stack>
        <Stack gap={1.5}>
          {campaigns.map((c) => {
            const s = CAMPAIGN_STATUS_LABEL[c.status];
            return (
              <Stack
                key={c.id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                onClick={() => router.push(`/brands/${c.brandId}/campaigns/${c.id}`)}
                sx={{ p: 2, bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderRadius: 3, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
              >
                <Box>
                  <Typography variant="body1" fontWeight={600}>{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.startDate ?? 'Sin definir'} – {c.endDate ?? 'Sin definir'}</Typography>
                </Box>
                <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />
              </Stack>
            );
          })}
        </Stack>
      </Box>

      <CreateCampaignDialog open={createOpen} brandId={profile.id} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
