'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const links = [
  { href: '/',             label: 'Ranking',      emoji: '🏆' },
  { href: '/predicciones', label: 'Predicciones', emoji: '⚽' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [creditos, setCreditos] = useState<number | null>(null);
  const [esAdmin,  setEsAdmin]  = useState(false);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('creditos, rol')
        .eq('id', data.user.id)
        .maybeSingle();
      if (jugador) {
        setCreditos(jugador.creditos);
        setEsAdmin(jugador.rol === 'admin');
      }
    });
  }, [pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex backdrop-blur-xl border-t"
      style={{
        background: 'rgba(10,10,15,0.95)',
        borderColor: 'rgba(234,88,12,0.2)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {links.map(({ href, label, emoji }) => {
        const active = pathname === href;
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

      {/* Créditos del usuario */}
      {creditos !== null && (
        <div className="flex flex-col items-center justify-center py-3 gap-0.5 px-4">
          <span className="text-xl leading-none">💳</span>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${creditos <= 0 ? 'animate-pulse' : ''}`}
            style={{ color: creditos > 0 ? 'var(--accent-gold)' : '#ef4444' }}
          >
            {creditos}
          </span>
        </div>
      )}

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

      {/* Cerrar sesión */}
      <button
        onClick={cerrarSesion}
        className="flex flex-col items-center justify-center py-3 gap-0.5 px-4 min-h-[48px] transition-colors text-slate-500 hover:text-red-400"
      >
        <span className="text-lg leading-none">🚪</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest">Salir</span>
      </button>
    </nav>
  );
}
