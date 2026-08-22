import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from '@repo/ui/state';
import { getPostAuthDestination } from '@repo/ui/utils';
import { LandingTemplate } from '../components/landing/templates/LandingTemplate';

const SESSION_COOKIE = 'bananagram_token';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = token ? decodeJwt(token) : null;

  if (payload) {
    redirect(getPostAuthDestination(payload.roles ?? []));
  }

  return <LandingTemplate />;
}
