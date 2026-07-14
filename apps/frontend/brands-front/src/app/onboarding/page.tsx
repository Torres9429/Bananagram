import { redirect } from 'next/navigation';

// LEGACY/DEPRECATED (dominio v3): el registro ya crea el Perfil directamente
// (§A.2 del análisis de dominio) — /onboarding dejó de ser un flujo obligatorio
// y ningún Sidebar ni pantalla enlaza aquí. Se conserva como redirect en vez de
// eliminar la ruta, por si queda algún enlace externo apuntando a esta URL.
// OnboardingWizard y sus steps ya se eliminaron (limpieza técnica) — no
// tenían ningún import real, solo esta ruta seguía redirigiendo.
export default function OnboardingPage() {
  redirect('/profile');
}
