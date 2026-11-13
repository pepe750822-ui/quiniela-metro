import type { Metadata } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import InstallBanner from '@/components/InstallBanner';
import Providers from '@/components/Providers';
import UpdateLastSeen from '@/components/UpdateLastSeen';
import { Toaster } from 'sonner';

const barlow = Barlow_Condensed({
  weight: ['600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-barlow',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Quiniela Metro — Mundial 2026',
  description: 'Quiniela del Mundial 2026 para el STC Metro CDMX',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${barlow.variable} ${inter.variable}`}>
      <head>
        <meta name="theme-color" content="#C8006A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon-32.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className="bg-base min-h-screen pb-[calc(72px+env(safe-area-inset-bottom))]"
        style={{ color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}
      >
        <Providers>
          <InstallBanner />
          <UpdateLastSeen />
          {children}
          <Navbar />
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
