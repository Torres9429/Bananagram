'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@mui/material/styles';
import { MetricCard, ScoreGauge } from '@repo/ui/ui';
import { ScrollReveal } from '../molecules/ScrollReveal';
import type { NetworkActivity } from '../../../interfaces/interface';

// Mismos 3 componentes y pesos reales de la fórmula del score digital
// (ver CLAUDE.md): Score = Consistencia×0.30 + Engagement×0.40 + Frecuencia×0.30.
const SCORE_BREAKDOWN = [
  { label: 'Engagement', weight: 40, value: 90 },
  { label: 'Consistencia', weight: 30, value: 84 },
  { label: 'Frecuencia', weight: 30, value: 80 },
];

const SCORE = Math.round(SCORE_BREAKDOWN.reduce((sum, item) => sum + item.value * (item.weight / 100), 0));

function breakdownColor(value: number) {
  if (value >= 70) return 'success.main';
  if (value < 60) return 'error.main';
  return 'warning.main';
}

// Mismas 3 redes que ya usamos en Campañas/Calendario, para no inventar canales nuevos.
const NETWORK_ACTIVITY: NetworkActivity[] = [
  { code: 'IG', name: 'Instagram', tone: 'primary', posts: 24, engagement: '5.2%', fill: 68 },
  { code: 'TK', name: 'TikTok', tone: 'info', posts: 18, engagement: '9.8%', fill: 92 },
  { code: 'LI', name: 'LinkedIn', tone: 'success', posts: 8, engagement: '7.4%', fill: 45 },
];

const SCORE_TREND = [
  { month: 'Ene', score: 60 },
  { month: 'Feb', score: 64 },
  { month: 'Mar', score: 72 },
  { month: 'Abr', score: 78 },
  { month: 'May', score: 82 },
  { month: 'Jun', score: SCORE },
];

const panelSx = {
  p: 3,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3,
} as const;

function ScoreTrendChart() {
  const theme = useTheme();
  // Igual que ScoreGauge en @repo/ui: recharts genera ids distintos en
  // servidor/cliente, así que se monta solo en cliente para evitar el
  // hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <Box sx={{ height: 220 }} />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={SCORE_TREND} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke={theme.palette.primary.main} strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MetricsSection() {
  return (
    <Box
      id="metricas"
      component="section"
      sx={{
        position: 'relative',
        zIndex: 1,
        py: { xs: 8, md: 12 },
        scrollMarginTop: '88px',
        bgcolor: 'primary.light',
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <ScrollReveal>
          <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ mb: 6 }}>
            <Typography variant="overline" color="secondary.main" fontWeight={700}>
              Métricas
            </Typography>
            <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
              El mismo score digital que ves dentro del sistema
            </Typography>
          </Stack>
        </ScrollReveal>

        <Stack spacing={3}>
          <ScrollReveal delay={0.1}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <MetricCard icon={<InsightsOutlinedIcon />} label="Alcance total" value={482000} formatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <MetricCard icon={<FavoriteBorderOutlinedIcon />} label="Interacciones" value={38400} formatter={(v) => `${(v / 1000).toFixed(1)}K`} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <MetricCard icon={<TrendingUpOutlinedIcon />} label="Crecimiento" value={24} unit="%" />
              </Grid>
            </Grid>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <Paper elevation={0} sx={panelSx}>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 2 }}>
                Score Digital
              </Typography>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <ScoreGauge score={SCORE} classification="alto" />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Stack spacing={2}>
                    {SCORE_BREAKDOWN.map((item) => (
                      <Box key={item.label}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {item.label}{' '}
                            <Typography component="span" variant="caption" color="text.secondary">
                              ({item.weight}% del score)
                            </Typography>
                          </Typography>
                          <Typography variant="body2" fontWeight={700} color={breakdownColor(item.value)}>
                            {item.value}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={item.value}
                          sx={{
                            height: 6,
                            borderRadius: 999,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': { bgcolor: breakdownColor(item.value), borderRadius: 999 },
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <Paper elevation={0} sx={panelSx}>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 2 }}>
                Actividad por red social
              </Typography>
              <Stack spacing={2}>
                {NETWORK_ACTIVITY.map((network) => (
                  <Stack key={network.code} direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        bgcolor: `${network.tone}.main`,
                        color: `${network.tone}.contrastText`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {network.code}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>
                          {network.posts} posts este mes
                        </Typography>
                        <Typography variant="caption" fontWeight={700} color={`${network.tone}.main`}>
                          {network.engagement} eng
                        </Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={network.fill} color={network.tone} sx={{ height: 5, borderRadius: 999 }} />
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </ScrollReveal>

          <ScrollReveal delay={0.25}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <MetricCard icon={<CampaignOutlinedIcon />} label="Campañas activas" value={8} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <MetricCard icon={<TaskAltOutlinedIcon />} label="Publicaciones al día" value={94} unit="%" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <MetricCard icon={<AccessTimeOutlinedIcon />} label="Aprobación promedio" value={4} unit="h" />
              </Grid>
            </Grid>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <Paper elevation={0} sx={panelSx}>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                Evolución del score
              </Typography>
              <ScoreTrendChart />
            </Paper>
          </ScrollReveal>
        </Stack>
      </Container>
    </Box>
  );
}
