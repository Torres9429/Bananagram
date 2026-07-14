import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LandingTemplate } from '../components/landing/templates/LandingTemplate';

const SESSION_COOKIE = 'bananagram_token';

export default async function Home() {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(SESSION_COOKIE)?.value);

  if (hasSession) {
    redirect('/dashboard');
  }

  return <LandingTemplate />;
}
