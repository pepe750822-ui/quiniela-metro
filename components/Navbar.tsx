'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TEMPORADA_ACTIVA } from '@/lib/utils';

/* Íconos de línea (24×24, trazo 1.8) — estilo señalética */
const iconos: Record<string, React.ReactNode> = {
  ranking: (<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M2 20h20" /></>),
  quiniela: (<><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" /><path d="M13 5v2M13 11v2M13 17v2" /></>),
  tabla: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></>),
  calendario: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  ligamx: (<><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6Z" /><path d="M9 12l2 2 4-4" /></>),
  grupos: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>),
  perfil: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
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
                className="flex items-center justify-center rounded-full transition-colors duration-200"
                style={{ width: 52, height: 30, background: active ? 'var(--brS)' : 'transparent', color: active ? 'var(--br)' : 'var(--mut)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {iconos[icon]}
                </svg>
              </span>
              <span className="text-[12px] leading-none font-semibold"
                style={{ color: active ? 'var(--ink)' : 'var(--mut)' }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
