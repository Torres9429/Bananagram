'use client';

import { useSelector } from 'react-redux';
import { useGetCampaignsMetricsSummaryQuery, type CampaignMetricsSummary } from '../../store/api/analytics.api';
import { selectAnalyticsFilters } from '../../store/analytics.selectors';

// Único punto donde se aplican los filtros globales de Marca (profileId) y
// Campaña (campaignId) sobre el arreglo real de campañas — todo widget que
// antes llamaba useGetCampaignsMetricsSummaryQuery() directo pasa a usar
// esto en su lugar para quedar consciente de ambos filtros sin lógica propia.
export function useFilteredCampaigns(): CampaignMetricsSummary[] {
  const { data: campaigns = [] } = useGetCampaignsMetricsSummaryQuery();
  const filters = useSelector(selectAnalyticsFilters);

  return campaigns.filter((campaign) => {
    if (filters.profileId && campaign.brandId !== filters.profileId) return false;
    if (filters.campaignId && campaign.campaignId !== filters.campaignId) return false;
    return true;
  });
}
