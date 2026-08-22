import { redirect } from 'next/navigation';

// LEGACY/DEPRECATED (dominio v3): /my-brand ya no es un flujo funcional —
// ningún Sidebar enlaza aquí, todos apuntan directo a /profile. Se conserva
// como redirect en vez de eliminar la ruta, por si queda algún enlace externo
// o marcador guardado apuntando a esta URL. Candidata a eliminar por completo
// en una fase futura de limpieza de dominio v3 (junto con /brands).
export default function Page() {
  redirect('/profile');
}
