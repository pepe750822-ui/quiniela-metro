'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const WHATSAPP_GRUPO = 'https://chat.whatsapp.com/LeFSQrZwf9nARVoU7YARhD';

const beneficios = [
  {
    titulo: 'Pozo real',
    desc: '$50 por jornada. Quien haga más puntos se lo lleva.',
    color: '#C8006A',
    icono: (
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
    ),
  },
  {
    titulo: 'Ranking en tiempo real',
    desc: 'Los puntos cambian en cuanto termina cada partido.',
    color: '#0071BC',
    icono: <path d="M3 21h18M5 21v-8h4v8M10 21V7h4v14M15 21v-5h4v5" />,
  },
  {
    titulo: 'Varias quinielas por persona',
    desc: 'Llena una o más y cada una compite por el pozo.',
    color: '#00894A',
    icono: (
      <>
        <rect x="7" y="3" width="13" height="15" rx="2" />
        <path d="M4 7v12a2 2 0 0 0 2 2h10" />
      </>
    ),
  },
];

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-5 px-4 pb-44" style={{ paddingTop: 'max(28px, env(safe-area-inset-top))' }}>
      {/* Letrero de estación */}
      <section className="overflow-hidden rounded-[22px]" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>
        <div className="h-3" style={{ background: '#C8006A' }} />
        <div className="flex flex-col gap-4 px-5 pb-6 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px]" style={{ background: 'var(--bg-base)' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#C8006A" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" />
                <path d="M12 3v4.5M15.2 9.8l4.6-1.6M14 13.6l2.6 4.2M10 13.6l-2.6 4.2M8.8 9.8L4.2 8.2" />
              </svg>
            </div>
            <span className="font-senal text-[15px] font-bold uppercase tracking-[0.14em] opacity-80">STC Metro CDMX</span>
          </div>
          <h1 className="font-senal m-0 text-[64px] font-extrabold uppercase leading-[0.9]">
            Quiniela<br />Metro
          </h1>
          <p className="m-0 text-[17px] font-medium opacity-85">Liga MX Apertura 2026 · Fecha FIFA</p>
        </div>
      </section>

      {/* Línea con estaciones */}
      <div aria-hidden="true" className="relative mx-1.5 h-[34px]">
        <div className="absolute inset-x-0 top-[13px] h-1.5 rounded-full" style={{ background: '#C8006A' }} />
        <div className="absolute inset-0 flex justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-8 rounded-full" style={{ border: '5px solid #C8006A', background: i === 4 ? '#C8006A' : 'var(--bg-base)' }} />
          ))}
        </div>
      </div>

      {/* Beneficios */}
      <section aria-label="Beneficios" className="flex flex-col gap-2.5">
        {beneficios.map((b) => (
          <div key={b.titulo} className="flex items-center gap-3.5 rounded-[18px] p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: b.color }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {b.icono}
              </svg>
            </div>
            <div>
              <p className="text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>{b.titulo}</p>
              <p className="text-[15px] leading-snug" style={{ color: 'var(--text-muted)' }}>{b.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* WhatsApp flotante */}
      <a
        href={WHATSAPP_GRUPO}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir grupo de WhatsApp"
        className="fixed right-4 z-40 flex h-[60px] w-[60px] items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
        style={{ bottom: 'calc(220px + env(safe-area-inset-bottom))', background: 'var(--wa)', color: 'var(--wa-on)' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5z" />
        </svg>
      </a>

      {/* Acciones fijas abajo, sobre la barra de navegación */}
      <div
        className="fixed inset-x-0 z-40 border-t px-4 pt-3"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))', background: 'var(--bg-base)', borderColor: 'var(--border-color)', paddingBottom: 10 }}
      >
        <div className="mx-auto flex max-w-xl flex-col gap-1">
          <Link
            href={user ? '/dashboard' : '/login'}
            className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl text-[18px] font-bold transition-transform active:scale-[0.98]"
            style={{ background: 'var(--brand)', color: 'var(--brand-on)' }}
          >
            {user ? 'Ir a mi quiniela' : 'Entrar'}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
          <Link href="/instrucciones" className="flex min-h-[44px] items-center justify-center text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            ¿Primera vez? Mira cómo se juega
          </Link>
        </div>
      </div>
    </div>
  );
}
