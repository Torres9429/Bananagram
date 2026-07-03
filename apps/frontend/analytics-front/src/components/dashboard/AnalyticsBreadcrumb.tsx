'use client';

import { useDispatch, useSelector } from 'react-redux';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { selectCampaign, selectPost } from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters, selectSelectedCampaignLabel, selectSelectedNetwork, selectSelectedPostLabel } from '../../store/analytics.selectors';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';

/**
 * Breadcrumb del drill-down dentro de la pestaña activa (§B.4 del rediseño de
 * dominio) — ej. "Instagram › Campaña Verano › Publicación 25". No repite cuál
 * pestaña está activa (ya lo indica la barra de Tabs) — solo aparece cuando hay
 * campaña y/o publicación seleccionada. Cada segmento limpia filtros existentes
 * (selectCampaign/selectPost, ya usados en el resto del dashboard) — nunca navega
 * ni cambia de pestaña.
 */
export function AnalyticsBreadcrumb() {
  const dispatch = useDispatch();
  const filters = useSelector(selectAnalyticsFilters);
  const selectedNetwork = useSelector(selectSelectedNetwork);
  const campaignLabel = useSelector(selectSelectedCampaignLabel);
  const postLabel = useSelector(selectSelectedPostLabel);

  if (!filters.campaignId && !filters.postId) return null;

  const networkLabel = selectedNetwork ? NETWORK_DISPLAY[selectedNetwork].label : 'General';

  return (
    <Breadcrumbs separator="›" sx={{ mb: 2, fontSize: 14 }}>
      <Link
        component="button"
        underline="hover"
        onClick={() => dispatch(selectCampaign(null))}
        sx={{ fontSize: 14, fontWeight: filters.campaignId ? 400 : 600, color: filters.campaignId ? 'text.secondary' : 'text.primary' }}
      >
        {networkLabel}
      </Link>
      {filters.campaignId && (
        <Link
          component="button"
          underline="hover"
          onClick={() => dispatch(selectPost(null))}
          sx={{ fontSize: 14, fontWeight: filters.postId ? 400 : 600, color: filters.postId ? 'text.secondary' : 'text.primary' }}
        >
          {campaignLabel}
        </Link>
      )}
      {filters.postId && (
        <Typography sx={{ fontSize: 14, fontWeight: 600 }} color="text.primary">{postLabel}</Typography>
      )}
    </Breadcrumbs>
  );
}
