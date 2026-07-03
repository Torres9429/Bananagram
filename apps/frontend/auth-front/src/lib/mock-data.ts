// Espejo mínimo del modelo de dominio de brands-front (§A.1/§A.2 del análisis de
// dominio): cada microfront mantiene su propia copia de mocks porque no hay un
// servicio compartido. Aquí solo se necesita lo indispensable para que el
// registro pueda capturar el tipo y la info básica del Perfil que nace con el
// Usuario — no se replica el resto del modelo de brands-front (SocialAccount,
// campañas, etc.), que no aplica a auth-front.
export type ProfileType = 'brand' | 'company' | 'organization' | 'creator' | 'personal';

export const MOCK_CATEGORIES = ['Moda', 'Deportes', 'Tecnología', 'Entretenimiento', 'Gastronomía', 'Salud', 'Educación', 'Arte'];
