'use client';

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import { EmptyState, LabeledSelect } from '@repo/ui';
import { selectCampaignOptions, selectFactsForNetworkTabs } from '../../store/analytics.selectors';
import { compareCampaigns } from '../../lib/analytics/engine';

const ROWS: { key: 'totalReach' | 'avgEngagementRate' | 'postsCount' | 'totalInteractions'; label: string; unit?: string }[] = [
  { key: 'totalReach', label: 'Alcance' },
  { key: 'avgEngagementRate', label: 'Engagement', unit: '%' },
  { key: 'postsCount', label: 'Publicaciones' },
  { key: 'totalInteractions', label: 'Interacciones' },
];

/**
 * Compara 2 campañas lado a lado. La selección de campañas es estado local de
 * UI (no un filtro global — no debe afectar al resto del dashboard), pero los
 * datos comparados vienen siempre de compareCampaigns (Fase 4, engine puro).
 */
export function CampaignComparison() {
  const facts = useSelector(selectFactsForNetworkTabs);
  const campaignOptions = useSelector(selectCampaignOptions);
  const [campaignIdA, setCampaignIdA] = useState<string | null>(campaignOptions[0]?.id ?? null);
  const [campaignIdB, setCampaignIdB] = useState<string | null>(campaignOptions[1]?.id ?? null);

  const result = useMemo(() => compareCampaigns(facts, campaignIdA, campaignIdB), [facts, campaignIdA, campaignIdB]);

  if (campaignOptions.length < 2) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Se necesitan al menos 2 campañas" description="Ajusta los filtros de perfil activos." />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Comparación entre campañas</Typography>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6}>
          <LabeledSelect label="Campaña A" value={campaignIdA ?? ''} onChange={(e) => setCampaignIdA((e.target.value as string) || null)}>
            {campaignOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </LabeledSelect>
        </Grid>
        <Grid item xs={12} sm={6}>
          <LabeledSelect label="Campaña B" value={campaignIdB ?? ''} onChange={(e) => setCampaignIdB((e.target.value as string) || null)}>
            {campaignOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </LabeledSelect>
        </Grid>
      </Grid>

      {!result.campaignA || !result.campaignB ? (
        <EmptyState title="Sin datos para alguna de las campañas seleccionadas" />
      ) : (
        <>
          <Stack gap={1.5} mb={2}>
            {ROWS.map((row) => (
              <Grid container spacing={2} key={row.key} alignItems="center">
                <Grid item xs={4}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#7A5C00' }}>
                    {result.campaignA!.kpis[row.key]}{row.unit ?? ''}
                  </Typography>
                </Grid>
                <Grid item xs={4} textAlign="center">
                  <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                </Grid>
                <Grid item xs={4} textAlign="right">
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#1565C0' }}>
                    {result.campaignB!.kpis[row.key]}{row.unit ?? ''}
                  </Typography>
                </Grid>
              </Grid>
            ))}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={700} mb={1}>Top de {result.campaignA.campaignName}</Typography>
              <Stack gap={0.5}>
                {result.campaignA.topPosts.map((p) => (
                  <Typography key={p.id} variant="caption" color="text.secondary">• {p.postTitle} ({p.engagementRate}%)</Typography>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={700} mb={1}>Top de {result.campaignB.campaignName}</Typography>
              <Stack gap={0.5}>
                {result.campaignB.topPosts.map((p) => (
                  <Typography key={p.id} variant="caption" color="text.secondary">• {p.postTitle} ({p.engagementRate}%)</Typography>
                ))}
              </Stack>
            </Grid>
          </Grid>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            El Score Digital es a nivel de perfil, no existe una versión por campaña en el modelo de datos actual.
          </Typography>
        </>
      )}
    </Paper>
  );
}
