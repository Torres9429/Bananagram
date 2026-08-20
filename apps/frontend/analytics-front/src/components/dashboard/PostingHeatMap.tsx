'use client';

import { useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import { EmptyState, LabeledSelect } from '@repo/ui/ui';
import { useGetCampaignMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useDateRangeParams } from './useDateRangeParams';
import { useFilteredCampaigns } from './useFilteredCampaigns';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const GRID_TEMPLATE_COLUMNS = `36px repeat(${HOURS.length}, 1fr)`;

// Datos reales (Fase Q2) — Post.publishedAt ya trae la hora real, no hacía
// falta ningún dato nuevo del lado del backend para esto (a diferencia de lo
// que asumía la Fase Q original, que lo dejó como EmptyState).
//
// networkCode: cuando se pasa (tabs de red específica), acota el heatmap a
// solo lo publicado en esa red — antes este widget solo existía en General,
// agregado entre TODAS las redes conectadas, sin forma de ver "¿a qué hora
// funciona mejor ESTA red en particular?" (feedback del usuario, 2026-08-19).
export function PostingHeatMap({ networkCode }: { networkCode?: string } = {}) {
  const campaigns = useFilteredCampaigns();
  const range = useDateRangeParams();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const activeCampaignId = campaignId ?? campaigns[0]?.campaignId ?? null;

  const { data: history } = useGetCampaignMetricsHistoryQuery(
    activeCampaignId ? { campaignId: activeCampaignId, range, networkCode } : ({} as never),
    { skip: !activeCampaignId },
  );

  const { grid, max } = useMemo(() => {
    const map = new Map<string, number>();
    let maxValue = 0;
    for (const bucket of history?.heatmap ?? []) {
      map.set(`${bucket.dayOfWeek}-${bucket.hour}`, bucket.interactions);
      maxValue = Math.max(maxValue, bucket.interactions);
    }
    return { grid: map, max: maxValue };
  }, [history]);

  if (campaigns.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin campañas con datos todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1}>Mapa de calor de publicación</Typography>
      {campaigns.length > 1 && (
        <LabeledSelect label="Campaña" value={activeCampaignId ?? ''} onChange={(e) => setCampaignId((e.target.value as string) || null)} sx={{ mb: 2, maxWidth: 280 }}>
          {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
        </LabeledSelect>
      )}
      {grid.size === 0 ? (
        <EmptyState
          title="Sin publicaciones con métricas todavía"
          description={
            networkCode
              ? 'Esta campaña no tiene publicaciones con métricas capturadas en esta red todavía.'
              : 'Se necesitan posts publicados con al menos una captura de métricas.'
          }
        />
      ) : (
        // CSS Grid con columnas 1fr (antes era una fila de Box de ancho fijo
        // dentro de un contenedor con scroll horizontal — dejaba una franja
        // vacía a la derecha en pantallas anchas porque el grid nunca crecía
        // más allá de su ancho mínimo). Con 1fr, las 24 columnas siempre
        // llenan el ancho real disponible del Paper, sin scroll ni espacio
        // muerto (feedback del usuario, 2026-08-19).
        //
        // Bug real (2026-08-20): ese cambio quitó el scroll horizontal por
        // completo, así que en pantallas angostas (celular) las 24 columnas
        // se comprimían a unos pocos px cada una — las horas ya ni cabían y
        // las celdas quedaban invisibles. `minWidth` es solo un piso: en
        // desktop el contenedor real ya es más ancho que eso, así que 1fr
        // sigue llenando el espacio disponible sin franja vacía (nada
        // cambia ahí); en mobile, cuando el Paper es más angosto que el
        // piso, el scroll horizontal interno (no el de toda la página) se
        // activa solo ahí — mismo patrón que ya usa NetworkComparison.tsx
        // para su tabla.
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE_COLUMNS, gap: 0.5, minWidth: 720 }}>
            <Box />
            {HOURS.map((hour) => (
              <Typography key={hour} variant="caption" sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 10 }}>
                {hour}
              </Typography>
            ))}
            {DAY_LABELS.map((label, dayOfWeek) => (
              <Box key={label} sx={{ display: 'contents' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, alignSelf: 'center' }}>{label}</Typography>
                {HOURS.map((hour) => {
                  const value = grid.get(`${dayOfWeek}-${hour}`) ?? 0;
                  const opacity = max > 0 ? Math.max(0.08, value / max) : 0.08;
                  return (
                    <Tooltip key={hour} title={`${label} ${hour}:00 — ${value} interacciones`}>
                      <Box sx={{ aspectRatio: '1 / 1', borderRadius: 0.75, bgcolor: `rgba(224, 168, 0, ${opacity})`, border: '1px solid rgba(0,0,0,0.04)' }} />
                    </Tooltip>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
