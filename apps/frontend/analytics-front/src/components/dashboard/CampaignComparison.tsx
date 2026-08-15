'use client';

import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import { EmptyState, LabeledSelect } from '@repo/ui/ui';
import { scopedMetrics } from '../../lib/analytics/real-metrics';
import { useSelectedNetwork } from './useSelectedNetwork';
import { useFilteredCampaigns } from './useFilteredCampaigns';

const ROWS: { key: 'reach' | 'engagementRate' | 'posts' | 'interactions'; label: string; unit?: string }[] = [
  { key: 'reach', label: 'Alcance' },
  { key: 'engagementRate', label: 'Engagement', unit: '%' },
  { key: 'posts', label: 'Publicaciones' },
  { key: 'interactions', label: 'Interacciones' },
];

/**
 * Compara 2 campañas lado a lado — datos reales (Fase Q). "Top de campaña"
 * muestra un solo post (topPost, lo único que calcula el backend hoy) en vez
 * de una lista — la versión mock mostraba varios porque tenía facts por-post
 * completos, que el backend no expone.
 */
export function CampaignComparison() {
  const campaigns = useFilteredCampaigns();
  const networkCode = useSelectedNetwork();
  const [campaignIdA, setCampaignIdA] = useState<string | null>(null);
  const [campaignIdB, setCampaignIdB] = useState<string | null>(null);

  const campaignA = campaigns.find((c) => c.campaignId === (campaignIdA ?? campaigns[0]?.campaignId)) ?? null;
  const campaignB = campaigns.find((c) => c.campaignId === (campaignIdB ?? campaigns[1]?.campaignId)) ?? null;

  if (campaigns.length < 2) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Se necesitan al menos 2 campañas" description="Todavía no hay suficientes campañas con datos para comparar." />
      </Paper>
    );
  }

  const metricsA = campaignA ? scopedMetrics(campaignA, networkCode) : null;
  const metricsB = campaignB ? scopedMetrics(campaignB, networkCode) : null;

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Comparación entre campañas</Typography>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6}>
          <LabeledSelect label="Campaña A" value={campaignA?.campaignId ?? ''} onChange={(e) => setCampaignIdA((e.target.value as string) || null)}>
            {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
          </LabeledSelect>
        </Grid>
        <Grid item xs={12} sm={6}>
          <LabeledSelect label="Campaña B" value={campaignB?.campaignId ?? ''} onChange={(e) => setCampaignIdB((e.target.value as string) || null)}>
            {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
          </LabeledSelect>
        </Grid>
      </Grid>

      {!campaignA || !campaignB || !metricsA || !metricsB ? (
        <EmptyState title="Sin datos para alguna de las campañas seleccionadas" />
      ) : (
        <>
          <Stack gap={1.5} mb={2}>
            {ROWS.map((row) => (
              <Grid container spacing={2} key={row.key} alignItems="center">
                <Grid item xs={4}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: 'primary.contrastTextMuted' }}>
                    {metricsA[row.key] ?? 0}{row.unit ?? ''}
                  </Typography>
                </Grid>
                <Grid item xs={4} textAlign="center">
                  <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                </Grid>
                <Grid item xs={4} textAlign="right">
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#1565C0' }}>
                    {metricsB[row.key] ?? 0}{row.unit ?? ''}
                  </Typography>
                </Grid>
              </Grid>
            ))}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={700} mb={1}>Top de {campaignA.name}</Typography>
              {campaignA.topPost ? (
                <Typography variant="caption" color="text.secondary">• {campaignA.topPost.network} ({campaignA.topPost.engagementRate}%)</Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">Sin post destacado todavía.</Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={700} mb={1}>Top de {campaignB.name}</Typography>
              {campaignB.topPost ? (
                <Typography variant="caption" color="text.secondary">• {campaignB.topPost.network} ({campaignB.topPost.engagementRate}%)</Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">Sin post destacado todavía.</Typography>
              )}
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
