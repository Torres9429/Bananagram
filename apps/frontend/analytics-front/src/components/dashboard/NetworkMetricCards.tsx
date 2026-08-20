'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import { EmptyState, MetricCard, ChartTitle } from '@repo/ui/ui';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useSelectedNetwork } from './useSelectedNetwork';

// Datos reales — saves/profileVisits/follows nunca se normalizaron como
// columna (auditoría §7: inconsistentes entre redes, van en
// PostMetric.raw) — el backend ahora los lee de ahí por request y los suma
// por red. Este widget solo tiene sentido dentro de una pestaña de red
// específica (no en "General", donde mezclar campos que cada red expone
// distinto no tendría lectura clara) — mismo criterio que ya usa
// AccountGrowthOverview con su prop networkCode.
export function NetworkMetricCards() {
  const campaigns = useFilteredCampaigns();
  const networkCode = useSelectedNetwork();

  const totals = useMemo(() => {
    let saves: number | null = null;
    let profileVisits: number | null = null;
    let follows: number | null = null;
    let sawAny = false;
    for (const campaign of campaigns) {
      const network = campaign.byNetwork.find((n) => n.networkCode === networkCode);
      if (!network) continue;
      sawAny = true;
      if (network.saves !== null) saves = (saves ?? 0) + network.saves;
      if (network.profileVisits !== null) profileVisits = (profileVisits ?? 0) + network.profileVisits;
      if (network.follows !== null) follows = (follows ?? 0) + network.follows;
    }
    return { saves, profileVisits, follows, sawAny };
  }, [campaigns, networkCode]);

  const cards = [
    totals.saves !== null && { icon: <BookmarkBorderIcon />, label: 'Guardados', value: totals.saves },
    totals.profileVisits !== null && { icon: <PersonSearchOutlinedIcon />, label: 'Visitas al perfil', value: totals.profileVisits },
    totals.follows !== null && { icon: <PersonAddAltOutlinedIcon />, label: 'Seguidores ganados', value: totals.follows },
  ].filter((c): c is { icon: React.ReactElement; label: string; value: number } => !!c);

  if (!totals.sawAny) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin campañas con datos todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <ChartTitle
        title="Métricas específicas de la red"
        description="Guardados, visitas al perfil y seguidores ganados — solo lo que esta red expone hoy."
        info="Cada red social expone campos distintos de forma nativa; algunos ya no existen en la plataforma de origen (ej. Meta retiró varias métricas de Facebook en 2026, no es algo que Bananagram esté ocultando). Solo se muestran los campos disponibles para la red seleccionada."
      />
      {cards.length === 0 ? (
        <EmptyState
          title="Sin métricas propias de esta red"
          description="Ninguna red conectada expone hoy campos adicionales más allá de likes/comentarios/alcance para esta selección."
        />
      ) : (
        <Grid container spacing={2}>
          {cards.map((card) => (
            <Grid item xs={12} sm={4} key={card.label}>
              <MetricCard icon={card.icon} label={card.label} value={card.value} />
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
}
