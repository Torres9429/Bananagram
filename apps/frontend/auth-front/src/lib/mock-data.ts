// Catálogo Category {id, name} — antes string[], ahora objetos con id real
// para que el select use categoryId como value (ver RegisterForm.tsx).
export const MOCK_CATEGORIES: { id: string; name: string }[] = [
  { id: 'cat1', name: 'Moda' },
  { id: 'cat2', name: 'Deportes' },
  { id: 'cat3', name: 'Tecnología' },
  { id: 'cat4', name: 'Entretenimiento' },
  { id: 'cat5', name: 'Gastronomía' },
  { id: 'cat6', name: 'Salud' },
  { id: 'cat7', name: 'Educación' },
  { id: 'cat8', name: 'Arte' },
];

// Catálogo de especialidades — exclusivo de community_manager/disenador (no
// aplica a Cliente ni a marcas), mismo shape que MOCK_CATEGORIES de arriba.
// Ver UserProfile.specialties (core-service) / CompleteProfileDto (auth-service).
export const MOCK_SPECIALTIES: { id: string; name: string }[] = [
  { id: 'sp1', name: 'Diseño gráfico' },
  { id: 'sp2', name: 'Copywriting' },
  { id: 'sp3', name: 'Video y edición' },
  { id: 'sp4', name: 'Paid media' },
  { id: 'sp5', name: 'Fotografía' },
  { id: 'sp6', name: 'Community management' },
];

// Mock: el registro usa la cuenta demo correspondiente al rol elegido.
// Backend: POST /auth/register { name, email, password, roleName, categoryIds?, specialtyIds? } → JWT real + Perfil creado.
export const MOCK_CLIENT_EMAIL = 'cliente@bananagram.mx';
export const MOCK_CM_EMAIL = 'cm@bananagram.mx';
export const MOCK_DESIGNER_EMAIL = 'disenador@bananagram.mx';

export const ROLE_LABEL: Record<string, string> = {
  cliente: 'Cliente',
  community_manager: 'Community Manager',
  disenador: 'Diseñador',
};
