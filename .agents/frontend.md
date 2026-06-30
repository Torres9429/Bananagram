# Convenciones Next.js

- web-shell maneja sesión, menú dinámico y enrutamiento global
- Cada microfrontend es independiente en apps/frontend/*-front/
- usePermissions() es la fuente de verdad para mostrar/ocultar elementos de UI
- Rutas protegidas usan middleware.ts de Next.js
- RTK Query para TODAS las llamadas a la API
- MUI como librería de componentes (obligatorio hackathon)
- Menús dinámicos: se construyen a partir de GET /me/permissions
