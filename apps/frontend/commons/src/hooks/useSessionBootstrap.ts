'use client';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../state/auth.slice';

export function useSessionBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('mock_access_token');
    if (token) {
      dispatch(setCredentials({ accessToken: token }));
    }
  }, []);
}
