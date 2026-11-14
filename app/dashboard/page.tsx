'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { RankingConJugador, Pozo } from '@/types';
import RankingTable from '@/components/RankingTable';
import DesempateTabla from '@/components/DesempateTabla';
import { JORNADA_DESEMPATE, cargarDesempateJ11, DESEMPATE_POZO_J11, cargarDesempatePozoJ11, DesempateRow } from '@/lib/desempate';
import { getNombreJornada, getMontoJornada, TEMPORADA_ACTIVA, getNombreJornadaLigaMX } from '@/lib/utils';
import { cargarJornadaActual } from '@/lib/jornadaActual';
import Link from 'next/link';
import { toast } from 'sonner';
import { BoletoFrente, BoletoReverso } from '@/components/ui/BoletoMetro';

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const INAUGURAL = new Date('2026-06-11T20:00:00Z'); // 15:00 CDMX = 20:00 UTC

const JORNADA_INICIAL = TEMPORADA_ACTIVA === 'ligamx2026' ? 11 : 1;

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
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--accent-gold)', lineHeight: 1 }}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

const estadoLabel: Record<string, string> = {
  abierto:  'ABIERTO',
  cerrado:  'CERRADO',
  pagado:   'PAGADO',
};

function PozoCard({ pozo, id }: { pozo: Pozo; id?: string }) {
  const ganoAlguien = (pozo.estado === 'cerrado' || pozo.estado === 'pagado') && pozo.ganador_nombre;
  const abierto = pozo.estado === 'abierto';
  const quinielas = `${pozo.participantes} quiniela${pozo.participantes !== 1 ? 's' : ''} pagada${pozo.participantes !== 1 ? 's' : ''}`;
  const chip = (
    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-[6px]"
      style={abierto
        ? { background: '#5B2A12', color: '#F7EFE2' }
        : pozo.estado === 'pagado' ? { background: 'var(--ex)', color: 'var(--exI)' } : { background: '#E4D8C4', color: '#3A2A1E' }}>
      {estadoLabel[pozo.estado]}
    </span>
  );
  return (
    <motion.div id={id} variants={cardVariants} whileTap={{ scale: 0.99 }}>
      {abierto ? (
        <BoletoFrente
          folio={String(pozo.total_mxn).padStart(6, "0")}
          clave={`RC-J${pozo.jornada}`}
          titulo={`QM-${pozo.jornada}`}
          sup="POZO"
          inf="2026"
          valor={`$${pozo.total_mxn}`}
          pie={quinielas}
          chip={chip}
          href={`/jornada/${pozo.jornada}`}
          accion="Ver predicciones de todos"
        />
      ) : (
        <BoletoReverso
          encabezado={`Pozo · Jornada ${pozo.jornada}`}
          chip={chip}
          linea1={ganoAlguien ? `Ganador: ${pozo.ganador_nombre} · $${pozo.total_mxn}` : `$${pozo.total_mxn}`}
          linea2={quinielas}
          href={`/jornada/${pozo.jornada}`}
          accion="Ver predicciones de todos"
        />
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
    JORNADA_INICIAL
  );
  const [participantesJornada, setParticipantesJornada] = useState<ParticipanteItem[]>([]);
  const [filasDesempate, setFilasDesempate]         = useState<DesempateRow[]>([]);
  const [cargandoDesempate, setCargandoDesempate]   = useState(false);
  const [filasEmpateJ11, setFilasEmpateJ11]         = useState<DesempateRow[]>([]);
  const [cargandoEmpateJ11, setCargandoEmpateJ11]   = useState(false);
  const { d, h, m, s, started, mounted: countdownReady } = useCountdown(INAUGURAL);

  const [campeonPick, setCampeonPick]           = useState<string | null>(null);
  const [campeonBadge, setCampeonBadge]         = useState<string | null>(null);
  const [campeonDeclarado, setCampeonDeclarado] = useState<string | null>(null);
  const [campeonLoaded, setCampeonLoaded]       = useState(false);
  const [participacionPendiente, setParticipacionPendiente] = useState<{id: string, pagado: boolean, jornada: number, quiniela_extra_id: string | null, quiniela: {nombre: string} | null} | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const cargaId = useRef(0);

  const cargarRanking = useCallback(async () => {
    const miCarga = ++cargaId.current;
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

      if (miCarga !== cargaId.current) return;
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
      if (miCarga !== cargaId.current) return;
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

      if (miCarga !== cargaId.current) return;
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

    // J4+J5 son la misma quiniela; J6+J7 también (LC Cuartos+Semis)
    const jornadasJ = TEMPORADA_ACTIVA === 'ligamx2026' && j === 5 ? [4, 5]
      : TEMPORADA_ACTIVA === 'ligamx2026' && j === 7 ? [6, 7]
      : [j];
    const { data: partsRaw, error: errorPart } = await supabase
      .from('quiniela_participaciones')
      .select('id, user_id, jornada, pagado, publicado, quiniela_extra_id')
      .in('jornada', jornadasJ)
      .eq('pagado', true)
      .eq('temporada', TEMPORADA_ACTIVA)
      .order('created_at', { ascending: true });
    // Deduplicar: un usuario puede tener participacion en J4 y J5 — conservar la de menor jornada
    let parts: typeof partsRaw = partsRaw;
    if (TEMPORADA_ACTIVA === 'ligamx2026' && (j === 5 || j === 7) && partsRaw) {
      const seen = new Map<string, any>();
      for (const p of partsRaw) {
        const key = `${(p as any).user_id}:${(p as any).quiniela_extra_id ?? 'null'}`;
        if (!seen.has(key) || seen.get(key).jornada > (p as any).jornada) seen.set(key, p);
      }
      parts = [...seen.values()] as typeof partsRaw;
    }
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
      .in('jornada', jornadasJ)
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

    if (miCarga !== cargaId.current) return;
    setParticipantesJornada(participantesConNombre);

    // user_ids únicos para el badge y para la query de puntos
    const allUserIds = [...new Set(pagadosEntries.map(p => p.user_id))];
    setPagadosIds(allUserIds);

    const rankBaseQuery = allUserIds.length
      ? supabase
          .from('quiniela_predicciones')
          .select(`
            user_id,
            quiniela_extra_id,
            puntos_ganados,
            partido:quiniela_partidos!inner(estado, jornada, temporada)
          `)
          .eq('partido.estado', 'finalizado')
          .eq('partido.temporada', TEMPORADA_ACTIVA)
          .in('user_id', allUserIds)
      : null;
    const { data: rankingData } = rankBaseQuery
      ? await (TEMPORADA_ACTIVA === 'ligamx2026' && j === 5
          ? rankBaseQuery.in('partido.jornada', [4, 5])
          : TEMPORADA_ACTIVA === 'ligamx2026' && j === 7
          ? rankBaseQuery.in('partido.jornada', [6, 7])
          : rankBaseQuery.eq('partido.jornada', j))
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

    if (miCarga !== cargaId.current) return;
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

  // ── Desempate de la jornada 11: puntos de los 4 jugadores ──
  const cargarDesempate = useCallback(async () => {
    setCargandoDesempate(true);
    setFilasDesempate(await cargarDesempateJ11());
    setCargandoDesempate(false);
  }, []);

  useEffect(() => {
    if (jornadaSeleccionada !== JORNADA_DESEMPATE) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDesempate();
  }, [jornadaSeleccionada, cargarDesempate]);

  // ── Desempate del pozo de la jornada 11 entre los empatados, con puntos de la jornada 12 ──
  useEffect(() => {
    if (TEMPORADA_ACTIVA !== 'ligamx2026' || jornadaSeleccionada !== DESEMPATE_POZO_J11.jornadaPuntos) return;
    let activo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargandoEmpateJ11(true);
    cargarDesempatePozoJ11()
      .then(filas => { if (activo) setFilasEmpateJ11(filas); })
      .catch(() => { if (activo) setFilasEmpateJ11([]); })
      .finally(() => { if (activo) setCargandoEmpateJ11(false); });
    return () => { activo = false; };
  }, [jornadaSeleccionada]);

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

  const jornadaAutoElegida = useRef(false);
  useEffect(() => {
    if (TEMPORADA_ACTIVA !== 'ligamx2026' || jornadaAutoElegida.current || pozos.length === 0) return;
    jornadaAutoElegida.current = true;
    const jornadasConPozoAuto = pozos.map(p => p.jornada);
    const masAltaConPozo = Math.max(...jornadasConPozoAuto);
    // Jornada actual (la más baja con partidos pendientes); si la consulta falla, la más alta con pozo.
    // No pisa la jornada si el usuario ya eligió otra mientras se consultaba.
    cargarJornadaActual(jornadasConPozoAuto)
      .catch(() => null)
      .then(actual => {
        const elegida = actual ?? masAltaConPozo;
        setJornadaSeleccionada(prev => (prev === JORNADA_INICIAL ? elegida : prev));
      });
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

  // Solo mostrar pozos con participantes reales (oculta jornadas futuras vacías).
  // En ligamx2026 el pozo abierto de la jornada más reciente se muestra aunque aún esté vacío.
  const jornadaMasReciente = TEMPORADA_ACTIVA === 'ligamx2026' && pozosCompletos.length > 0
    ? Math.max(...pozosCompletos.map(p => p.jornada))
    : null;
  const mostrarPozo = (p: Pozo) =>
    p.participantes > 0 || (p.jornada === jornadaMasReciente && p.estado === 'abierto');
  const pozosVisibles = pozosCompletos.filter(mostrarPozo);

  const jornadasDisponibles = TEMPORADA_ACTIVA === 'ligamx2026'
    ? [...new Set(pozosVisibles.map(p => p.jornada))]
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
      style={{ paddingTop: 'max(20px, calc(env(safe-area-inset-top) + 12px))' }}
    >
      {/* Header */}
      <header className="flex items-start gap-3">
        {typeof jornadaSeleccionada === 'number' && (
          <span className="flex items-center justify-center shrink-0 rounded-[10px] font-display"
            style={{ width: 44, height: 44, background: 'var(--br)', color: 'var(--brI)', fontSize: 26, lineHeight: 1 }}>
            {jornadaSeleccionada}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-display" style={{ fontSize: 32, lineHeight: 1, color: 'var(--ink)' }}>
            {typeof jornadaSeleccionada === 'number' ? `Jornada ${jornadaSeleccionada}` : 'Ranking'}
          </h1>
          <p className="text-[14px] font-medium mt-0.5" style={{ color: 'var(--mut)' }}>
            Liga MX Apertura 2026 · Quiniela Metro
          </p>
        </div>
      </header>

      {/* Countdown */}
      {TEMPORADA_ACTIVA !== 'ligamx2026' && (
      <div
        className="rounded-2xl px-4 py-4 text-center space-y-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'fadeInUp 0.5s ease-out 0.1s both' }}
      >
        {!countdownReady ? (
          <div className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
        ) : started ? (
          <p className="font-bold text-sm" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-sans)' }}>
            🎉 ¡El Mundial ha comenzado!
          </p>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Partido inaugural · 11 jun · 15:00 CDMX
            </p>
            <div className="flex items-start justify-center gap-4">
              <CountdownUnit value={d} label="días" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--border)', lineHeight: '2.5rem' }}>:</span>
              <CountdownUnit value={h} label="horas" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--border)', lineHeight: '2.5rem' }}>:</span>
              <CountdownUnit value={m} label="min" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--border)', lineHeight: '2.5rem' }}>:</span>
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
            <p className="text-sm font-bold" style={{ color: 'var(--rs)', fontFamily: 'var(--font-sans)' }}>
              🏆 ¡Acertaste el Campeón! — {campeonDeclarado}
            </p>
          )}
          {campeonDeclarado && campeonPick && campeonPick !== campeonDeclarado && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🏆 Campeón: <strong style={{ color: 'var(--rs)' }}>{campeonDeclarado}</strong> · Tu pick: {campeonPick} ❌
            </p>
          )}
          {campeonDeclarado && !campeonPick && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🏆 Campeón mundial: <strong style={{ color: 'var(--rs)' }}>{campeonDeclarado}</strong>
            </p>
          )}
          {!campeonDeclarado && Date.now() >= INAUGURAL.getTime() && campeonPick && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🔒 Tu campeón: <strong style={{ color: 'var(--rs)' }}>{campeonPick}</strong>
            </p>
          )}
          {!campeonDeclarado && Date.now() < INAUGURAL.getTime() && !campeonPick && (
            <Link href="/predicciones" className="text-sm font-semibold hover:opacity-80"
              style={{ color: 'var(--br)', fontFamily: 'var(--font-sans)' }}>
              🏆 ¿Ya elegiste tu campeón? → Ir a Predicciones
            </Link>
          )}
          {!campeonDeclarado && Date.now() < INAUGURAL.getTime() && campeonPick && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🏆 Tu campeón: <strong style={{ color: 'var(--rs)' }}>{campeonPick}</strong>
            </p>
          )}
        </div>
      )}

      {/* Pozos por jornada */}
      {pozosVisibles.length > 0 && (
        <motion.div className="space-y-3" initial="hidden" animate="visible" variants={staggerContainer}>
          <p className="senal" style={{ color: 'var(--mut)' }}>
            Pozos acumulados
          </p>
          {pozosVisibles.map(pozo => (
            <PozoCard key={pozo.id} pozo={pozo} id={pozo.jornada === 6 ? 'pozo-j6' : undefined} />
          ))}
        </motion.div>
      )}

      {/* Solo visible para el usuario actual si tiene pago pendiente */}
      {participacionPendiente && (
        <div className="rounded-[20px] overflow-hidden" style={{ background: 'color-mix(in srgb, var(--rs) 16%, var(--sf))', border: '2px solid var(--rs)', animation: 'fadeInUp 0.5s ease-out 0.28s both' }}>
          <div className="flex items-start gap-3 p-4">
            <span className="flex items-center justify-center rounded-[10px] shrink-0" style={{ width: 40, height: 40, background: 'var(--rs)', color: '#2B1D00' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[17px] leading-tight" style={{ color: 'var(--ink)' }}>
                Te falta pagar la J{participacionPendiente.jornada}
                {participacionPendiente?.quiniela?.nombre && <span className="font-semibold" style={{ color: 'var(--br)' }}> · {participacionPendiente.quiniela.nombre}</span>}
              </h3>
              <p className="text-[14px] leading-snug mt-0.5" style={{ color: 'var(--ink2)' }}>
                Tu quiniela entra al pozo cuando José confirme tu pago.
              </p>
            </div>
            <span className="font-display shrink-0" style={{ fontSize: 30, lineHeight: 1, color: 'var(--ink)' }}>
              ${getMontoJornada(participacionPendiente.jornada)}
            </span>
          </div>
          <div className="mx-4 mb-3 rounded-[12px] px-3 text-[14px]" style={{ background: 'var(--sf)', border: '1px solid var(--ln)' }}>
            <div className="flex justify-between py-2.5" style={{ borderBottom: '1px dashed var(--ln)' }}>
              <span style={{ color: 'var(--mut)' }}>Banco</span><span className="font-semibold" style={{ color: 'var(--ink)' }}>Santander</span>
            </div>
            <div className="flex justify-between py-2.5" style={{ borderBottom: '1px dashed var(--ln)' }}>
              <span style={{ color: 'var(--mut)' }}>Titular</span><span className="font-semibold" style={{ color: 'var(--ink)' }}>Jose Luis Gonzalez Perez</span>
            </div>
            <div className="flex items-center justify-between gap-2 py-2.5">
              <div>
                <p className="text-[13px]" style={{ color: 'var(--mut)' }}>CLABE</p>
                <p className="font-bold tabular-nums tracking-wide" style={{ color: 'var(--ink)' }}>014180565546539842</p>
              </div>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText('014180565546539842').then(() => toast.success('CLABE copiada')).catch(() => {}); }}
                className="rounded-[10px] px-3 text-[14px] font-semibold"
                style={{ minHeight: 44, border: '1px solid var(--ln)', color: 'var(--ink)', background: 'var(--sf)' }}>
                Copiar
              </button>
            </div>
          </div>
          <div className="px-4 pb-4">
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
            className="w-full flex items-center justify-center gap-2 rounded-[12px] font-bold text-[16px] active:scale-[0.98] transition-transform"
            style={{ minHeight: 52, background: 'var(--wa)', color: '#fff' }}>
            Enviar comprobante por WhatsApp
          </a>
          </div>
        </div>
      )}

      {/* Ranking por jornada */}
      <div style={{ animation: 'fadeInUp 0.5s ease-out 0.3s both' }}>
        <h2 className="font-display text-[22px] mb-3" style={{ color: 'var(--ink)' }}>
          {jornadaSeleccionada === 'general' ? 'Clasificación general'
            : jornadaSeleccionada === 'lc_total' ? 'Leagues Cup — Acumulado'
            : `Clasificación ${labelJornada(jornadaSeleccionada as number)}`}
        </h2>

        <div className="flex gap-2 mb-4 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
          {((TEMPORADA_ACTIVA === 'ligamx2026'
            ? (['lc_total', ...jornadasDisponibles] as (number | 'lc_total')[])
            : (['general', ...jornadasDisponibles] as (number | 'general')[])
          ) as (number | 'general' | 'lc_total')[]).map(j => (
            <button
              key={String(j)}
              onClick={() => setJornadaSeleccionada(j)}
              className="px-4 rounded-full text-[14px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 min-h-[44px]"
              style={{
                background: jornadaSeleccionada === j ? 'var(--ink)' : 'var(--sf)',
                color: jornadaSeleccionada === j ? 'var(--bg)' : 'var(--ink2)',
                border: `1px solid ${jornadaSeleccionada === j ? 'var(--ink)' : 'var(--ln)'}`,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {j === 'general' ? 'General' : j === 'lc_total' ? 'LC Total' : labelJornada(j as number)}
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
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-[12px] text-[16px] font-bold transition-transform active:scale-[0.98]"
              style={{ minHeight: 52, background: 'var(--wa)', color: '#fff', fontFamily: 'var(--font-sans)' }}>
              Compartir ranking en WhatsApp
            </button>
          </>
        ) : (
          <div>
            <p className="text-sm text-center mb-4" style={{ color: 'var(--mut)' }}>
              ⏳ El ranking se actualizará cuando inicien los partidos
            </p>
            {participantesJornada.length === 0 ? (
              <p className="text-sm text-center" style={{ color: 'var(--mut)' }}>
                Aún no hay participantes en esta jornada
              </p>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {participantesJornada.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? '1px solid var(--ln)' : undefined }}
                  >
                    <span className="text-sm w-6 text-center" style={{ color: 'var(--mut)' }}>{i + 1}</span>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'var(--sf)', border: '2px solid var(--ink)', color: 'var(--ink)' }}
                    >
                      {iniParticipante(p.jugador)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                        {nomParticipante(p.jugador)}
                      </p>
                      {p.quinielaNombre && (
                        <p className="text-xs" style={{ color: 'var(--br)' }}>🎫 {p.quinielaNombre}</p>
                      )}
                      <p className="text-xs" style={{ color: 'var(--ex)' }}>✅ Confirmado</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desempate jornada 11 — solo los 4 jugadores (TOKEN, J. Manuel, ALV, JLG) */}
      {jornadaSeleccionada === JORNADA_DESEMPATE && (
        <div style={{ animation: 'fadeInUp 0.5s ease-out 0.35s both' }}>
          <DesempateTabla filas={filasDesempate} cargando={cargandoDesempate} />
        </div>
      )}

      {/* Desempate del pozo de la jornada 11: solo entre los empatados, con puntos de la jornada 12 */}
      {TEMPORADA_ACTIVA === 'ligamx2026' && jornadaSeleccionada === DESEMPATE_POZO_J11.jornadaPuntos
        && (cargandoEmpateJ11 || filasEmpateJ11.length > 0) && (
        <div style={{ animation: 'fadeInUp 0.5s ease-out 0.35s both' }}>
          <DesempateTabla
            filas={filasEmpateJ11}
            cargando={cargandoEmpateJ11}
            dinamico
            subtitulo={`${labelJornada(DESEMPATE_POZO_J11.jornadaPozo)} · empatados en el primer lugar · puntos de la jornada ${DESEMPATE_POZO_J11.jornadaPuntos}`}
          />
        </div>
      )}

      {/* Grupo WhatsApp */}
      <a
        href="https://chat.whatsapp.com/LeFSQrZwf9nARVoU7YARhD"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm hover:opacity-80 transition-all mt-3"
        style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid color-mix(in srgb, var(--ex) 30%, transparent)', color: 'var(--ex)', fontFamily: 'var(--font-sans)' }}>
        💬 Únete al grupo de WhatsApp del torneo
      </a>
    </main>
  );
}
