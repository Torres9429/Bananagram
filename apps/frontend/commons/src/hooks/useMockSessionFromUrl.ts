'use client';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { setCredentials } from '../state/auth.slice';
import { findUserByEmail } from '../mocks/mock-users';
import { buildTokenFromUser } from '../mocks/build-user-token';

const STORAGE_KEY = 'mock_access_token';

export function useMockSessionFromUrl() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const emailFromUrl = searchParams.get('mock_user');

    if (emailFromUrl) {
      const user = findUserByEmail(emailFromUrl);
      if (user) {
        const token = buildTokenFromUser(user);
        dispatch(setCredentials({ accessToken: token }));
        localStorage.setItem(STORAGE_KEY, token);
      }

      // Limpia el query param de la URL sin recargar la página, incluso si el
      // correo no existe, para evitar loops con parámetros viejos.
      const params = new URLSearchParams(searchParams.toString());
      params.delete('mock_user');
      const cleanUrl = params.toString() ? `${pathname}?${params}` : pathname;
      router.replace(cleanUrl);
    }

    // Intenta restaurar sesión desde localStorage propio de esta zona.
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      dispatch(setCredentials({ accessToken: token }));
    }
  }, []);
}
