'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

import { cargarJornadaActual } from '@/lib/jornadaActual';

const featureContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
};
const featureCard = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const icono = (d: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

const features = [
  { titulo: 'Pozo real', desc: '$50 por jornada. Quien haga más puntos se lo lleva.', bg: 'var(--br)',
    icon: icono(<><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4Z" /><path d="M9 9h6M9 13h6" /></>) },
  { titulo: 'Ranking en tiempo real', desc: 'Los puntos cambian en cuanto termina cada partido.', bg: '#1F6FB2',
    icon: icono(<><path d="M5 20V12M12 20V5M19 20v-9" /></>) },
  { titulo: 'Varias quinielas por persona', desc: 'Llena una o más y cada una compite por el pozo.', bg: 'var(--wa)',
    icon: icono(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>) },
];

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const [jornada, setJornada] = useState<number | null>(null);

  useEffect(() => {
    cargarJornadaActual().then(setJornada);
  }, []);

  const estaciones = jornada
    ? [jornada - 4, jornada - 3, jornada - 2, jornada - 1].filter(j => j > 0)
    : [];

  return (
    <div className="relative min-h-screen bg-base flex flex-col px-4"
      style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'calc(150px + env(safe-area-inset-bottom))' }}>

      {/* Hero tipo letrero de estación */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[20px] max-w-lg w-full mx-auto"
        style={{ background: '#15120F', color: '#F5F0E7', borderTop: '6px solid var(--br)' }}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, background: '#F5F0E7', color: '#C8006A' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 7l4 3-1.5 5h-5L8 10Z" /></svg>
            </span>
            <span className="senal" style={{ fontSize: 12 }}>
              Línea Quiniela{jornada ? ` · Estación J${jornada}` : ''}
            </span>
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(64px, 22vw, 92px)', lineHeight: 0.9 }}>
            Quiniela<br />Metro
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: '#D6CEC1' }}>
            Predice los partidos de Liga MX, compite y gana el pozo entre compañeros del Metro.
          </p>
        </div>

        {/* Línea con estaciones */}
        {estaciones.length > 0 && (
          <div className="relative px-5 pt-3 pb-4" style={{ background: '#F4EFE6' }}>
            <div className="absolute left-5 right-5" style={{ top: 21, height: 6, borderRadius: 3, background: '#C8006A' }} />
            <div className="relative flex justify-between">
              {[...estaciones.map(j => `J${j}`), 'Hoy'].map((et, i, arr) => (
                <div key={et} className="flex flex-col items-center gap-1">
                  <span className="rounded-full" style={{
                    width: i === arr.length - 1 ? 22 : 18, height: i === arr.length - 1 ? 22 : 18, marginTop: i === arr.length - 1 ? -2 : 0,
                    background: i === arr.length - 1 ? '#C8006A' : '#F4EFE6', border: '4px solid #C8006A',
                  }} />
                  <span className="text-[12px] font-bold" style={{ color: '#15120F' }}>{et}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      {/* Features */}
      <motion.div className="flex flex-col gap-3 max-w-lg w-full mx-auto mt-4"
        initial="hidden" animate="visible" variants={featureContainer}>
        {features.map(f => (
          <motion.div key={f.titulo} variants={featureCard}
            className="flex items-start gap-3 rounded-[16px] p-4"
            style={{ background: 'var(--sf)', border: '1px solid var(--ln)' }}>
            <span className="flex items-center justify-center rounded-[10px] shrink-0" style={{ width: 44, height: 44, background: f.bg, color: '#fff' }}>
              {f.icon}
            </span>
            <div>
              <p className="font-bold text-[17px]" style={{ color: 'var(--ink)' }}>{f.titulo}</p>
              <p className="text-[14px]" style={{ color: 'var(--mut)' }}>{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA fijo inferior */}
      <div className="fixed left-0 right-0 z-40 px-4 pt-3 pb-2"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))', background: 'linear-gradient(to bottom, transparent, var(--bg) 30%)' }}>
        <div className="max-w-lg mx-auto">
          <Link href={user ? '/dashboard' : '/login'}
            className="flex items-center justify-center gap-2 w-full rounded-[12px] font-bold text-[17px] transition-transform active:scale-[0.98]"
            style={{ minHeight: 56, background: 'var(--br)', color: 'var(--brI)' }}>
            {user ? 'Ir a mi quiniela' : 'Entrar'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
          <Link href="/instrucciones" className="block text-center text-[14px] font-medium underline underline-offset-2 mt-2 py-1" style={{ color: 'var(--ink2)' }}>
            ¿Primera vez? Mira cómo se juega
          </Link>
        </div>
      </div>

      {/* Botón flotante WhatsApp */}
      <a
        href="https://chat.whatsapp.com/LeFSQrZwf9nARVoU7YARhD"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Grupo de WhatsApp"
        className="fixed right-4 z-50 rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ bottom: 'calc(200px + env(safe-area-inset-bottom))', background: 'var(--wa)', color: '#fff' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.3Z" /></svg>
      </a>
    </div>
  );
}
