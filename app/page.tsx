'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RankingConJugador } from '@/types';
import RankingTable from '@/components/RankingTable';
import Link from 'next/link';

const INAUGURAL = new Date('2026-06-11T20:00:00Z'); // 15:00 CDMX = 20:00 UTC

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(() => Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, target.getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, started: diff === 0 };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: 'var(--accent-gold)', lineHeight: 1 }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingConJugador[]>([]);
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const { d, h, m, s, started } = useCountdown(INAUGURAL);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));

    supabase
      .from('quiniela_ranking')
      .select('*, jugador:quiniela_jugadores(*)')
      .is('jornada', null)
      .order('puntos_total', { ascending: false })
      .then(({ data }) => {
        setRanking((data as RankingConJugador[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <main
      className="max-w-lg mx-auto px-4 pb-24 space-y-6 relative"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      {/* Header */}
      <div className="text-center space-y-1" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
        <p className="text-4xl mb-1">🏟️</p>
        <h1
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}
        >
          QUINIELA METRO
        </h1>
        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
          Mundial 2026 🏆 · STC Metro CDMX
        </p>
      </div>

      {/* Countdown */}
      <div
        className="rounded-2xl px-4 py-4 text-center space-y-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'fadeInUp 0.5s ease-out 0.1s both' }}
      >
        {started ? (
          <p className="font-bold text-sm" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
            🎉 ¡El Mundial ha comenzado!
          </p>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Partido inaugural · 11 jun · 15:00 CDMX
            </p>
            <div className="flex items-start justify-center gap-4">
              <CountdownUnit value={d} label="días" />
              <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--border)', lineHeight: '2.5rem' }}>:</span>
              <CountdownUnit value={h} label="horas" />
              <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--border)', lineHeight: '2.5rem' }}>:</span>
              <CountdownUnit value={m} label="min" />
              <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--border)', lineHeight: '2.5rem' }}>:</span>
              <CountdownUnit value={s} label="seg" />
            </div>
          </>
        )}
      </div>

      {/* Login CTA */}
      {!userId && (
        <Link
          href="/login"
          className="block w-full py-3.5 rounded-2xl font-bold text-center text-sm transition-all active:scale-95 min-h-[48px]"
          style={{ background: 'var(--accent-gold)', color: '#000', fontFamily: 'var(--font-rajdhani)', animation: 'fadeInUp 0.5s ease-out 0.2s both' }}
        >
          ⚽ Entrar a jugar →
        </Link>
      )}

      {/* Ranking */}
      <div style={{ animation: 'fadeInUp 0.5s ease-out 0.2s both' }}>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Clasificación general
        </p>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <RankingTable ranking={ranking} userId={userId} />
        )}
      </div>
    </main>
  );
}
