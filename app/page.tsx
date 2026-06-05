'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LandingCanvas = dynamic(
  () => import('@/components/LandingCanvas'),
  { ssr: false }
);

export default function LandingPage() {
  const [timeLeft, setTimeLeft] = useState({ dias: 0, horas: 0, mins: 0, segs: 0 });

  useEffect(() => {
    const target = new Date('2026-06-11T13:00:00-06:00');
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) return;
      setTimeLeft({
        dias:  Math.floor(diff / 86400000),
        horas: Math.floor((diff % 86400000) / 3600000),
        mins:  Math.floor((diff % 3600000) / 60000),
        segs:  Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden flex flex-col">

      {/* Canvas Three.js de fondo */}
      <div className="absolute inset-0 z-0" style={{ opacity: 0.7 }}>
        <LandingCanvas />
      </div>

      {/* Overlay gradiente */}
      <div className="absolute inset-0 z-10" style={{
        background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.1) 40%, rgba(10,10,10,0.9) 80%, rgba(10,10,10,1) 100%)'
      }} />

      {/* Contenido */}
      <div className="relative z-20 flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-orange-600/10 border border-orange-600/30 rounded-full px-4 py-2 mb-8 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-orange-400 text-sm">STC Metro CDMX · Mundial 2026</span>
        </div>

        {/* Título */}
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(4rem,20vw,7rem)', color: 'white', letterSpacing: '0.05em', lineHeight: 1, textShadow: '0 0 30px rgba(234,88,12,0.3)' }}>
          QUINIELA
        </h1>
        <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(3.5rem,18vw,6rem)', color: '#ea580c', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '1.5rem', textShadow: '0 0 20px rgba(234,88,12,0.5)' }}>
          METRO 2026
        </h2>

        <p className="text-slate-400 text-base max-w-xs leading-relaxed mb-10">
          Predice, compite y gana el pozo entre compañeros del Metro.
        </p>

        {/* Countdown */}
        <div className="mb-10">
          <p className="text-slate-600 text-xs mb-4 uppercase tracking-[3px]">
            Faltan para el partido inaugural
          </p>
          <div className="flex gap-3 justify-center">
            {[
              { v: timeLeft.dias,  l: 'DÍAS' },
              { v: timeLeft.horas, l: 'HRS'  },
              { v: timeLeft.mins,  l: 'MIN'  },
              { v: timeLeft.segs,  l: 'SEG'  },
            ].map(({ v, l }) => (
              <div key={l} className="text-center">
                <div className="bg-black/50 backdrop-blur-sm border border-orange-600/20 rounded-xl px-4 py-3 min-w-[58px]">
                  <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: '#ea580c', display: 'block', lineHeight: 1 }}>
                    {String(v).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-slate-600 text-[10px] mt-1.5 tracking-wider">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/login" className="block w-full">
            <button
              className="w-full text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all"
              style={{ background: '#ea580c', fontFamily: 'var(--font-rajdhani)', boxShadow: '0 0 30px rgba(234,88,12,0.3)' }}
            >
              Entrar a jugar ⚽
            </button>
          </Link>
          <Link href="/instrucciones" className="block w-full">
            <button
              className="w-full py-4 rounded-xl font-bold text-lg transition-all"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontFamily: 'var(--font-rajdhani)' }}
            >
              Cómo funciona 📖
            </button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-20 px-6 pb-12">
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {[
            { icon: '🏆', titulo: 'Pozo Real',  desc: '$50 MXN por jornada' },
            { icon: '📊', titulo: 'Ranking',    desc: 'Tiempo real'         },
            { icon: '🎫', titulo: 'Familiar',   desc: 'Varias quinielas'    },
          ].map(({ icon, titulo, desc }) => (
            <div key={titulo}
              className="text-center rounded-xl p-3"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="text-xl mb-1">{icon}</div>
              <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 'bold', color: 'white', fontSize: '0.75rem' }}>{titulo}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-20 text-center pb-8 text-slate-700 text-xs">
        México 🇲🇽 · Canadá 🇨🇦 · Estados Unidos 🇺🇸
      </div>
    </div>
  );
}
