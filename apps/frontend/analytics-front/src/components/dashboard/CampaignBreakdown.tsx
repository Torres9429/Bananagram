'use client';

import { useDispatch } from 'react-redux';
import Paper from '@mui/material/Paper';
import { EmptyState, ChartTitle } from '@repo/ui/ui';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { scopedMetrics } from '../../lib/analytics/real-metrics';
import { useSelectedNetwork } from './useSelectedNetwork';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useNetworkCodesFilter } from './useNetworkCodesFilter';
import { selectCampaign } from '../../store/analyticsFilters.slice';

/**
 * Rendimiento por campaña (interacciones) — datos reales (Fase Q,
 * GET /campaigns/metrics-summary). Click en una barra filtra el resto del
 * dashboard por esa campaña (Red → Campaña → Publicación, mismo patrón que
 * NetworkComparison/TopContent — campaignId ya viene en cada fila, sí hay a
 * qué filtrar).
 */
export function CampaignBreakdown() {
  const dispatch = useDispatch();
  const campaigns = useFilteredCampaigns();
  const networkCode = useSelectedNetwork();
  const networkCodes = useNetworkCodesFilter();

  // Bug real (2026-08-20): antes se mapeaban TODAS las campañas visibles
  // aunque no tuvieran ninguna publicación en la red activa — scopedMetrics
  // ya devolvía reach:0 para esas (correcto), pero la campaña seguía
  // apareciendo como categoría/barra en el gráfico, dando a entender que sí
  // tenía algo ahí. Se excluye del todo cualquier campaña sin ninguna
  // entrada en byNetwork que coincida con el filtro activo — no solo se le
  // pone reach 0, no se muestra. Cubre AMBOS filtros de red posibles: la tab
  // de una red específica (networkCode) Y el multi-select "Red social" del
  // drawer en General (networkCodes) — el primer fix solo cubría el primero.
  const hasMatchingNetwork = (c: (typeof campaigns)[number]) => {
    if (networkCode) return c.byNetwork.some((n) => n.networkCode === networkCode);
    if (networkCodes && networkCodes.length > 0) return c.byNetwork.some((n) => networkCodes.includes(n.networkCode));
    return true;
  };
  // Bug real (2026-08-20): la barra graficaba "reach", una métrica que no
  // existe en absoluto para Facebook (Meta la retiró) ni para TikTok
  // (Ayrshare nunca la expuso a nivel de cuenta) — campañas con actividad
  // real en esas redes se veían con una barra invisible de 0. Se cambia a
  // "interactions" (likes+comentarios+compartidos), que scopedMetrics ya
  // calcula y sí existe en todas las redes — mismo criterio que ya usa
  // PostPerformanceChart, que por eso nunca tuvo este problema.
  const data = campaigns
    .filter(hasMatchingNetwork)
    .map((c) => ({ campaignId: c.campaignId, campaignName: c.name, interactions: scopedMetrics(c, networkCode, networkCodes).interactions }));

  if (data.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin campañas con datos todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <ChartTitle
        title="Rendimiento por campaña"
        description="Interacciones totales de cada campaña. Haz clic en una barra para filtrar por esa campaña."
        info="Suma likes, comentarios y compartidos de todas las publicaciones de la campaña en la red seleccionada. No es alcance ni impresiones — solo interacción directa."
      />
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis dataKey="campaignName" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <RechartsTooltip />
          <Bar
            dataKey="interactions"
            name="Interacciones"
            radius={[4, 4, 0, 0]}
            onClick={(entry) => dispatch(selectCampaign(entry.campaignId))}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry) => (
              <Cell key={entry.campaignId} fill="#E0A800" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
