'use client';

import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import { EmptyState, LabeledSelect, ChartTitle } from '@repo/ui/ui';
import { scopedMetrics } from '../../lib/analytics/real-metrics';
import { useSelectedNetwork } from './useSelectedNetwork';
import { useFilteredCampaigns } from './useFilteredCampaigns';

const ROWS: { key: 'reach' | 'engagementRate' | 'posts' | 'interactions'; label: string; unit?: string }[] = [
  { key: 'reach', label: 'Alcance' },
  { key: 'engagementRate', label: 'Engagement', unit: '%' },
  { key: 'posts', label: 'Publicaciones' },
  { key: 'interactions', label: 'Interacciones' },
];

// engagementRate es el único campo de ScopedMetrics que puede ser null (sin
// alcance conocido) — el resto siempre es number. `?? 0` lo colapsaría a
// "0% de engagement", indistinguible de un 0 real (bug real encontrado en
// auditoría, no fabricar datos).
function formatRow(value: number | null, unit?: string): string {
  return value === null ? '—' : `${value}${unit ?? ''}`;
}

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
      <ChartTitle
        title="Comparación entre campañas"
        description="Compara alcance, engagement, publicaciones e interacciones entre 2 campañas."
        info="'—' significa que no hay dato de alcance disponible para esa campaña/red (no es un 0 real). El Score Digital no se compara aquí porque es a nivel de marca, no de campaña."
      />

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
            {/* Bug real (2026-08-20): xs={4} apretaba value/label/value en 3
                columnas de ~30% en celular — números grandes (alcance,
                interacciones de 6-7 dígitos) se envolvían en varias líneas
                de forma despareja entre columna A y B. xs={12} apila las 3
                en filas propias por debajo de 600px (mismo patrón A/label/B,
                solo vertical); sm={4} mantiene las 3 columnas de siempre a
                partir de tablet. */}
            {ROWS.map((row) => (
              <Grid container spacing={{ xs: 0.5, sm: 2 }} key={row.key} alignItems="center">
                <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: 'primary.contrastTextMuted' }}>
                    {formatRow(metricsA[row.key], row.unit)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                </Grid>
                <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#1565C0' }}>
                    {formatRow(metricsB[row.key], row.unit)}
                  </Typography>
                </Grid>
              </Grid>
            ))}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={700} mb={1}>Top de {campaignA.name}</Typography>
              {campaignA.topPost ? (
                <Typography variant="caption" color="text.secondary">• {campaignA.topPost.contentSnippet || 'Sin contenido'} — {campaignA.topPost.network} ({campaignA.topPost.engagementRate}%)</Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">Sin post destacado todavía.</Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight={700} mb={1}>Top de {campaignB.name}</Typography>
              {campaignB.topPost ? (
                <Typography variant="caption" color="text.secondary">• {campaignB.topPost.contentSnippet || 'Sin contenido'} — {campaignB.topPost.network} ({campaignB.topPost.engagementRate}%)</Typography>
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
