'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { formatRoleName } from '@repo/ui/utils';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ClientSection } from '../../components/profile/ClientSection';
import { StaffProfileSection } from '../../components/profile/StaffProfileSection';
import { MOCK_AVAILABLE_CMS, MOCK_AVAILABLE_DESIGNERS, PROFILE_TYPE_LABELS, getCurrentClientProfile } from '../../lib/mock-data';
import type { ProfileType } from '../../interfaces/interface';

// En mock, el perfil del usuario activo se obtiene buscando en los arrays
// de CMs o Diseñadores disponibles, según su rol — placeholder pendiente de
// GET /users/me real (gap preexistente, ajeno a esta tarea de permisos). Un
// rol futuro sin perfil mock propio cae al mock de Diseñador por defecto:
// cosmético nada más, sin impacto de seguridad/funcionalidad real.
function findMockStaffProfile(role: string) {
  if (role === 'community_manager') {
    return MOCK_AVAILABLE_CMS.find((u) => u.id === 'u1') ?? null; // Ana García es la CM demo
  }
  return MOCK_AVAILABLE_DESIGNERS.find((u) => u.id === 'u3') ?? null; // Elías Bailón como Diseñador demo
}

// ProfilePage — Perfil único (§A.6 del análisis de dominio): una sola página,
// un Header común, y el contenido varía por sección según quién la visita.
// Antes decidía por switch(role) hardcodeado ('cliente' vs
// 'community_manager'/'disenador'/default→pantalla en blanco) — ahora decide
// por el permiso real que separa ambas identidades: quien puede
// crear/editar marcas "es dueño de marca" (ClientSection), cualquier otro
// cae en el perfil de habilidades genérico (StaffProfileSection) en vez de
// quedar en blanco. Así un rol nuevo (ej. "solo_lectura") creado desde
// /admin-front/roles funciona sin tocar este archivo.
export default function ProfilePage() {
  const user = useSelector(selectUser);
  const { can } = usePermissions();
  const hasProfileAccess = can('marcas', 'crear') || can('marcas', 'editar');
  // Solo para elegir el perfil mock/label de "no es dueño de marca" — no
  // determina si ve ClientSection o StaffProfileSection (eso ya es
  // hasProfileAccess). Con varios roles reales toma el primero.
  const role = user?.roles?.[0] ?? '';
  const mockStaffProfile = !hasProfileAccess ? findMockStaffProfile(role) : null;

  // Vive en ProfilePage (no dentro de StaffProfileSection) porque el Header
  // común también lo necesita para reflejar el nombre mientras se edita —
  // mismo comportamiento en vivo que tenía la pantalla antes de separar
  // Header/Sección.
  const [name, setName] = useState(mockStaffProfile?.name ?? user?.email ?? '');

  // Mientras la sesión de Redux aún no hidrata (useSessionBootstrap corre en
  // un useEffect, tras el primer render), `user` es null un instante — sin
  // este guard, `can()` siempre da false y el Header se alcanzaba a pintar
  // con headerName vacío ("Sin nombre") antes de la re-render correcta. Va
  // DESPUÉS de todos los hooks (Rules of Hooks) — solo bloquea el render.
  if (!user) return null;

  const clientProfile = getCurrentClientProfile(user?.email);
  const headerName = hasProfileAccess ? clientProfile.name : name;
  const headerSubtitle = hasProfileAccess
    ? (PROFILE_TYPE_LABELS[clientProfile.profileType as ProfileType] ?? clientProfile.profileType ?? '')
    : (role ? formatRoleName(role) : '');

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      {!hasProfileAccess && (
        <>
          <Typography variant="h5" fontWeight={700} mb={1}>Mi perfil</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Mantén tu perfil actualizado para aparecer en las búsquedas del sistema.
          </Typography>
          <ProfileHeader name={headerName} subtitle={headerSubtitle} />
        </>
      )}

      {/* Dueño de marca: ClientSection renderiza su propio hero (avatar, tipo,
          categoría, score, acciones) — más rico que el ProfileHeader genérico
          compartido con el resto de roles, así que no se duplica aquí. */}
      {hasProfileAccess ? (
        <ClientSection />
      ) : (
        <StaffProfileSection mockProfile={mockStaffProfile} name={name} onNameChange={setName} />
      )}
    </Box>
  );
}
