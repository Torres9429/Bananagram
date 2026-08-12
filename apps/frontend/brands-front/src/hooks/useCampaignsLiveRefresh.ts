'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { campaignsApi } from '../store/api/campaigns.api';
import type { AppDispatch } from '../interfaces/interface';

// Escucha el evento que dispara useNotificationStream (@repo/ui/ui) por cada
// notificación push (SSE) — si es de campañas, invalida el tag 'Campaign' y
// cualquier listCampaigns/getCampaign activo en pantalla se refresca solo,
// sin esperar ningún intervalo (Fase L, pedido explícito del usuario).
export function useCampaignsLiveRefresh() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    function handleNotification(event: Event) {
      const detail = (event as CustomEvent).detail as { type?: string } | undefined;
      if (detail?.type?.startsWith('campaign_')) {
        dispatch(campaignsApi.util.invalidateTags(['Campaign']));
      }
    }

    window.addEventListener('bananagram:notification', handleNotification);
    return () => window.removeEventListener('bananagram:notification', handleNotification);
  }, [dispatch]);
}
