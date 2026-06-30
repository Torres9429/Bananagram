'use client';
import { useSelector } from 'react-redux';
import { selectUser } from '../state/auth.slice';
export function useSession() { return useSelector(selectUser); }
