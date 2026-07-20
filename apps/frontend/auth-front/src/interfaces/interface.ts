import type { TextFieldProps } from '@mui/material/TextField';
import type { store } from '../store';

// ProfileType ahora se importa de @repo/ui/types (fuente canónica, ver
// PROFILE_TYPES) en vez de mantener una copia local con los mismos 5 valores
// — ver docs/frontend-db-alignment.md §9.8. Re-exportado aquí para no romper
// los imports existentes desde este archivo.
export type { ProfileType } from '@repo/ui/types';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'label'> {
  label?: string;
}

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
