export const MOCK_CATEGORIES = ['Moda', 'Deportes', 'Tecnología', 'Entretenimiento', 'Gastronomía', 'Salud', 'Educación', 'Arte'];

// Mock: el registro usa la cuenta demo de Cliente.
// Backend: POST /auth/register { name, email, password, type, profileName, category } → JWT real + Perfil creado.
export const MOCK_CLIENT_EMAIL = 'cliente@bananagram.mx';

export const ROLE_LABEL: Record<string, string> = {
  community_manager: 'Community Manager',
  disenador: 'Diseñador',
};
