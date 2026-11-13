'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TEMPORADA_ACTIVA } from '@/lib/utils';

/* Pictogramas de estación: mosaico de color (como las líneas del Metro) con dibujo blanco relleno. Dibujos originales. */
const pictos: Record<string, { color: string; d: React.ReactNode }> = {
  ranking: { color: '#C8006A', d: (<><rect x="9" y="6" width="6" height="14" rx="1" /><rect x="2.5" y="10" width="6" height="10" rx="1" /><rect x="15.5" y="13" width="6" height="7" rx="1" /></>) },
  quiniela: { color: '#EE7A32', d: (<><rect x="2.5" y="3.5" width="2.4" height="17" rx=".6" fill="#F7EFE2" /><g fill="none" stroke="#5B2A12" strokeWidth="2"><rect x="7.5" y="5.5" width="13" height="13" rx="3.2" /><circle cx="13.6" cy="11.4" r="2.9" /><path d="m15.6 13.5 2.4 2.4" strokeLinecap="round" /></g></>) },
  tabla: { color: '#A08C00', d: (<path fillRule="evenodd" d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5ZM5 9.5h3.5V6H5Zm5.5 0H19V6h-8.5ZM5 14.2h3.5v-3H5Zm5.5 0H19v-3h-8.5ZM5 18h3.5v-2.2H5Zm5.5 0H19v-2.2h-8.5Z" />) },
  calendario: { color: '#0098B8', d: (<path fillRule="evenodd" d="M7 2.5h2V5h6V2.5h2V5h2.5A1.5 1.5 0 0 1 21 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-12A1.5 1.5 0 0 1 4.5 5H7ZM5 10v8h14v-8Zm2 2h3v3H7Z" />) },
  ligamx: { color: '#00904A', d: (<path fillRule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm0 5.2-3.6 2.6 1.4 4.2h4.4l1.4-4.2Zm-6.7.6A7.5 7.5 0 0 0 4.6 12l2-1.4-.4-2.4Zm13.4 0-.9-.1-.4 2.4 2 1.4a7.5 7.5 0 0 0-.7-3.7ZM8.7 18.6a7.5 7.5 0 0 0 6.6 0l.6-2.3-1.6-1.4H9.7l-1.6 1.4Z" />) },
  grupos: { color: '#00904A', d: (<path fillRule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19ZM4.6 11h3.9c.1-2.4.6-4.6 1.4-6.1A7.5 7.5 0 0 0 4.6 11Zm5.9 0h3c-.2-3.3-1.1-5.5-1.5-6.3-.4.8-1.3 3-1.5 6.3Zm5 0h3.9a7.5 7.5 0 0 0-5.3-6.1c.8 1.5 1.3 3.7 1.4 6.1ZM4.6 13a7.5 7.5 0 0 0 5.3 6.1c-.8-1.5-1.3-3.7-1.4-6.1Zm5.9 0c.2 3.3 1.1 5.5 1.5 6.3.4-.8 1.3-3 1.5-6.3Zm5 0c-.1 2.4-.6 4.6-1.4 6.1a7.5 7.5 0 0 0 5.3-6.1Z" />) },
  perfil: { color: '#7A4A26', d: (<><circle cx="12" cy="7.5" r="4" /><path d="M4 20.5c.6-4.6 3.8-7 8-7s7.4 2.4 8 7Z" /></>) },
};

export default function Navbar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, [pathname]);

  const links = [
    { href: loggedIn ? '/dashboard' : '/', label: 'Ranking', icon: 'ranking', match: ['/', '/dashboard'] },
    { href: '/predicciones', label: 'Quiniela', icon: 'quiniela', match: ['/predicciones'] },
    { href: '/tabla', label: 'Tabla', icon: 'tabla', match: ['/tabla'] },
    { href: '/calendario', label: 'Calendario', icon: 'calendario', match: ['/calendario'] },
    TEMPORADA_ACTIVA === 'ligamx2026'
      ? { href: '/posiciones', label: 'Liga MX', icon: 'ligamx', match: ['/posiciones', '/posiciones-lmx'] }
      : { href: '/grupos', label: 'Grupos', icon: 'grupos', match: ['/grupos', '/bracket'] },
    { href: '/perfil', label: 'Perfil', icon: 'perfil', match: ['/perfil', '/admin', '/instrucciones'] },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ background: 'var(--nav-bg)', borderColor: 'var(--ln)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      <div className="flex max-w-xl mx-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {links.map(({ href, label, icon, match }) => {
          const active = match.includes(pathname);
          return (
            <Link key={label} href={href}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-2 min-h-[60px]"
            >
              <span
                className="flex items-center justify-center rounded-[9px] transition-transform duration-200"
                style={{
                  width: 32, height: 32, background: pictos[icon].color, color: '#fff',
                  boxShadow: active ? '0 0 0 2px var(--sf), 0 0 0 4px var(--ink)' : 'none',
                  transform: active ? 'scale(1.06)' : 'none',
                  opacity: active ? 1 : 0.82,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  {pictos[icon].d}
                </svg>
              </span>
              <span className="text-[12px] leading-none"
                style={{ color: active ? 'var(--ink)' : 'var(--mut)', fontWeight: active ? 700 : 600 }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
