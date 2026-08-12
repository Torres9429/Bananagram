'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { selectUser } from '../state/auth.slice';
import { notificationsApi } from '../api/notifications.api';
import { getCookieToken } from '../session/cookieSession';
import { API_BASE_URL } from '../config/zone-urls';
import type { Notification } from '../types/notification.types';

const MAX_BACKOFF_MS = 30000;

// No usa EventSource nativo: no soporta headers custom, y el token va en
// Authorization igual que el resto de la app (nunca en la URL). Se lee con
// fetch() + response.body.getReader(), parseando frames SSE a mano
// (`data: {...}\n\n`); los comentarios (`: ping`, `: connected`) se ignoran.
export function useNotificationStream() {
  // commons no conoce el tipo de store de cada zona (cada una tiene el suyo)
  // — se tipa como thunk-capable genérico, igual que recomienda RTK Query
  // para código de librería que despacha sus propios thunks (util.updateQueryData).
  const dispatch = useDispatch() as ThunkDispatch<unknown, unknown, UnknownAction>;
  const user = useSelector(selectUser);
  const userId = user?.id ?? null;

  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    stoppedRef.current = false;
    let controller: AbortController | null = null;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function handleFrame(rawEvent: string) {
      const line = rawEvent.split('\n').find((l) => l.startsWith('data: '));
      if (!line) return;

      let notification: Notification;
      try {
        notification = JSON.parse(line.slice('data: '.length));
      } catch {
        return;
      }

      dispatch(
        notificationsApi.util.updateQueryData('getMyNotifications', undefined, (draft) => {
          draft.unshift(notification);
        }),
      );
      window.dispatchEvent(new CustomEvent('bananagram:notification', { detail: notification }));
    }

    async function connect() {
      const token = getCookieToken();
      if (!token) return;

      controller = new AbortController();
      try {
        const res = await fetch(`${API_BASE_URL}/me/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`stream respondió ${res.status}`);

        retryDelay = 1000;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stoppedRef.current) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';
          for (const frame of frames) handleFrame(frame);
        }
      } catch {
        // conexión cortada (red, reinicio del gateway/auth-service, token
        // expirado) — se reintenta abajo con backoff, salvo que se haya
        // desmontado el hook o cambiado de usuario mientras tanto.
      }

      if (!stoppedRef.current) {
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, MAX_BACKOFF_MS);
      }
    }

    connect();

    return () => {
      stoppedRef.current = true;
      controller?.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [userId, dispatch]);
}
