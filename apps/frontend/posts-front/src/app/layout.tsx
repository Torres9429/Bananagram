import './globals.css';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { Providers } from './providers';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = { title: 'Posts — Bananagram' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={poppins.variable}>
      <body style={{ margin: 0, backgroundColor: '#F7F7F7', fontFamily: 'var(--font-poppins), Arial, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
