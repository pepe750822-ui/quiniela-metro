'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RankingConJugador, Pozo } from '@/types';
import RankingTable from '@/components/RankingTable';
import Link from 'next/link';
import { emailCorto } from '@/lib/utils';

const INAUGURAL = new Date('2026-06-11T20:00:00Z'); // 15:00 CDMX = 20:00 UTC

const nomParticipante = (j: { nombre: string; email: string; apodo: string | null } | null) =>
  j?.apodo || j?.nombre?.split(' ')[0] || 'Jugador';

const iniParticipante = (j: { nombre: string; apodo: string | null } | null) =>
  (j?.apodo || j?.nombre || 'J').substring(0, 2).toUpperCase();

function useCountdown(target: Date) {
  const [diff, setDiff]       = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => setDiff(Math.max(0, target.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, started: mounted && diff === 0, mounted };
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
        <Link
          href={`/jornada/${pozo.jornada}`}
          className="block w-full text-center py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'rgba(234,88,12,0.15)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)', fontFamily: 'var(--font-rajdhani)' }}
        >
          👁️ Ver predicciones de todos
        </Link>
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

interface ParticipanteItem {
  id: string;
  user_id: string;
  pagado: boolean;
  jugador: { nombre: string; email: string; apodo: string | null } | null;
}

export default function RankingPage() {
  const [ranking, setRanking]                   = useState<RankingConJugador[]>([]);
  const [userId, setUserId]                     = useState<string | undefined>();
  const [loading, setLoading]                   = useState(true);
  const [pozos, setPozos]                       = useState<Pozo[]>([]);
  const [pendienteIds, setPendienteIds]         = useState<string[]>([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<number>(1);
  const [participantesJornada, setParticipantesJornada] = useState<ParticipanteItem[]>([]);
  const { d, h, m, s, started, mounted: countdownReady } = useCountdown(INAUGURAL);

  const cargarRanking = useCallback(async () => {
    setLoading(true);
    const j = Number(jornadaSeleccionada);

    // ── Participaciones ──────────────────────────────────
    const { data: participaciones } = await supabase
      .from('quiniela_participaciones')
      .select('id, user_id, jornada, pagado, publicado')
      .eq('jornada', j)
      .order('created_at', { ascending: true });

    const partUserIds = participaciones?.map(p => p.user_id) ?? [];
    const { data: partJugadores } = partUserIds.length
      ? await supabase
          .from('quiniela_jugadores')
          .select('id, nombre, email, apodo')
          .in('id', partUserIds)
      : { data: [] };

    const participantesConNombre: ParticipanteItem[] = (participaciones ?? []).map(p => ({
      id:      p.id,
      user_id: p.user_id,
      pagado:  p.pagado,
      jugador: (partJugadores ?? []).find(j => j.id === p.user_id) ?? null,
    }));
    setParticipantesJornada(participantesConNombre);

    // ── Ranking ──────────────────────────────────────────
    const { data: rankData } = await supabase
      .from('quiniela_ranking')
      .select('id, user_id, jornada, puntos_total, exactos, updated_at')
      .eq('jornada', j)
      .order('puntos_total', { ascending: false });

    const rankUserIds = rankData?.map(r => r.user_id) ?? [];
    const { data: rankJugadores } = rankUserIds.length
      ? await supabase
          .from('quiniela_jugadores')
          .select('id, nombre, email, apodo, avatar_url')
          .in('id', rankUserIds)
      : { data: [] };

    setRanking(
      (rankData ?? []).map(r => {
        const jug = (rankJugadores ?? []).find(j => j.id === r.user_id);
        console.log('Jugador con apodo:', jug?.apodo, jug?.nombre);
        return {
          id:           r.id,
          user_id:      r.user_id,
          jornada:      r.jornada,
          puntos_total: Number(r.puntos_total),
          exactos:      Number(r.exactos),
          updated_at:   r.updated_at ?? '',
          jugador: {
            id:         r.user_id,
            nombre:     jug?.nombre     ?? '',
            apodo:      jug?.apodo      ?? null,
            email:      jug?.email      ?? '',
            rol:        'jugador' as const,
            avatar_url: jug?.avatar_url ?? null,
            creditos:   0,
            created_at: '',
          },
        };
      })
    );

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaSeleccionada]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarRanking(); }, [jornadaSeleccionada]);

  const jornadasDisponibles = pozos.length > 0 ? pozos.map(p => p.jornada) : [1];

  return (
    <main
      className="max-w-lg mx-auto px-4 pb-24 space-y-6 relative"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      {/* Header */}
      <div className="text-center space-y-1" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
        <img
          src="/icons/icon-192.png"
          alt="Quiniela Metro"
          className="w-20 h-20 rounded-2xl mx-auto mb-2 shadow-lg shadow-orange-500/20"
        />
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
        {!countdownReady ? (
          <div className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
        ) : started ? (
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

      {/* Ranking por jornada */}
      <div style={{ animation: 'fadeInUp 0.5s ease-out 0.3s both' }}>
        <h2 className="font-bebas text-2xl mb-3" style={{ color: '#ea580c' }}>
          Clasificación Jornada {jornadaSeleccionada}
        </h2>

        {/* Selector de jornada */}
        <div className="flex gap-2 mb-4">
          {jornadasDisponibles.map(j => (
            <button
              key={j}
              onClick={() => setJornadaSeleccionada(j)}
              className="px-4 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95 min-h-[36px]"
              style={{
                background: jornadaSeleccionada === j ? 'var(--accent-gold)' : 'var(--bg-card)',
                color: jornadaSeleccionada === j ? '#000' : 'var(--text-secondary)',
                border: `1px solid ${jornadaSeleccionada === j ? 'var(--accent-gold)' : 'var(--border)'}`,
                fontFamily: 'var(--font-rajdhani)',
              }}
            >
              J{j}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
          </div>
        ) : ranking.length > 0 ? (
          <RankingTable ranking={ranking} userId={userId} pendienteIds={pendienteIds} />
        ) : (
          <div>
            <p className="text-sm text-center mb-4" style={{ color: '#64748b' }}>
              ⏳ El ranking se actualizará cuando inicien los partidos
            </p>
            {participantesJornada.length === 0 ? (
              <p className="text-sm text-center" style={{ color: '#475569' }}>
                Aún no hay participantes en esta jornada
              </p>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {participantesJornada.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? '1px solid #1e1e2e' : undefined }}
                  >
                    <span className="text-sm w-6 text-center" style={{ color: '#64748b' }}>{i + 1}</span>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
                    >
                      {iniParticipante(p.jugador)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)' }}>
                        {nomParticipante(p.jugador)}
                      </p>
                      <p className="text-xs truncate" style={{ color: '#64748b' }}>
                        {emailCorto(p.jugador?.email || '')}
                        {p.pagado ? ' · ✅ Confirmado' : ' · ⏳ Pago pendiente'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
