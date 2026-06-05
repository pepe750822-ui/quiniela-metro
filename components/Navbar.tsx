'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const publicLinks = [
  { href: '/predicciones',   label: 'Predicciones', emoji: '⚽' },
  { href: '/tabla',          label: 'Tabla',        emoji: '📊' },
  { href: '/calendario',     label: 'Calendario',   emoji: '📅' },
  { href: '/perfil',         label: 'Perfil',       emoji: '👤' },
  { href: '/instrucciones',  label: 'Guía',         emoji: '📖' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [esAdmin,     setEsAdmin]     = useState(false);
  const [nombreCorto, setNombreCorto] = useState('');
  const [emailCorto,  setEmailCorto]  = useState('');
  const [loggedIn,    setLoggedIn]    = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setLoggedIn(true);
      const emailPrefijo = data.user.email?.split('@')[0] ?? '';
      setEmailCorto(emailPrefijo);
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('rol, nombre, apodo')
        .eq('id', data.user.id)
        .maybeSingle();
      if (jugador) {
        setEsAdmin(jugador.rol === 'admin');
        setNombreCorto(jugador.apodo || jugador.nombre?.split(' ')[0] || emailPrefijo);
      } else {
        setNombreCorto(emailPrefijo);
      }
    });
  }, [pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col backdrop-blur-xl border-t"
      style={{ background: 'rgba(10,10,15,0.95)', borderColor: 'rgba(234,88,12,0.2)' }}
    >
      {/* Chip de identidad */}
      {nombreCorto && (
        <div className="flex items-center justify-center gap-1.5 py-1 text-[10px]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#475569' }}>
          <span>👤</span>
          <span style={{ color: '#64748b' }}>{nombreCorto}</span>
          {emailCorto && emailCorto !== nombreCorto && (
            <span style={{ color: '#334155' }}>· {emailCorto}</span>
          )}
        </div>
      )}

      {/* Links */}
      <div className="flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {[
        { href: loggedIn ? '/dashboard' : '/', label: 'Ranking', emoji: '🏆' },
        ...publicLinks,
      ].map(({ href, label, emoji }) => {
        const active = pathname === href || (href === '/dashboard' && pathname === '/') || (href === '/' && pathname === '/dashboard');
        return (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-all min-h-[48px]"
          >
            <span className="text-xl leading-none" style={active ? {
              filter: 'drop-shadow(0 0 8px rgba(234,88,12,0.8))',
            } : {}}>
              {emoji}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: active ? 'var(--accent-gold)' : '#64748b' }}>
              {label}
            </span>
          </Link>
        );
      })}

      {/* Enlace admin — solo visible para rol=admin */}
      {esAdmin && (
        <Link href="/admin"
          className="flex flex-col items-center justify-center py-3 gap-0.5 px-4 min-h-[48px] transition-all"
        >
          <span className="text-xl leading-none" style={pathname === '/admin' ? {
            filter: 'drop-shadow(0 0 8px rgba(234,88,12,0.8))',
          } : {}}>
            ⚙️
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: pathname === '/admin' ? 'var(--accent-gold)' : '#64748b' }}>
            Admin
          </span>
        </Link>
      )}

      </div>
    </nav>
  );
}
