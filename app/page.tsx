'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RankingConJugador, Pozo } from '@/types';
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
      <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: 'var(--accent-gold)', lineHeight: 1 }}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

const estadoBorderColor: Record<string, string> = {
  abierto:  'rgba(234,88,12,0.5)',
  cerrado:  'rgba(100,116,139,0.4)',
  pagado:   'rgba(16,185,129,0.5)',
};
const estadoBg: Record<string, string> = {
  abierto:  'rgba(234,88,12,0.06)',
  cerrado:  'rgba(100,116,139,0.06)',
  pagado:   'rgba(16,185,129,0.06)',
};
const estadoLabel: Record<string, string> = {
  abierto:  'ABIERTO',
  cerrado:  'CERRADO',
  pagado:   'PAGADO',
};
const estadoColor: Record<string, string> = {
  abierto:  'var(--accent-gold)',
  cerrado:  '#64748b',
  pagado:   '#10b981',
};

function PozoCard({ pozo }: { pozo: Pozo }) {
  const ganoAlguien = (pozo.estado === 'cerrado' || pozo.estado === 'pagado') && pozo.ganador_nombre;
  return (
    <div
      className="rounded-2xl p-4 space-y-3 transition-all"
      style={{
        background: estadoBg[pozo.estado],
        border: `1px solid ${estadoBorderColor[pozo.estado]}`,
        borderLeftWidth: '4px',
        borderLeftColor: estadoBorderColor[pozo.estado],
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
          🏆 POZO JORNADA {pozo.jornada}
        </p>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: `${estadoBorderColor[pozo.estado]}30`, color: estadoColor[pozo.estado] }}
        >
          {estadoLabel[pozo.estado]}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: estadoColor[pozo.estado], lineHeight: 1 }}>
            ${pozo.total_mxn} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>MXN</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            👥 {pozo.participantes} participante{pozo.participantes !== 1 ? 's' : ''}
          </p>
        </div>
        {!ganoAlguien && (
          <Link
            href="/predicciones"
            className="px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{ background: estadoBorderColor[pozo.estado], color: pozo.estado === 'abierto' ? '#000' : 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)' }}
          >
            Ver predicciones
          </Link>
        )}
      </div>

      {ganoAlguien && (
        <div className="rounded-xl px-3 py-2 space-y-0.5" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <p className="text-sm font-bold" style={{ color: '#10b981' }}>🥇 Ganador: {pozo.ganador_nombre}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>💰 Premio: ${pozo.total_mxn} MXN</p>
        </div>
      )}
    </div>
  );
}

export default function RankingPage() {
  const [ranking, setRanking]         = useState<RankingConJugador[]>([]);
  const [userId, setUserId]           = useState<string | undefined>();
  const [loading, setLoading]         = useState(true);
  const [pozos, setPozos]             = useState<Pozo[]>([]);
  const [pendienteIds, setPendienteIds] = useState<string[]>([]);
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

    supabase
      .from('quiniela_pozo')
      .select('*')
      .order('jornada')
      .then(({ data }) => setPozos((data as Pozo[]) ?? []));

    supabase
      .from('quiniela_participaciones')
      .select('user_id')
      .eq('pagado', false)
      .then(({ data }) => {
        const ids = [...new Set((data ?? []).map((p: { user_id: string }) => p.user_id))];
        setPendienteIds(ids);
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
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}>
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

      {/* Pozos por jornada */}
      {pozos.length > 0 && (
        <div className="space-y-3" style={{ animation: 'fadeInUp 0.5s ease-out 0.25s both' }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Pozos acumulados
          </p>
          {pozos.map(pozo => <PozoCard key={pozo.id} pozo={pozo} />)}
        </div>
      )}

      {/* Ranking general */}
      <div style={{ animation: 'fadeInUp 0.5s ease-out 0.3s both' }}>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Clasificación general
        </p>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <RankingTable ranking={ranking} userId={userId} pendienteIds={pendienteIds} />
        )}
      </div>
    </main>
  );
}
