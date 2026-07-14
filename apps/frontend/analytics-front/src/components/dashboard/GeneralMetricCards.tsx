'use client';

import { useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { MetricCard } from '@repo/ui/ui';
import { selectAnalyticsKpiComparison } from '../../store/analytics.selectors';

/**
 * "Métricas" agregadas de la pestaña General (§B.3) — a diferencia de
 * NetworkMetricCards (campos nativos de una red concreta, NETWORK_METRIC_FIELDS,
 * que no tienen un equivalente agregable entre redes), aquí se muestran los
 * campos de AnalyticsKpis que no caben ya en la fila de KPIs (alcance,
 * impresiones, interacciones y engagement ya se muestran ahí) — mismo objeto
 * `current` que ya calcula selectAnalyticsKpiComparison, sin cálculo nuevo,
 * solo un segundo recorte de sus campos.
 */
export function GeneralMetricCards() {
  const { current } = useSelector(selectAnalyticsKpiComparison);

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Métricas agregadas</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <MetricCard icon={<GroupsOutlinedIcon />} label="Seguidores ganados" value={current.followersGained} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard icon={<ArticleOutlinedIcon />} label="Publicaciones" value={current.postsCount} />
        </Grid>
      </Grid>
    </Paper>
  );
}
