// ── Dashboard Administrador ───────────────────────────────────────
export const MOCK_ADMIN_DASHBOARD = {
  users: {
    total: 6,
    active: 5,
    pendingActivation: 1,
    byRole: [
      { role: 'Community Manager', count: 2 },
      { role: 'Diseñador', count: 2 },
      { role: 'Cliente', count: 1 },
      { role: 'Admin', count: 1 },
    ],
  },
  catalogs: {
    socialNetworks: 5,
    categories: 4,
    specialties: 3,
  },
  recentAudit: [
    { id: 'a1', actor: 'Rocío Rodríguez', action: 'Rechazó publicación', date: '25 jun, 16:45' },
    { id: 'a2', actor: 'Ana García', action: 'Envió a revisión', date: '25 jun, 14:30' },
    { id: 'a3', actor: 'Marco Sosa', action: 'Creó usuario Diego Ferman', date: '20 jun, 09:30' },
  ],
};
