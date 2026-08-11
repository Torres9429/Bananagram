'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { selectUser } from '@repo/ui/state';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ClientSection } from '../../components/profile/ClientSection';
import { StaffProfileSection } from '../../components/profile/StaffProfileSection';
import { MOCK_AVAILABLE_CMS, MOCK_AVAILABLE_DESIGNERS, PROFILE_TYPE_LABELS, getCurrentClientProfile } from '../../lib/mock-data';
import type { ProfileType } from '../../interfaces/interface';

// En mock, el perfil del usuario activo se obtiene buscando en los arrays
// de CMs o Diseñadores disponibles, según su rol.
// En producción: GET /users/me → datos propios del backend.
function findMockStaffProfile(role: string) {
  if (role === 'community_manager') {
    return MOCK_AVAILABLE_CMS.find((u) => u.id === 'u1') ?? null; // Ana García es la CM demo
  }
  return MOCK_AVAILABLE_DESIGNERS.find((u) => u.id === 'u3') ?? null; // Elías Bailón como Diseñador demo
}

const STAFF_ROLE_LABELS: Record<string, string> = {
  community_manager: 'Community Manager',
  disenador: 'Diseñador',
};

// ProfilePage — Perfil único (§A.6 del análisis de dominio): una sola página,
// un Header común, y el contenido varía por sección según quién la visita.
// "type" en el switch no es el ProfileType del Cliente (brand/company/
// organization/creator/personal — esos 4 primeros comparten siempre la misma
// ClientSection, nunca se bifurcan entre sí) sino el rol de quien visita la
// ruta, que es lo único que distingue "perfil de negocio" (Cliente) de
// "perfil de habilidades" (CM/Diseñador).
export default function ProfilePage() {
  const user = useSelector(selectUser);
  // Esta página asume un solo rol "de negocio" activo por sesión (mismo
  // supuesto que ya tenía antes de multi-rol) — con varios roles reales toma
  // el primero. No es parte del alcance de esta fase (login/catálogos/
  // campañas), solo se ajusta el tipo para que siga compilando.
  const role = user?.roles?.[0] ?? '';
  const isStaff = role === 'community_manager' || role === 'disenador';
  const mockStaffProfile = isStaff ? findMockStaffProfile(role) : null;

  // Vive en ProfilePage (no dentro de StaffProfileSection) porque el Header
  // común también lo necesita para reflejar el nombre mientras se edita —
  // mismo comportamiento en vivo que tenía la pantalla antes de separar
  // Header/Sección.
  const [name, setName] = useState(mockStaffProfile?.name ?? user?.email ?? '');

  // Mientras la sesión de Redux aún no hidrata (useSessionBootstrap corre en
  // un useEffect, tras el primer render), `user` es null un instante — sin
  // este guard, `role` caía a '' y el Header se alcanzaba a pintar con
  // headerName vacío ("Sin nombre") antes de la re-render correcta. Va
  // DESPUÉS de todos los hooks (Rules of Hooks) — solo bloquea el render.
  if (!user) return null;

  const clientProfile = getCurrentClientProfile(user?.email);
  const headerName = role === 'cliente' ? clientProfile.name : name;
  const headerSubtitle = role === 'cliente'
    ? (PROFILE_TYPE_LABELS[clientProfile.profileType as ProfileType] ?? clientProfile.profileType ?? '')
    : (STAFF_ROLE_LABELS[role] ?? '');

  function renderSection() {
    switch (role) {
      case 'cliente':
        return <ClientSection />;
      case 'community_manager':
      case 'disenador':
        return <StaffProfileSection mockProfile={mockStaffProfile} name={name} onNameChange={setName} />;
      default:
        return null;
    }
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      {role !== 'cliente' && (
        <>
          <Typography variant="h5" fontWeight={700} mb={1}>Mi perfil</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Mantén tu perfil actualizado para aparecer en las búsquedas del sistema.
          </Typography>
          <ProfileHeader name={headerName} subtitle={headerSubtitle} />
        </>
      )}

      {/* Cliente: ClientSection renderiza su propio hero (avatar, tipo, categoría,
          score, acciones) — más rico que el ProfileHeader genérico compartido con
          CM/Diseñador, así que no se duplica aquí. */}
      {renderSection()}
    </Box>
  );
}
