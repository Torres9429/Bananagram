'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { EmptyState } from '@repo/ui';
import { CampaignCard } from '../../components/campaigns/CampaignCard';
import { getMyCampaigns } from '../../lib/mock-data';

// Modernizada (§1 rediseño campañas CM/Diseñador) para verse igual que las
// campañas del Cliente en /profile — mismo CampaignCard, mismo destino de
// detalle (/profile/campaigns/[id], sin CampaignTabs). Antes navegaba a la
// ruta legacy /brands/[id]/campaigns/[id] (con CampaignTabs) — eso NO se
// borra (sigue accesible directamente), pero ya no es el destino por defecto.
export default function MyCampaignsPage() {
  const router = useRouter();
  const campaigns = getMyCampaigns();

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={1}>Mis campañas</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Campañas en las que participas, de todos los perfiles asignados.
      </Typography>
      {campaigns.length === 0 ? (
        <EmptyState
          title="Sin campañas asignadas"
          description="Aún no participas en ninguna campaña. El CM o el Cliente te asignarán cuando haya trabajo disponible."
        />
      ) : (
        <Grid container spacing={2}>
          {campaigns.map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.id}>
              <CampaignCard campaign={c} profileName={c.profileName} onClick={() => router.push(`/profile/campaigns/${c.id}`)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
