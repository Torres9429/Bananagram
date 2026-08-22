'use client';

import { useSelector } from 'react-redux';
import { useGetCampaignsMetricsSummaryQuery, type CampaignMetricsSummary } from '../../store/api/analytics.api';
import { selectAnalyticsFilters } from '../../store/analytics.selectors';
import { useDateRangeParams } from './useDateRangeParams';

// Único punto donde se aplican los filtros globales de Marca (profileId),
// Campaña (campaignId) y Periodo (dateRange) sobre el arreglo real de
// campañas — todo widget que antes llamaba useGetCampaignsMetricsSummaryQuery()
// directo pasa a usar esto en su lugar para quedar consciente de los 3
// filtros sin lógica propia. Antes NO pasaba el rango de fechas (auditoría
// B2): 9 widgets de campaña ignoraban en silencio el filtro "Desde/Hasta" —
// se arregla acá, en el único punto de entrada, para que los 9 queden
// corregidos a la vez sin tocar cada widget por separado.
export function useFilteredCampaigns(): CampaignMetricsSummary[] {
  const { campaigns } = useFilteredCampaignsResult();
  return campaigns;
}

export function useFilteredCampaignsResult(): { campaigns: CampaignMetricsSummary[]; isLoading: boolean } {
  const range = useDateRangeParams();
  const { data: campaigns = [], isLoading, isFetching } = useGetCampaignsMetricsSummaryQuery(range);
  const filters = useSelector(selectAnalyticsFilters);

  const filtered = campaigns.filter((campaign) => {
    if (filters.profileId && campaign.brandId !== filters.profileId) return false;
    if (filters.campaignId && campaign.campaignId !== filters.campaignId) return false;
    return true;
  });

  return { campaigns: filtered, isLoading: (isLoading || isFetching) && campaigns.length === 0 };
}
