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

// Mock: el registro usa la cuenta demo de Cliente.
// Backend: POST /auth/register { name, email, password, type, profileName, category } → JWT real + Perfil creado.
export const MOCK_CLIENT_EMAIL = 'cliente@bananagram.mx';

export const ROLE_LABEL: Record<string, string> = {
  community_manager: 'Community Manager',
  disenador: 'Diseñador',
};
