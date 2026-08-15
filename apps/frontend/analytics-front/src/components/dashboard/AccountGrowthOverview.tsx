'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { EmptyState, MetricCard, ScoreGauge } from '@repo/ui/ui';
import {
  useGetBrandScoreQuery,
  useGetBrandMetricsHistoryQuery,
  type BrandMetricsHistoryPoint,
} from '../../store/api/analytics.api';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useDateRangeParams } from './useDateRangeParams';
import { useFilteredCampaigns } from './useFilteredCampaigns';

// Visible solo para Cliente/Administrador (decisión confirmada) — el
// backend ya lo exige (ScoreController/BrandsController.
// assertIsBrandOwnerOrAdmin, 403 para CM/Diseñador), esto solo evita
// llamadas innecesarias desde una sección que no les correspondería ver.
// A diferencia del resto del dashboard (acotado por campaña), esto muestra
// el crecimiento de la cuenta desde que se conectó, con o sin campañas.
// networkCode: null = agregado de todas las redes (tab "General"), o un
// código específico ('instagram', etc.) para filtrar a esa sola red cuando
// se usa dentro de una pestaña de red — mismo patrón que NetworkOverview.
export function AccountGrowthOverview({ networkCode = null }: { networkCode?: string | null }) {
  const campaigns = useFilteredCampaigns();
  const brandId = campaigns[0]?.brandId;
  const range = useDateRangeParams();

  const { data: score } = useGetBrandScoreQuery(brandId ?? '', { skip: !brandId });
  const { data: rawHistory = [] } = useGetBrandMetricsHistoryQuery(brandId ? { brandId, range } : ({} as never), { skip: !brandId });
  const history = useMemo(
    () => (networkCode ? rawHistory.filter((point) => point.socialAccount.socialNetwork.code === networkCode) : rawHistory),
    [rawHistory, networkCode],
  );

  const { chartData, networkCodes } = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>();
    const codes = new Set<string>();
    for (const point of history) {
      const code = point.socialAccount.socialNetwork.code;
      codes.add(code);
      const date = point.capturedAt.slice(0, 10);
      const row = byDate.get(date) ?? {};
      row[code] = point.followers; // última captura del día gana (Map conserva orden de inserción, la respuesta ya viene ordenada asc)
      byDate.set(date, row);
    }
    const rows = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));
    return { chartData: rows, networkCodes: Array.from(codes) };
  }, [history]);

  // Última captura por red (history ya viene ordenada asc, así que el
  // último punto de cada red gana) — mismo criterio que el resto del
  // dashboard: "más reciente conocido", no toda la serie sumada de golpe.
  // Solo Visualizaciones: Interacciones/Alcance de cuenta completa se
  // quitaron de aquí — "Resumen" (NetworkOverview) ya los muestra, acotados
  // a los filtros activos, justo debajo de esta sección; tenerlos dos veces
  // con alcances distintos (cuenta completa vs. campañas filtradas) bajo el
  // mismo nombre confundía más de lo que ayudaba.
  const latestViews = useMemo(() => {
    const latestByNetwork = new Map<string, BrandMetricsHistoryPoint>();
    for (const point of history) {
      latestByNetwork.set(point.socialAccount.socialNetwork.code, point);
    }
    let total = 0;
    let hasAny = false;
    for (const point of latestByNetwork.values()) {
      if (point.views !== null) { total += point.views; hasAny = true; }
    }
    return hasAny ? total : null;
  }, [history]);

  if (!brandId) return null;

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        {networkCode ? `Cuenta — ${NETWORK_DISPLAY[networkCode as keyof typeof NETWORK_DISPLAY]?.label ?? networkCode}` : 'Cuenta — panorama general'}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Acumulado desde que se conectó la cuenta — no cambia con los filtros de Marca/Campaña/Red social.
      </Typography>

      {/* Solo Visualizaciones acá (única que no se repite en "Resumen"). Nota:
          Ayrshare no expone "visitas al perfil" para Instagram en este
          endpoint, por eso tampoco hay tarjeta para eso — deliberado. */}
      {latestViews !== null && (
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={4}>
            <MetricCard icon={<VisibilityOutlinedIcon />} label="Visualizaciones (cuenta completa)" value={latestViews} />
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          {score ? (
            <ScoreGauge score={score.score} classification={score.classification} />
          ) : (
            <Typography variant="body2" color="text.secondary">Calculando score…</Typography>
          )}
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography variant="body2" color="text.secondary" mb={1}>Crecimiento de seguidores</Typography>
          {chartData.length < 2 ? (
            <EmptyState
              title="Todavía no hay suficiente historial"
              description="El crecimiento se registra cada 6 horas desde que se conecta una red — vuelve más tarde para ver la tendencia."
            />
          ) : (
            <Stack>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend />
                  {networkCodes.map((code) => (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      name={NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.label ?? code}
                      stroke={NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.color ?? '#9E9E9E'}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Stack>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
}
