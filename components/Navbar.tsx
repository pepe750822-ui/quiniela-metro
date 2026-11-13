'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ThemeToggle from '@/components/ThemeToggle';
import { TEMPORADA_ACTIVA } from '@/lib/utils';

type IconName = 'ranking' | 'quiniela' | 'tabla' | 'grupos' | 'bracket' | 'lmx' | 'calendario' | 'perfil' | 'admin';

// Iconos de línea (estilo pictograma de señalética), sin emojis
function Icon({ name }: { name: IconName }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (name) {
    case 'ranking':    return <svg {...p}><path d="M3 21h18M5 21v-8h4v8M10 21V7h4v14M15 21v-5h4v5" /></svg>;
    case 'quiniela':   return <svg {...p}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" /><path d="M14 6v2M14 11v2M14 16v1" /></svg>;
    case 'tabla':      return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></svg>;
    case 'grupos':     return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
    case 'bracket':    return <svg {...p}><path d="M4 5h5v6H4M4 13h5v6H4M9 8h4v8H9M13 12h7" /></svg>;
    case 'lmx':        return <svg {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M9 11h6M12 8v6" /></svg>;
    case 'calendario': return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case 'perfil':     return <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
    case 'admin':      return <svg {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>;
  }
}

const publicLinks: { href: string; label: string; icon: IconName }[] = [
  { href: '/predicciones', label: 'Quiniela', icon: 'quiniela' },
  { href: '/tabla',        label: 'Tabla',    icon: 'tabla' },
  ...(TEMPORADA_ACTIVA !== 'ligamx2026' ? [{ href: '/grupos',  label: 'Grupos',  icon: 'grupos' as IconName }] : []),
  ...(TEMPORADA_ACTIVA !== 'ligamx2026' ? [{ href: '/bracket', label: 'Bracket', icon: 'bracket' as IconName }] : []),
  { href: '/calendario',   label: 'Calendario', icon: 'calendario' },
  ...(TEMPORADA_ACTIVA === 'ligamx2026' ? [{ href: '/posiciones', label: 'Liga MX', icon: 'lmx' as IconName }] : []),
  { href: '/perfil',       label: 'Perfil',   icon: 'perfil' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [esAdmin,  setEsAdmin]  = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setLoggedIn(true);
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('rol')
        .eq('id', data.user.id)
        .maybeSingle();
      setEsAdmin(jugador?.rol === 'admin');
    });
  }, [pathname]);

  const links: { href: string; label: string; icon: IconName }[] = [
    { href: loggedIn ? '/dashboard' : '/', label: 'Ranking', icon: 'ranking' },
    ...publicLinks,
    ...(esAdmin ? [{ href: '/admin', label: 'Admin', icon: 'admin' as IconName }] : []),
  ];

  return (
    <>
    {/* Botón de tema: esquina superior derecha (acción secundaria). Fuera del <nav>
        porque su backdrop-filter crearía un contenedor para los elementos fixed. */}
    <div className="no-print fixed right-3 z-50" style={{ top: 'max(12px, env(safe-area-inset-top))' }}>
      <ThemeToggle />
    </div>
    <nav
      aria-label="Navegación principal"
      className="no-print fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ background: 'var(--nav-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="mx-auto flex max-w-xl px-1 pt-1.5"
        style={{ paddingBottom: 'calc(6px + env(safe-area-inset-bottom))' }}
      >
        {links.map(({ href, label, icon }) => {
          const active =
            pathname === href ||
            (href === '/dashboard' && pathname === '/') ||
            (href === '/' && pathname === '/dashboard') ||
            (href !== '/' && pathname.startsWith(href + '/'));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
              style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <span
                className="flex h-[30px] w-[50px] max-w-full items-center justify-center rounded-full transition-colors"
                style={active ? { background: 'var(--brand-soft)', color: 'var(--brand)' } : undefined}
              >
                <Icon name={icon} />
              </span>
              <span className="max-w-full truncate text-[12px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
