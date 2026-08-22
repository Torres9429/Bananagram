// profileType es un string libre y nullable en BD (no enum) — ver modelo.txt.
// Estos son los valores canónicos que usa el frontend (inglés, minúsculas),
// decisión del equipo — ver docs/frontend-db-alignment.md §9.8. Al ser un
// const array (no un enum cerrado a nivel de tipo), el backend puede emitir
// otros valores sin romper el tipo — PROFILE_TYPES es solo para poblar los
// selects de UI.
export const PROFILE_TYPES = ['brand', 'company', 'organization', 'creator', 'personal'] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

export interface Brand {
  id: string;
  name: string;
  slug: string;
  profileType: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  ownerId: string; // siempre un Cliente — único dueño por marca (Brand.ownerId)
  categoryId?: string | null;
  ayrshareProfileKey?: string | null;
}
