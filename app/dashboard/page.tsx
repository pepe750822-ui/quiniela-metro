'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { RankingConJugador, Pozo } from '@/types';
import RankingTable from '@/components/RankingTable';
import { getNombreJornada, getMontoJornada, TEMPORADA_ACTIVA, getNombreJornadaLigaMX } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const JugadorAnimado = dynamic(
  () => import('@/components/JugadorAnimado'),
  { ssr: false }
);

const INAUGURAL = new Date('2026-06-11T20:00:00Z'); // 15:00 CDMX = 20:00 UTC

const labelJornada = (j: number) =>
  TEMPORADA_ACTIVA === 'ligamx2026' ? getNombreJornadaLigaMX(j) : getNombreJornada(j);

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

function PozoCard({ pozo, id }: { pozo: Pozo; id?: string }) {
  const ganoAlguien = (pozo.estado === 'cerrado' || pozo.estado === 'pagado') && pozo.ganador_nombre;
  return (
    <motion.div
      id={id}
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: estadoBg[pozo.estado],
        border: `1px solid ${estadoBorderColor[pozo.estado]}`,
        borderLeftWidth: '4px',
        borderLeftColor: estadoBorderColor[pozo.estado],
      }}
      variants={cardVariants}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
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
    </motion.div>
  );
}

interface ParticipanteItem {
  id: string;
  user_id: string;
  pagado: boolean;
  jugador: { nombre: string; email: string; apodo: string | null } | null;
  quinielaNombre: string | null;
}

export default function DashboardPage() {
  const [ranking, setRanking]                   = useState<RankingConJugador[]>([]);
  const [userId, setUserId]                     = useState<string | undefined>();
  const [loading, setLoading]                   = useState(true);
  const [pozos, setPozos]                       = useState<Pozo[]>([]);
  const [pendienteIds, setPendienteIds]         = useState<string[]>([]);
  const [pagadosIds, setPagadosIds]             = useState<string[]>([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<number | 'general' | 'lc_total'>(
    TEMPORADA_ACTIVA === 'ligamx2026'
      ? (new Date() > new Date('2026-08-22T01:00:00Z') ? 5
        : new Date() > new Date('2026-08-14T06:00:00Z') ? 4
        : 'lc_total')
      : 1
  );
  const [participantesJornada, setParticipantesJornada] = useState<ParticipanteItem[]>([]);
  const { d, h, m, s, started, mounted: countdownReady } = useCountdown(INAUGURAL);

  const [campeonPick, setCampeonPick]           = useState<string | null>(null);
  const [campeonBadge, setCampeonBadge]         = useState<string | null>(null);
  const [campeonDeclarado, setCampeonDeclarado] = useState<string | null>(null);
  const [campeonLoaded, setCampeonLoaded]       = useState(false);
  const [participacionPendiente, setParticipacionPendiente] = useState<{id: string, pagado: boolean, jornada: number, quiniela_extra_id: string | null, quiniela: {nombre: string} | null} | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const cargarRanking = useCallback(async () => {
    setLoading(true);

    if (jornadaSeleccionada === 'general') {
      const { data: generalData } = await supabase.rpc('get_ranking_general');
      const rankItems = (generalData ?? []) as { user_id: string; puntos_totales: number; exactos_totales: number; jornadas_jugadas: number }[];

      const genUserIds = rankItems.map((r: { user_id: string }) => r.user_id);
      const { data: genJugadores } = genUserIds.length
        ? await supabase.from('quiniela_jugadores').select('id, nombre, email, apodo, avatar_url, badge_ultimo, badge_campeon').in('id', genUserIds)
        : { data: [] };

      // Campeón picks para quiniela principal (quiniela_extra_id IS NULL)
      const { data: genCampeones } = (TEMPORADA_ACTIVA !== 'ligamx2026' && genUserIds.length)
        ? await supabase.from('quiniela_prediccion_campeon').select('user_id, equipo').is('quiniela_extra_id', null).in('user_id', genUserIds)
        : { data: [] };
      const genCampeonMap: Record<string, string> = {};
      (genCampeones ?? []).forEach((c: { user_id: string; equipo: string }) => { genCampeonMap[c.user_id] = c.equipo; });

      setParticipantesJornada([]);
      setRanking(
        rankItems.map((r: { user_id: string; puntos_totales: number; exactos_totales: number }) => {
          const jug = (genJugadores ?? []).find((j: { id: string }) => j.id === r.user_id);
          return {
            id:           r.user_id,
            user_id:      r.user_id,
            jornada:      null,
            puntos_total: Number(r.puntos_totales),
            exactos:      Number(r.exactos_totales),
            updated_at:   '',
            jugador: {
              id:           r.user_id,
              nombre:       jug?.nombre       ?? '',
              apodo:        jug?.apodo        ?? null,
              email:        jug?.email        ?? '',
              rol:          'jugador' as const,
              avatar_url:   jug?.avatar_url   ?? null,
              creditos:     0,
              created_at:   '',
              badge_ultimo:  TEMPORADA_ACTIVA !== 'ligamx2026' ? (jug?.badge_ultimo  ?? null) : null,
              badge_campeon: jug?.badge_campeon ?? null,
              campeon_pick:  TEMPORADA_ACTIVA !== 'ligamx2026' ? (genCampeonMap[r.user_id] ?? null) : null,
            },
          };
        })
      );
      setLoading(false);
      return;
    }

    // ── LC Total: acumulado J1+J2+J3 + bono clasificación ──────────────────
    if (jornadaSeleccionada === 'lc_total') {
      const { data: partsLC } = await supabase
        .from('quiniela_participaciones')
        .select('id, user_id, pagado, quiniela_extra_id')
        .eq('jornada', 1)
        .eq('pagado', true)
        .eq('temporada', TEMPORADA_ACTIVA)
        .order('created_at', { ascending: true });

      const pagadosLC = (partsLC ?? []).map((p: { user_id: string; quiniela_extra_id: string | null }) => ({
        user_id: p.user_id, quiniela_extra_id: p.quiniela_extra_id,
      }));
      const allUserIdsLC = [...new Set(pagadosLC.map(p => p.user_id))];
      setPagadosIds(allUserIdsLC);
      setParticipantesJornada([]);

      // Partidos J1+J2+J3 finalizados
      const { data: partidosLC } = allUserIdsLC.length
        ? await supabase
            .from('quiniela_partidos')
            .select('id')
            .eq('temporada', TEMPORADA_ACTIVA)
            .in('jornada', [1, 2, 3])
            .eq('estado', 'finalizado')
        : { data: [] };
      const lcPartidoIds = (partidosLC ?? []).map((p: { id: string }) => p.id);

      const { data: rankingDataLC } = lcPartidoIds.length && allUserIdsLC.length
        ? await supabase
            .from('quiniela_predicciones')
            .select('user_id, quiniela_extra_id, puntos_ganados')
            .in('partido_id', lcPartidoIds)
            .in('user_id', allUserIdsLC)
        : { data: [] };

      const puntajesLC: Record<string, { puntos: number; exactos: number }> = {};
      (rankingDataLC ?? []).forEach((pred: { user_id: string; quiniela_extra_id: string | null; puntos_ganados: number | null }) => {
        const key = `${pred.user_id}:${pred.quiniela_extra_id ?? 'null'}`;
        if (!puntajesLC[key]) puntajesLC[key] = { puntos: 0, exactos: 0 };
        puntajesLC[key].puntos += pred.puntos_ganados || 0;
        if (pred.puntos_ganados === 3) puntajesLC[key].exactos++;
      });

      // Bono clasificación LC
      if (allUserIdsLC.length) {
        const [{ data: lcRows }, { data: lcPicks }] = await Promise.all([
          supabase.from('quiniela_clasificados_lc').select('liga, equipos').eq('temporada', 'ligamx2026'),
          supabase.from('quiniela_picks_clasificacion').select('user_id, liga, equipos').eq('temporada', 'ligamx2026').in('user_id', allUserIdsLC),
        ]);
        const lcMap: { ligamx: string[]; mls: string[] } = { ligamx: [], mls: [] };
        (lcRows ?? []).forEach((r: { liga: string; equipos: string[] }) => {
          if (r.liga === 'ligamx') lcMap.ligamx = r.equipos;
          if (r.liga === 'mls')    lcMap.mls = r.equipos;
        });
        const userPicksMapLC: Record<string, { ligamx: string[]; mls: string[] }> = {};
        (lcPicks ?? []).forEach((p: { user_id: string; liga: string; equipos: string[] }) => {
          if (!userPicksMapLC[p.user_id]) userPicksMapLC[p.user_id] = { ligamx: [], mls: [] };
          if (p.liga === 'ligamx') userPicksMapLC[p.user_id].ligamx = p.equipos;
          if (p.liga === 'mls')    userPicksMapLC[p.user_id].mls = p.equipos;
        });
        allUserIdsLC.forEach(uid => {
          const up = userPicksMapLC[uid];
          if (!up) return;
          let pts = 0;
          if (lcMap.ligamx.length > 0) pts += up.ligamx.filter(e => lcMap.ligamx.includes(e)).length;
          if (lcMap.mls.length > 0)    pts += up.mls.filter(e => lcMap.mls.includes(e)).length;
          if (pts > 0) {
            pagadosLC.filter(p => p.user_id === uid).forEach(p => {
              const key = `${p.user_id}:${p.quiniela_extra_id ?? 'null'}`;
              if (!puntajesLC[key]) puntajesLC[key] = { puntos: 0, exactos: 0 };
              puntajesLC[key].puntos += pts;
            });
          }
        });
      }

      const rankingOrdenadoLC = pagadosLC
        .map(p => {
          const key = `${p.user_id}:${p.quiniela_extra_id ?? 'null'}`;
          return { id: key, user_id: p.user_id, quiniela_extra_id: p.quiniela_extra_id,
            puntos_total: puntajesLC[key]?.puntos ?? 0, exactos: puntajesLC[key]?.exactos ?? 0 };
        })
        .sort((a, b) => b.puntos_total - a.puntos_total);

      const { data: rankJugadoresLC } = allUserIdsLC.length
        ? await supabase.from('quiniela_jugadores').select('id, nombre, email, apodo, avatar_url, badge_campeon').in('id', allUserIdsLC)
        : { data: [] };
      const extraIdsLC = [...new Set(pagadosLC.map(p => p.quiniela_extra_id).filter(Boolean))] as string[];
      const { data: quinielasNombresLC } = extraIdsLC.length
        ? await supabase.from('quiniela_extra').select('id, nombre').in('id', extraIdsLC)
        : { data: [] };

      setRanking(rankingOrdenadoLC.map(r => {
        const jug = (rankJugadoresLC ?? []).find((jg: { id: string }) => jg.id === r.user_id);
        const quinielaNombre = r.quiniela_extra_id
          ? ((quinielasNombresLC ?? []) as { id: string; nombre: string }[]).find(q => q.id === r.quiniela_extra_id)?.nombre ?? null
          : null;
        return {
          id: r.id, user_id: r.user_id, jornada: 1,
          puntos_total: r.puntos_total, exactos: r.exactos, updated_at: '',
          jugador: {
            id: r.user_id, nombre: jug?.nombre ?? '', apodo: jug?.apodo ?? null,
            email: jug?.email ?? '', rol: 'jugador' as const,
            avatar_url: jug?.avatar_url ?? null, creditos: 0, created_at: '',
            badge_ultimo: null, badge_campeon: jug?.badge_campeon ?? null,
            quiniela_nombre: quinielaNombre, campeon_pick: null,
          },
        };
      }));
      setLoading(false);
      return;
    }

    const j = Number(jornadaSeleccionada);

    const { data: parts, error: errorPart } = await supabase
      .from('quiniela_participaciones')
      .select('id, user_id, jornada, pagado, publicado, quiniela_extra_id')
      .eq('jornada', j)
      .eq('pagado', true)
      .eq('temporada', TEMPORADA_ACTIVA)
      .order('created_at', { ascending: true });
    console.log('Participantes query result:', parts, errorPart);

    const userIds = parts?.map((p: { user_id: string }) => p.user_id) ?? [];
    const { data: jugadores, error: errorJug } = userIds.length
      ? await supabase
          .from('quiniela_jugadores')
          .select('id, nombre, email, apodo')
          .in('id', userIds)
      : { data: [], error: null };
    console.log('Jugadores query result:', jugadores, errorJug);

    const quinielaIds = (parts ?? [])
      .map((p: { quiniela_extra_id: string | null }) => p.quiniela_extra_id)
      .filter(Boolean) as string[];
    const { data: quinielasExtra } = quinielaIds.length
      ? await supabase
          .from('quiniela_extra')
          .select('id, nombre')
          .in('id', [...new Set(quinielaIds)])
      : { data: [] };

    const participantesConNombre: ParticipanteItem[] = (parts ?? []).map((p: {
      id: string; user_id: string; pagado: boolean; quiniela_extra_id: string | null;
    }) => ({
      id:             p.id,
      user_id:        p.user_id,
      pagado:         p.pagado,
      jugador:        (jugadores ?? []).find((j: { id: string }) => j.id === p.user_id) ?? null,
      quinielaNombre: p.quiniela_extra_id
        ? ((quinielasExtra ?? []) as { id: string; nombre: string }[]).find(q => q.id === p.quiniela_extra_id)?.nombre ?? null
        : null,
    }));
    // Todos los pagados+publicados, incluyendo quinielas familiares
    const { data: pagadosConPrediccion } = await supabase
      .from('quiniela_participaciones')
      .select('user_id, quiniela_extra_id')
      .eq('jornada', j)
      .eq('pagado', true)
      .eq('publicado', true)
      .eq('temporada', TEMPORADA_ACTIVA);

    // ligamx2026: incluir todos los pagados aunque no tengan predicciones (0 pts)
    // Otras temporadas: solo publicado=true
    const pagadosEntries: { user_id: string; quiniela_extra_id: string | null }[] =
      TEMPORADA_ACTIVA === 'ligamx2026'
        ? (parts ?? []).map((p: { user_id: string; quiniela_extra_id: string | null }) => ({
            user_id:           p.user_id,
            quiniela_extra_id: p.quiniela_extra_id,
          }))
        : (pagadosConPrediccion ?? []) as { user_id: string; quiniela_extra_id: string | null }[];

    setParticipantesJornada(participantesConNombre);

    // user_ids únicos para el badge y para la query de puntos
    const allUserIds = [...new Set(pagadosEntries.map(p => p.user_id))];
    setPagadosIds(allUserIds);

    const { data: rankingData } = allUserIds.length
      ? await supabase
          .from('quiniela_predicciones')
          .select(`
            user_id,
            quiniela_extra_id,
            puntos_ganados,
            partido:quiniela_partidos!inner(estado, jornada, temporada)
          `)
          .eq('partido.jornada', jornadaSeleccionada)
          .eq('partido.estado', 'finalizado')
          .eq('partido.temporada', TEMPORADA_ACTIVA)
          .in('user_id', allUserIds)
      : { data: [] };

    // Agrupar puntos por user_id + quiniela_extra_id
    const puntajes: Record<string, { puntos: number; exactos: number }> = {};
    (rankingData ?? []).forEach((pred: { user_id: string; quiniela_extra_id: string | null; puntos_ganados: number | null }) => {
      const key = `${pred.user_id}:${pred.quiniela_extra_id ?? 'null'}`;
      if (!puntajes[key]) puntajes[key] = { puntos: 0, exactos: 0 };
      puntajes[key].puntos += pred.puntos_ganados || 0;
      if (pred.puntos_ganados === 3) puntajes[key].exactos++;
    });

    // Bono +5 pts por pick de campeón J6
    if (j === 6) {
      const { data: bonosJ6 } = await supabase
        .from('quiniela_bono_campeon')
        .select('user_id, quiniela_extra_id, puntos')
        .eq('jornada', 6);
      (bonosJ6 ?? []).forEach((b: { user_id: string; quiniela_extra_id: string | null; puntos: number }) => {
        const key = `${b.user_id}:${b.quiniela_extra_id ?? 'null'}`;
        if (!puntajes[key]) puntajes[key] = { puntos: 0, exactos: 0 };
        puntajes[key].puntos += b.puntos;
      });
    }

    // Pts de clasificación Leagues Cup (ligamx2026 J1–J3)
    if (TEMPORADA_ACTIVA === 'ligamx2026' && j >= 1 && j <= 3 && allUserIds.length) {
      const [{ data: lcRows }, { data: lcPicks }] = await Promise.all([
        supabase.from('quiniela_clasificados_lc').select('liga, equipos').eq('temporada', 'ligamx2026'),
        supabase.from('quiniela_picks_clasificacion').select('user_id, liga, equipos').eq('temporada', 'ligamx2026').in('user_id', allUserIds),
      ]);
      const lcMap: { ligamx: string[]; mls: string[] } = { ligamx: [], mls: [] };
      (lcRows ?? []).forEach((r: { liga: string; equipos: string[] }) => {
        if (r.liga === 'ligamx') lcMap.ligamx = r.equipos;
        if (r.liga === 'mls')    lcMap.mls = r.equipos;
      });
      const userPicksMap: Record<string, { ligamx: string[]; mls: string[] }> = {};
      (lcPicks ?? []).forEach((p: { user_id: string; liga: string; equipos: string[] }) => {
        if (!userPicksMap[p.user_id]) userPicksMap[p.user_id] = { ligamx: [], mls: [] };
        if (p.liga === 'ligamx') userPicksMap[p.user_id].ligamx = p.equipos;
        if (p.liga === 'mls')    userPicksMap[p.user_id].mls = p.equipos;
      });
      allUserIds.forEach(uid => {
        const up = userPicksMap[uid];
        if (!up) return;
        let pts = 0;
        if (lcMap.ligamx.length > 0) pts += up.ligamx.filter(e => lcMap.ligamx.includes(e)).length;
        if (lcMap.mls.length > 0)    pts += up.mls.filter(e => lcMap.mls.includes(e)).length;
        if (pts > 0) {
          // Apply to all participaciones for this user in this jornada
          pagadosEntries
            .filter(p => p.user_id === uid)
            .forEach(p => {
              const key = `${p.user_id}:${p.quiniela_extra_id ?? 'null'}`;
              if (!puntajes[key]) puntajes[key] = { puntos: 0, exactos: 0 };
              puntajes[key].puntos += pts;
            });
        }
      });
    }

    // Incluir todos los pagados+publicados aunque tengan 0 pts
    const rankingOrdenado = pagadosEntries
      .map(p => {
        const key = `${p.user_id}:${p.quiniela_extra_id ?? 'null'}`;
        return {
          id:                key,
          user_id:           p.user_id,
          quiniela_extra_id: p.quiniela_extra_id,
          puntos_total:      puntajes[key]?.puntos  ?? 0,
          exactos:           puntajes[key]?.exactos ?? 0,
        };
      })
      .sort((a, b) => b.puntos_total - a.puntos_total);

    // Jugadores
    const { data: rankJugadores } = allUserIds.length
      ? await supabase
          .from('quiniela_jugadores')
          .select('id, nombre, email, apodo, avatar_url, badge_ultimo, badge_campeon')
          .in('id', allUserIds)
      : { data: [] };

    // Nombres de quinielas familiares
    const extraIds = [...new Set(pagadosEntries.map(p => p.quiniela_extra_id).filter(Boolean))] as string[];
    const { data: quinielasNombres } = extraIds.length
      ? await supabase.from('quiniela_extra').select('id, nombre').in('id', extraIds)
      : { data: [] };

    // Campeón picks por user_id + quiniela_extra_id
    const { data: campeonesData } = (TEMPORADA_ACTIVA !== 'ligamx2026' && allUserIds.length)
      ? await supabase.from('quiniela_prediccion_campeon').select('user_id, quiniela_extra_id, equipo').in('user_id', allUserIds)
      : { data: [] };
    const campeonMap: Record<string, string> = {};
    (campeonesData ?? []).forEach((c: { user_id: string; quiniela_extra_id: string | null; equipo: string }) => {
      campeonMap[`${c.user_id}:${c.quiniela_extra_id ?? 'null'}`] = c.equipo;
    });

    setRanking(
      rankingOrdenado.map(r => {
        const jug = (rankJugadores ?? []).find((jg: { id: string }) => jg.id === r.user_id);
        const quinielaNombre = r.quiniela_extra_id
          ? ((quinielasNombres ?? []) as { id: string; nombre: string }[]).find(q => q.id === r.quiniela_extra_id)?.nombre ?? null
          : null;
        return {
          id:           r.id,
          user_id:      r.user_id,
          jornada:      j,
          puntos_total: r.puntos_total,
          exactos:      r.exactos,
          updated_at:   '',
          jugador: {
            id:              r.user_id,
            nombre:          jug?.nombre          ?? '',
            apodo:           jug?.apodo           ?? null,
            email:           jug?.email           ?? '',
            rol:             'jugador' as const,
            avatar_url:      jug?.avatar_url      ?? null,
            creditos:        0,
            created_at:      '',
            badge_ultimo:    TEMPORADA_ACTIVA !== 'ligamx2026' ? (jug?.badge_ultimo    ?? null) : null,
            badge_campeon:   jug?.badge_campeon   ?? null,
            quiniela_nombre: quinielaNombre,
            campeon_pick:    TEMPORADA_ACTIVA !== 'ligamx2026' ? (campeonMap[`${r.user_id}:${r.quiniela_extra_id ?? 'null'}`] ?? null) : null,
          },
        };
      })
    );

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaSeleccionada]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      setUserId(uid);
      setUserEmail(data.user?.email || '');
      if (uid) {
        const [{ data: pick }, { data: jug }, { data: final }] = await Promise.all([
          supabase.from('quiniela_campeon_picks').select('equipo').eq('user_id', uid).maybeSingle(),
          supabase.from('quiniela_jugadores').select('nombre, apodo, badge_campeon').eq('id', uid).maybeSingle(),
          supabase
            .from('quiniela_partidos')
            .select('goles_local, goles_visitante, equipo_local, equipo_visitante')
            .eq('grupo', 'FIN')
            .eq('estado', 'finalizado')
            .eq('temporada', TEMPORADA_ACTIVA)
            .maybeSingle(),
        ]);
        setCampeonPick(pick?.equipo ?? null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jugAny = jug as any;
        setCampeonBadge(jugAny?.badge_campeon ?? null);
        setUserName(jugAny?.apodo || jugAny?.nombre?.split(' ')[0] || '');
        if (final) {
          const ganador = (final.goles_local ?? 0) > (final.goles_visitante ?? 0)
            ? final.equipo_local
            : final.equipo_visitante;
          setCampeonDeclarado(ganador);
        }
        setCampeonLoaded(true);

        const { data: participacionPend } = await supabase
          .from('quiniela_participaciones')
          .select('id, pagado, jornada, quiniela_extra_id, quiniela:quiniela_extra(nombre)')
          .eq('user_id', uid)
          .eq('pagado', false)
          .maybeSingle();
        setParticipacionPendiente(participacionPend ? {
          ...participacionPend,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          quiniela: Array.isArray((participacionPend as any).quiniela) ? (participacionPend as any).quiniela[0] ?? null : (participacionPend as any).quiniela ?? null,
        } : null);
      }
    });

    supabase
      .from('quiniela_pozo')
      .select('*')
      .eq('temporada', TEMPORADA_ACTIVA)
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

  useEffect(() => {
    setTimeout(() => {
      const el = document.getElementById('pozo-j6');
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 800);
  }, [pozos]);

  const jornadasConPozo = new Set(pozos.map(p => p.jornada));
  const pozosCompletos: Pozo[] = [...pozos];
  if (TEMPORADA_ACTIVA !== 'ligamx2026') {
    for (let j = 1; j <= 3; j++) {
      if (!jornadasConPozo.has(j)) {
        pozosCompletos.push({
          id: `synthetic-${j}`,
          jornada: j,
          total_mxn: getMontoJornada(j),
          participantes: 0,
          ganador_id: null,
          ganador_nombre: null,
          estado: 'abierto',
          created_at: new Date().toISOString(),
        });
      }
    }
  }
  pozosCompletos.sort((a, b) => a.jornada - b.jornada);

  // Solo mostrar pozos que tienen participantes reales (oculta jornadas futuras vacías)
  const pozosVisibles = pozosCompletos.filter(p => p.participantes > 0);

  const jornadasDisponibles = TEMPORADA_ACTIVA === 'ligamx2026'
    ? [...new Set(pozosCompletos.filter(p => p.participantes > 0).map(p => p.jornada))]
    : [...new Set(pozosCompletos.map(p => p.jornada))];

  const compartirRanking = () => {
    const texto = ranking
      .map((entry, i) => {
        const medals = ['🥇', '🥈', '🥉'];
        const medal = medals[i] || `${i + 1}.`;
        const nombre = entry.jugador?.apodo || entry.jugador?.nombre?.split(' ')[0] || 'Jugador';
        return `${medal} ${nombre} — ${entry.puntos_total} pts`;
      })
      .join('\n');

    const jornadaLabel = jornadaSeleccionada === 'general' ? 'General'
      : jornadaSeleccionada === 'lc_total' ? 'LC Total'
      : labelJornada(jornadaSeleccionada as number);
    const mensaje = encodeURIComponent(
      `🏆 Ranking Quiniela Metro — ${jornadaLabel}\n\n` +
      texto +
      `\n\n⚽ quinielamundial2026metro.vercel.app`
    );

    window.open(`https://wa.me/?text=${mensaje}`, '_blank');
  };

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
          Liga MX Apertura 2026 · STC Metro CDMX
        </p>
        <JugadorAnimado />
      </div>

      {/* Countdown */}
      {TEMPORADA_ACTIVA !== 'ligamx2026' && (
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
      )}

      {/* Champion pick compact card */}
      {campeonLoaded && TEMPORADA_ACTIVA !== 'ligamx2026' && (
        <div
          className="rounded-2xl px-4 py-3 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'fadeInUp 0.5s ease-out 0.2s both' }}
        >
          {campeonDeclarado && campeonBadge === campeonDeclarado && (
            <p className="text-sm font-bold" style={{ color: '#fbbf24', fontFamily: 'var(--font-rajdhani)' }}>
              🏆 ¡Acertaste el Campeón! — {campeonDeclarado}
            </p>
          )}
          {campeonDeclarado && campeonPick && campeonPick !== campeonDeclarado && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🏆 Campeón: <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong> · Tu pick: {campeonPick} ❌
            </p>
          )}
          {campeonDeclarado && !campeonPick && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🏆 Campeón mundial: <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong>
            </p>
          )}
          {!campeonDeclarado && Date.now() >= INAUGURAL.getTime() && campeonPick && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🔒 Tu campeón: <strong style={{ color: '#fbbf24' }}>{campeonPick}</strong>
            </p>
          )}
          {!campeonDeclarado && Date.now() < INAUGURAL.getTime() && !campeonPick && (
            <Link href="/predicciones" className="text-sm font-semibold hover:opacity-80"
              style={{ color: '#ea580c', fontFamily: 'var(--font-rajdhani)' }}>
              🏆 ¿Ya elegiste tu campeón? → Ir a Predicciones
            </Link>
          )}
          {!campeonDeclarado && Date.now() < INAUGURAL.getTime() && campeonPick && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🏆 Tu campeón: <strong style={{ color: '#fbbf24' }}>{campeonPick}</strong>
            </p>
          )}
        </div>
      )}

      {/* Pozos por jornada */}
      {pozosVisibles.length > 0 && (
        <motion.div className="space-y-3" initial="hidden" animate="visible" variants={staggerContainer}>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Pozos acumulados
          </p>
          {pozosVisibles.map(pozo => (
            <PozoCard key={pozo.id} pozo={pozo} id={pozo.jornada === 6 ? 'pozo-j6' : undefined} />
          ))}
        </motion.div>
      )}

      {/* Solo visible para el usuario actual si tiene pago pendiente */}
      {participacionPendiente && (
        <div className="mb-4 bg-orange-600/10 border border-orange-500/30 rounded-2xl p-4 mt-6" style={{ animation: 'fadeInUp 0.5s ease-out 0.28s both' }}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bebas text-lg text-orange-400">
              {participacionPendiente?.quiniela?.nombre
                ? `⏳ PAGO PENDIENTE — 🎫 ${participacionPendiente.quiniela.nombre}`
                : '⏳ TU PAGO ESTÁ PENDIENTE'
              }
            </h3>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Tus predicciones están guardadas pero no 
            participarás en el pozo hasta que se confirme 
            tu pago de ${getMontoJornada(participacionPendiente.jornada)} MXN.
          </p>
          <div className="bg-[#0a0a0a] rounded-xl p-3 mb-3">
            <p className="text-xs text-slate-500 mb-1">
              Datos para transferencia:
            </p>
            <p className="text-white text-sm font-bold">
              Santander — CLABE: 014180565546539842
            </p>
            <p className="text-slate-400 text-xs">
              JOSE LUIS GONZALEZ PEREZ
            </p>
          </div>
          <a
            href={`https://wa.me/525523269241?text=${encodeURIComponent(
              '¡Hola! Ya realicé mi pago para la Quiniela Metro Mundial 2026 🏆\n\n' +
              'Por favor confirma mi participación.\n\n' +
              'Nombre: ' + (userName || '') + '\n' +
              'Quiniela: ' + (participacionPendiente?.quiniela?.nombre || 'Principal') + '\n' +
              'Mi correo de registro: ' + (userEmail || '') + '\n' +
              'Jornada: ' + (participacionPendiente?.jornada || 1) + '\n\n' +
              'Te adjunto mi comprobante de pago 📎'
            )}`}
            target="_blank"
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-rajdhani font-bold text-sm hover:bg-green-500 transition-all">
            💬 Avisar al admin — Enviar comprobante
          </a>
        </div>
      )}

      {/* Ranking por jornada */}
      <div style={{ animation: 'fadeInUp 0.5s ease-out 0.3s both' }}>
        <h2 className="font-bebas text-2xl mb-3" style={{ color: '#ea580c' }}>
          {jornadaSeleccionada === 'general' ? '🏆 Clasificación General'
            : jornadaSeleccionada === 'lc_total' ? '🏆 Leagues Cup — Acumulado'
            : `Clasificación ${labelJornada(jornadaSeleccionada as number)}`}
        </h2>

        <div className="flex gap-2 mb-4 flex-wrap">
          {((TEMPORADA_ACTIVA === 'ligamx2026'
            ? (['lc_total', ...jornadasDisponibles] as (number | 'lc_total')[])
            : (['general', ...jornadasDisponibles] as (number | 'general')[])
          ) as (number | 'general' | 'lc_total')[]).map(j => (
            <button
              key={String(j)}
              onClick={() => setJornadaSeleccionada(j)}
              className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all active:scale-95 min-h-[36px]"
              style={{
                background: jornadaSeleccionada === j ? '#ea580c' : 'var(--bg-card)',
                color: jornadaSeleccionada === j ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${jornadaSeleccionada === j ? '#ea580c' : 'var(--border)'}`,
                fontFamily: 'var(--font-rajdhani)',
              }}
            >
              {j === 'general' ? '🏆 General' : j === 'lc_total' ? '🏆 LC Total' : labelJornada(j as number)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
          </div>
        ) : ranking.length > 0 ? (
          <>
            <RankingTable ranking={ranking} userId={userId} pendienteIds={pendienteIds.filter(id => !pagadosIds.includes(id))} jornada={jornadaSeleccionada === 'lc_total' ? 1 : jornadaSeleccionada} />
            <button
              onClick={compartirRanking}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 active:scale-95"
              style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontFamily: 'var(--font-rajdhani)' }}>
              💬 Compartir ranking en WhatsApp
            </button>
          </>
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
                      {p.quinielaNombre && (
                        <p className="text-xs" style={{ color: '#ea580c' }}>🎫 {p.quinielaNombre}</p>
                      )}
                      <p className="text-xs" style={{ color: '#10b981' }}>✅ Confirmado</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grupo WhatsApp */}
      <a
        href="https://chat.whatsapp.com/LeFSQrZwf9nARVoU7YARhD"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm hover:opacity-80 transition-all mt-3"
        style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontFamily: 'var(--font-rajdhani)' }}>
        💬 Únete al grupo de WhatsApp del torneo
      </a>
    </main>
  );
}
