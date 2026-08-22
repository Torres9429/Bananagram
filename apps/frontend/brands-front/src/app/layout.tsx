import './globals.css';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { Providers } from './providers';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = { title: 'Mi perfil — Bananagram', icons: { icon: '/LogoMonkey.png' } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={poppins.variable}>
      {/* suppressHydrationWarning: algunas extensiones del navegador (ej.
          ColorZilla) inyectan atributos en <body> (cz-shortcut-listen) antes
          de que React hidrate, disparando un falso positivo de hydration
          mismatch. Solo silencia el warning de atributos de este tag, no de
          sus hijos. */}
      <body style={{ margin: 0 }} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
