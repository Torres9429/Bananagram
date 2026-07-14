// Barrel raíz — se conserva por compatibilidad (81 archivos ya migrados a
// subpaths, pero el import raíz sigue siendo válido para lo que no tenga
// subpath propio, y como red de seguridad). Reexporta desde los 5 barrels
// en vez de listar cada símbolo dos veces.
export * from './ui';
export * from './theme';
export * from './state';
export * from './types';
export * from './utils';

// Mocks de desarrollo — no encajan en ninguno de los 5 subpaths (no son UI,
// theme, estado real, tipos de dominio ni utilidades genéricas). Se quedan
// en el barrel raíz hasta que se decida si ameritan su propio subpath.
export * from './mocks/mock-tokens';
export * from './mocks/mock-users';
export * from './mocks/build-user-token';
