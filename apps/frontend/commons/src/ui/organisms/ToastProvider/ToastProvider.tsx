'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import type { AlertColor } from '@mui/material/Alert';

interface ToastItem {
  id: number;
  message: string;
  severity: AlertColor;
}

interface ToastContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

// Cola simple (un toast visible a la vez, el resto espera su turno) — no
// existía ningún sistema compartido de feedback de éxito/error/warning
// antes de esto, solo un Snackbar puntual en posts-front (mock) y Alerts
// inline que solo cubrían error, nunca éxito.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, severity: AlertColor) => {
    setQueue((prev) => [...prev, { id: nextId++, message, severity }]);
  }, []);

  const current = queue[0];

  function handleClose() {
    setQueue((prev) => prev.slice(1));
  }

  return (
    <ToastContext.Provider
      value={{
        showSuccess: (message) => push(message, 'success'),
        showError: (message) => push(message, 'error'),
        showWarning: (message) => push(message, 'warning'),
        showInfo: (message) => push(message, 'info'),
      }}
    >
      {children}
      <Snackbar
        open={!!current}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        // key distinto por toast: sin esto, Snackbar reutiliza el mismo
        // nodo DOM entre mensajes consecutivos y el auto-hide del segundo
        // no vuelve a arrancar bien.
        key={current?.id}
      >
        {current ? (
          <Alert onClose={handleClose} severity={current.severity} variant="filled" sx={{ width: '100%' }}>
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() requiere <ToastProvider> montado más arriba en el árbol');
  return ctx;
}
