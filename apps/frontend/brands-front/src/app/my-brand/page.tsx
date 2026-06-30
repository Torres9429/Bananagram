import { redirect } from 'next/navigation';
import { MOCK_BRANDS } from '../../lib/mock-data';

// La cookie bananagram_token viaja con la petición — no se necesita
// reenviar ?mock_user ni leer searchParams.
export default function Page() {
  redirect(`/brands/${MOCK_BRANDS[0].id}`);
}
