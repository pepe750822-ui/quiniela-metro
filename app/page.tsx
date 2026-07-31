'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const letterVariants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.22 } },
};
const titleH1Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.6 } },
};
const titleH2Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 1.05 } },
};
const featureContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 1.5 } },
};
const featureCard = {
  hidden: { opacity: 0, y: 20, scale: 0.88 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const LandingCanvas = dynamic(
  () => import('@/components/LandingCanvas'),
  { ssr: false }
);

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return (
    <div className="relative min-h-screen bg-base overflow-hidden flex flex-col">

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

        {/* Balón rodando */}
        <motion.div
          initial={{ x: -280, rotate: -540, opacity: 0 }}
          animate={{ x: 0, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 55, damping: 10, delay: 0.1 }}
          className="text-5xl mb-4"
          style={{ filter: 'drop-shadow(0 0 18px rgba(234,88,12,0.55))' }}
        >
          ⚽
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.35 }}
          className="inline-flex items-center gap-2 bg-orange-600/10 border border-orange-600/30 rounded-full px-4 py-2 mb-8"
        >
          <motion.span
            className="w-2 h-2 rounded-full bg-orange-500"
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-orange-400 text-sm">STC Metro CDMX · Liga MX Apertura 2026</span>
        </motion.div>

        {/* Título letra por letra */}
        <motion.h1
          style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(4rem,20vw,7rem)', color: 'white', letterSpacing: '0.05em', lineHeight: 1, textShadow: '0 0 30px rgba(234,88,12,0.3)' }}
          initial="hidden"
          animate="visible"
          variants={titleH1Variants}
        >
          {'QUINIELA'.split('').map((char, i) => (
            <motion.span key={i} variants={letterVariants} style={{ display: 'inline-block' }}>{char}</motion.span>
          ))}
        </motion.h1>
        <motion.h2
          style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(3.5rem,18vw,6rem)', color: '#ea580c', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '0.5rem', textShadow: '0 0 20px rgba(234,88,12,0.5)' }}
          initial="hidden"
          animate="visible"
          variants={titleH2Variants}
        >
          {'METRO'.split('').map((char, i) => (
            <motion.span key={i} variants={letterVariants} style={{ display: 'inline-block' }}>{char}</motion.span>
          ))}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.35, duration: 0.35 }}
          style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, color: '#f97316', fontSize: '1rem', letterSpacing: '0.06em', marginBottom: '1rem' }}
        >
          LIGA MX APERTURA 2026
        </motion.p>

        <motion.p
          className="text-slate-400 text-base max-w-xs leading-relaxed mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.55, duration: 0.45 }}
        >
          Predice los partidos de Liga MX, compite y gana el pozo entre compañeros del Metro.
        </motion.p>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {user ? (
            <Link href="/dashboard" className="block w-full">
              <motion.button
                className="w-full text-white py-4 rounded-xl font-bold text-lg"
                style={{ background: '#ea580c', fontFamily: 'var(--font-rajdhani)' }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                animate={{ boxShadow: ['0 0 20px rgba(234,88,12,0.4)', '0 0 45px rgba(234,88,12,0.75)', '0 0 20px rgba(234,88,12,0.4)'] }}
                transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.12 } }}
              >
                Ir a mi quiniela 🏆
              </motion.button>
            </Link>
          ) : (
            <Link href="/login" className="block w-full">
              <motion.button
                className="w-full text-white py-4 rounded-xl font-bold text-lg"
                style={{ background: '#ea580c', fontFamily: 'var(--font-rajdhani)' }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                animate={{ boxShadow: ['0 0 20px rgba(234,88,12,0.4)', '0 0 45px rgba(234,88,12,0.75)', '0 0 20px rgba(234,88,12,0.4)'] }}
                transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.12 } }}
              >
                Entrar a jugar ⚽
              </motion.button>
            </Link>
          )}
          <Link href="/instrucciones" className="block w-full">
            <motion.button
              className="w-full py-4 rounded-xl font-bold text-lg"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontFamily: 'var(--font-rajdhani)' }}
              whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.25)' }}
              whileTap={{ scale: 0.97 }}
            >
              Cómo funciona 📖
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-20 px-6 pb-12">
        <motion.div
          className="grid grid-cols-3 gap-3 max-w-sm mx-auto"
          initial="hidden"
          animate="visible"
          variants={featureContainer}
        >
          {[
            { icon: '🏆', titulo: 'Pozo Real',  desc: '$50 MXN por jornada' },
            { icon: '📊', titulo: 'Ranking',    desc: 'Tiempo real'         },
            { icon: '🎫', titulo: 'Familiar',   desc: 'Varias quinielas'    },
          ].map(({ icon, titulo, desc }) => (
            <motion.div
              key={titulo}
              className="text-center rounded-xl p-3"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}
              variants={featureCard}
              whileHover={{ scale: 1.06, y: -3 }}
            >
              <div className="text-xl mb-1">{icon}</div>
              <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 'bold', color: 'white', fontSize: '0.75rem' }}>{titulo}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-20 text-center pb-8 text-slate-700 text-xs">
        Liga MX · Apertura 2026
      </div>

      {/* Botón flotante WhatsApp */}
      <a
        href="https://chat.whatsapp.com/LeFSQrZwf9nARVoU7YARhD"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-[0_4px_20px_rgba(34,197,94,0.4)] hover:bg-green-400 hover:scale-110 active:scale-95 transition-all text-2xl">
        💬
      </a>
    </div>
  );
}
