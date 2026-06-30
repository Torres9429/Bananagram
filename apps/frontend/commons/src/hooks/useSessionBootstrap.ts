'use client';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, logout } from '../state/auth.slice';
import { getCookieToken } from '../session/cookieSession';

// Único inicializador de sesión para todos los microfrontends.
// Lee el token de la cookie compartida (accesible desde cualquier puerto de localhost).
// No usa URL params, no usa localStorage, no usa useSearchParams.
export function useSessionBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = getCookieToken();
    if (token) {
      dispatch(setCredentials({ accessToken: token }));
    } else {
      dispatch(logout());
    }
  }, []);
}
