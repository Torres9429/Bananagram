'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { usePermissions } from '@repo/ui/ui';
import { selectUser, useGetMyProfileQuery } from '@repo/ui/state';
import { ClientSection } from '../../components/profile/ClientSection';
import { StaffProfileSection } from '../../components/profile/StaffProfileSection';

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
  // GET me/profile real (antes: perfil mock fijo — Ana García o Elías
  // Bailón, sin importar quién estuviera logueado). null si el usuario
  // nunca completó su perfil (dado de alta por el Admin) — StaffProfileSection
  // arranca en blanco en ese caso, no es un error.
  const { data: staffProfile } = useGetMyProfileQuery(undefined, { skip: hasProfileAccess });

  const [name, setName] = useState(user?.email ?? '');
  useEffect(() => {
    if (staffProfile?.name) setName(staffProfile.name);
  }, [staffProfile]);

  // Mientras la sesión de Redux aún no hidrata (useSessionBootstrap corre en
  // un useEffect, tras el primer render), `user` es null un instante — sin
  // este guard, `can()` siempre da false. Va DESPUÉS de todos los hooks
  // (Rules of Hooks) — solo bloquea el render.
  if (!user) return null;

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      {!hasProfileAccess && (
        <>
          <Typography variant="h5" fontWeight={700} mb={1}>Mi perfil</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Mantén tu perfil actualizado para aparecer en las búsquedas del sistema.
          </Typography>
        </>
      )}

      {/* Dueño de marca: ClientSection renderiza su propio hero (avatar, tipo,
          categoría, score, acciones). CM/Diseñador: StaffProfileSection ya
          trae su propia tarjeta de identidad (foto/nombre/estado) — el viejo
          <ProfileHeader> genérico que vivía aparte se quitó, quedaba
          redundante con eso. */}
      {hasProfileAccess ? (
        <ClientSection />
      ) : (
        <StaffProfileSection profile={staffProfile ?? null} name={name} onNameChange={setName} />
      )}
    </Box>
  );
}
