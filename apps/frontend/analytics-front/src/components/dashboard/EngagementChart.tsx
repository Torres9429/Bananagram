'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { EmptyState, LabeledSelect, ChartTitle } from '@repo/ui/ui';
import { useGetCampaignMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useDateRangeParams } from './useDateRangeParams';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useSelectedNetwork } from './useSelectedNetwork';
import { setDateRange } from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters } from '../../store/analytics.selectors';

// Datos reales (Fase Q2, GET /campaigns/:id/metrics-history) — a diferencia
// del resto del dashboard (que agrega todas las campañas visibles a la
// vez), este gráfico necesita UNA serie de tiempo continua, así que se
// enfoca en una sola campaña a la vez (selector, igual criterio que
// CampaignComparison) en vez de mezclar series de campañas distintas en la
// misma línea.
//
// Click en un punto de la línea = filtra el resto del dashboard a ESE día
// (setDateRange con start=end=esa fecha) — el Periodo ya era un filtro
// global (Sección G/H de la auditoría), pero hasta ahora solo se fijaba
// desde el selector de fechas de arriba, nunca haciendo clic en un dato real
// (feedback del usuario, pidiendo más clic-a-filtro tipo Dashboard drill).
export function EngagementChart() {
  const dispatch = useDispatch();
  const filters = useSelector(selectAnalyticsFilters);
  const campaigns = useFilteredCampaigns();
  const range = useDateRangeParams();
  const networkCode = useSelectedNetwork();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const activeCampaignId = campaignId ?? campaigns[0]?.campaignId ?? null;

  // networkCode agregado 2026-08-20 (bug real): sin esto, la serie mostraba
  // TODA la campaña (todas sus redes mezcladas) sin importar qué tab de red
  // estuviera activa — una campaña sin nada publicado en la red seleccionada
  // igual aparecía con datos, los de sus otras redes.
  const { data: history } = useGetCampaignMetricsHistoryQuery(
    activeCampaignId ? { campaignId: activeCampaignId, range, networkCode: networkCode ?? undefined } : ({} as never),
    { skip: !activeCampaignId },
  );

  if (campaigns.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin campañas con datos todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <ChartTitle
        title="Tendencia de engagement"
        description="Cómo cambió el engagement día a día. Haz clic en un punto para filtrar el dashboard a ese día."
        info="Engagement = interacciones ÷ alcance, expresado en porcentaje. Se necesitan al menos 2 días con métricas capturadas para trazar la línea."
        mb={1}
      />
      {campaigns.length > 1 && (
        <LabeledSelect
          label="Campaña"
          value={activeCampaignId ?? ''}
          onChange={(e) => setCampaignId((e.target.value as string) || null)}
          sx={{ mb: 2, maxWidth: 280 }}
        >
          {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
        </LabeledSelect>
      )}
      {filters.dateRange && (
        <Chip
          size="small"
          label={`Filtrando por ${filters.dateRange.start}${filters.dateRange.start !== filters.dateRange.end ? ` – ${filters.dateRange.end}` : ''}`}
          onDelete={() => dispatch(setDateRange(null))}
          sx={{ mb: 1.5, bgcolor: 'primary.light', color: 'primary.contrastTextMuted', fontWeight: 600 }}
        />
      )}
      {!history || history.series.length < 2 ? (
        <EmptyState title="Todavía no hay suficiente historial" description="Se necesitan al menos 2 días con métricas capturadas para trazar una tendencia." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={history.series}
            onClick={(e) => {
              const date = e?.activeLabel as string | undefined;
              if (date) dispatch(setDateRange({ start: date, end: date }));
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <RechartsTooltip />
            <Line
              type="monotone"
              dataKey="engagementRate"
              name="Engagement"
              stroke="#E0A800"
              strokeWidth={2}
              dot={{ r: 3, fill: '#E0A800', cursor: 'pointer' }}
              activeDot={{ r: 5, cursor: 'pointer' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
