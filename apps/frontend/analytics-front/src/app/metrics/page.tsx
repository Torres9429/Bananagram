'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { DataTable, type DataTableColumn, ScoreGauge, EmptyState, usePermissions } from '@repo/ui';
import {
  MOCK_KPIS,
  MOCK_ENGAGEMENT_SERIES,
  MOCK_BRAND_METRICS,
  MOCK_REACH_BY_NETWORK,
  MOCK_TOP_POSTS,
  type MockTopPost,
} from '../../lib/mock-data';

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
      <Typography variant="h5" fontWeight={700}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

export default function MetricsPage() {
  const { can } = usePermissions();

  if (!can('metrics', 'view')) {
    return (
      <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
        <EmptyState title="No tienes permisos para ver métricas" />
      </Box>
    );
  }

  const columns: DataTableColumn<MockTopPost>[] = [
    { key: 'title', header: 'Publicación', render: (p) => <Typography variant="body2" fontWeight={600}>{p.title}</Typography> },
    { key: 'brand', header: 'Marca', render: (p) => <Typography variant="body2" color="text.secondary">{p.brand}</Typography> },
    { key: 'network', header: 'Red', render: (p) => <Chip size="small" label={p.network} sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 600 }} /> },
    { key: 'likes', header: 'Likes', align: 'right', render: (p) => <Typography variant="body2">{p.likes.toLocaleString()}</Typography> },
    {
      key: 'engagement',
      header: 'Engagement',
      align: 'right',
      render: (p) => <Typography variant="body2" fontWeight={700} sx={{ color: '#2E7D32' }}>{p.engagementRate}%</Typography>,
    },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>Métricas</Typography>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Engagement promedio" value={`${MOCK_KPIS.avgEngagement}%`} />
        <KpiCard label="Alcance total" value={MOCK_KPIS.totalReach.toLocaleString()} />
        <KpiCard label="Score promedio" value={MOCK_KPIS.avgScore} />
        <KpiCard label="Publicaciones analizadas" value={MOCK_KPIS.postsAnalyzed} />
      </div>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Engagement — últimos 7 días</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={MOCK_ENGAGEMENT_SERIES}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <RechartsTooltip />
                <Line type="monotone" dataKey="engagement" stroke="#FDC726" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Score Digital promedio</Typography>
            <ScoreGauge score={MOCK_KPIS.avgScore} classification="alto" />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Score por marca</Typography>
            <Grid container spacing={2}>
              {MOCK_BRAND_METRICS.map((b) => (
                <Grid item xs={12} sm={4} key={b.id}>
                  <Stack direction="row" gap={1} alignItems="center" mb={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: b.color }} />
                    <Typography variant="body2" fontWeight={600}>{b.name}</Typography>
                  </Stack>
                  <ScoreGauge score={b.score.score} classification={b.score.classification} />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>Comparativa de alcance por red social</Typography>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={MOCK_REACH_BY_NETWORK}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
            <XAxis dataKey="network" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <Bar dataKey="reach" fill="#FDC726" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>Publicaciones con mejor desempeño</Typography>
        <DataTable columns={columns} rows={MOCK_TOP_POSTS} getRowKey={(p) => p.id} />
      </Paper>
    </Box>
  );
}
