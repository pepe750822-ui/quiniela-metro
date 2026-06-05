import type { Metadata } from 'next';
import { Bebas_Neue, Rajdhani } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import InstallBanner from '@/components/InstallBanner';
import Providers from '@/components/Providers';
import { Toaster } from 'sonner';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
});

const rajdhani = Rajdhani({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-rajdhani',
});

export const metadata: Metadata = {
  title: 'Quiniela Metro — Mundial 2026',
  description: 'Quiniela del Mundial 2026 para el STC Metro CDMX',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ea580c" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon-32.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${bebasNeue.variable} ${rajdhani.variable} min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))]`}
        style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani), sans-serif' }}
      >
        <Providers>
          <InstallBanner />
          {children}
          <Navbar />
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
