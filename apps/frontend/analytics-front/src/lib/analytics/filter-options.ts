// Opciones de solo-etiqueta (NO datos de métrica) para los filtros de equipo/categoría.
// SocialMetricFact no tiene todavía cmName/designerName/category/specialty — por eso
// AnalyticsFilterBar renderiza estos controles deshabilitados. Los nombres reutilizan
// los mismos usados en brands-front (MOCK_AVAILABLE_CMS/MOCK_AVAILABLE_DESIGNERS/
// MOCK_CATEGORIES/MOCK_SPECIALTIES) solo para que la UI se sienta consistente con el
// resto del sistema — no se importan entre microfrontends.

export const MOCK_CM_OPTIONS = ['Ana García', 'Diego Ferman', 'Valeria Cruz'];

export const MOCK_DESIGNER_OPTIONS = ['Alexa Delgado', 'Elías Bailón', 'Iván Soto', 'Carla Núñez'];

export const MOCK_CATEGORY_OPTIONS = ['Moda', 'Deportes', 'Entretenimiento', 'Tecnología', 'Gastronomía'];

export const MOCK_SPECIALTY_OPTIONS = ['Diseño gráfico', 'Copywriting', 'Video y edición', 'Fotografía', 'Paid media'];
