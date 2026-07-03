'use client';

import { useDispatch, useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { selectCampaign } from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters, selectGeneralCampaignBreakdown, selectNetworkDashboard, selectSelectedNetwork } from '../../store/analytics.selectors';

/**
 * Rendimiento por campaña — mismo patrón de interacción (BarChart + Cell + onClick)
 * ya establecido en Fase 2 para la comparativa de alcance por red; aquí se reutiliza
 * para el nivel de drill Red Social → Campaña. Sirve tanto a las 6 pestañas de red
 * (vía selectNetworkDashboard, ya acotado a esa red) como a "General" (vía
 * selectGeneralCampaignBreakdown, agregado de todas las redes) — ambos wrappean
 * la misma función del engine (computeCampaignBreakdown), sin lógica duplicada.
 */
export function CampaignBreakdown() {
  const dispatch = useDispatch();
  const filters = useSelector(selectAnalyticsFilters);
  const selectedNetwork = useSelector(selectSelectedNetwork);
  const networkDashboard = useSelector(selectNetworkDashboard);
  const generalCampaigns = useSelector(selectGeneralCampaignBreakdown);
  const campaigns = selectedNetwork ? (networkDashboard?.campaigns ?? []) : generalCampaigns;
  if (campaigns.length === 0) return null;

  const data = campaigns.map((c) => ({ campaignId: c.campaignId, campaignName: c.campaignName, reach: c.kpis.totalReach }));

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Rendimiento por campaña</Typography>
      <Typography variant="caption" color="text.secondary" mb={2} display="block">
        Clic en una barra para filtrar por esa campaña.
      </Typography>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis dataKey="campaignName" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <RechartsTooltip />
          <Bar
            dataKey="reach"
            radius={[4, 4, 0, 0]}
            onClick={(entry) => dispatch(selectCampaign(entry.campaignId === filters.campaignId ? null : entry.campaignId))}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.campaignId}
                fill={filters.campaignId === entry.campaignId ? '#7A5C00' : '#E0A800'}
                opacity={filters.campaignId && filters.campaignId !== entry.campaignId ? 0.35 : 1}
                style={{ transition: 'opacity 0.15s ease, fill 0.15s ease' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
