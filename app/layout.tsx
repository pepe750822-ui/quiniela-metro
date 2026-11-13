import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import InstallBanner from '@/components/InstallBanner';
import Providers from '@/components/Providers';
import UpdateLastSeen from '@/components/UpdateLastSeen';
import { Toaster } from 'sonner';

// Señalética: grotesca condensada para títulos y números, sans neutra para texto
const barlow = Barlow_Condensed({
  weight: ['500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Quiniela Metro',
  description: 'Quiniela de Liga MX y Fecha FIFA entre compañeros del Metro CDMX',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#C8006A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon-32.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${barlow.variable} ${inter.variable} bg-base min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))]`}
        style={{ color: 'var(--text-primary)' }}
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
