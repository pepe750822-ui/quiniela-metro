'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Partido, Prediccion, DraftPrediccion, Pozo } from '@/types';
import { getNombreJornada, getFechaKey, equiposE32, BANDERAS_EQUIPOS, getMontoJornada, TEMPORADA_ACTIVA, getNombreJornadaLigaMX, LOGOS_LIGAMX } from '@/lib/utils';
import { Bandera } from '@/components/Bandera';
import PartidoCard from '@/components/PartidoCard';
import PrediccionForm from '@/components/PrediccionForm';
import ReglasFaseFinal from '@/components/ReglasFaseFinal';
import { toast } from 'sonner';


const DEADLINE_J1 = new Date('2026-06-11T05:59:00Z');
const DEADLINE_J2 = new Date('2026-06-18T16:00:00Z');
const DEADLINE_J3 = new Date('2026-06-24T19:00:00Z');
const DEADLINE_J4 = new Date('2026-06-28T19:00:00Z');
const DEADLINE_J5 = new Date('2026-07-04T17:00:00Z');
const DEADLINE_J6      = new Date('2026-07-09T19:00:00Z');
const DEADLINE_SEMIS   = new Date('2026-07-14T19:00:00Z');
const DEADLINE_TERCERO = new Date('2026-07-18T21:00:00Z');
const DEADLINE_FINAL   = new Date('2026-07-18T21:00:00Z'); // 18 jul 15:00 CDMX — mismo que DEADLINE_TERCERO
const DEADLINE_J7 = new Date('2026-07-14T19:00:00Z');
const DEADLINE_J8 = new Date('2026-07-18T21:00:00Z');
const DEADLINE_J9 = new Date('2026-07-19T19:00:00Z');
// Liga MX Apertura 2026 — deadline antes del primer partido de cada fecha (UTC-5 CDT)
const DEADLINE_LC_F1 = new Date('2026-08-08T02:00:00Z'); // Vie 7 ago 8:00 PM CDMX — extendido
const DEADLINE_PICKS_CLASIFICACION = new Date('2026-08-08T05:59:00Z'); // Vie 7 ago 11:59 PM CDMX
const DEADLINE_LC_F2 = new Date('2026-08-08T02:00:00Z'); // Vie 7 ago 8:00 PM CDMX — extendido
const DEADLINE_LC_F3  = new Date('2026-08-15T06:00:00Z'); // placeholder — J3 usa bloqueo por partido
const DEADLINE_LMX_J4 = new Date('2026-08-15T23:00:00Z'); // Sáb 15 ago 18:00 CDMX — primer partido J4
const DEADLINE_LMX_J5 = new Date('2026-08-22T01:00:00Z'); // Vie 21 ago 20:00 CDMX — primer partido J5

const labelJornada = (j: number) =>
  TEMPORADA_ACTIVA === 'ligamx2026' ? getNombreJornadaLigaMX(j) : getNombreJornada(j);

const getDeadline = (jornada: number) => {
  if (TEMPORADA_ACTIVA === 'ligamx2026') {
    if (jornada === 1) return DEADLINE_LC_F1;
    if (jornada === 2) return DEADLINE_LC_F2;
    if (jornada === 3) return DEADLINE_LC_F3;
    if (jornada === 4) return DEADLINE_LMX_J4;
    if (jornada === 5) return DEADLINE_LMX_J5;
  }
  if (jornada === 1) return DEADLINE_J1;
  if (jornada === 2) return DEADLINE_J2;
  if (jornada === 3) return DEADLINE_J3;
  if (jornada === 4) return DEADLINE_J4;
  if (jornada === 5) return DEADLINE_J5;
  if (jornada === 6) return DEADLINE_J6;
  if (jornada === 7) return DEADLINE_J7;
  if (jornada === 8) return DEADLINE_J8;
  return DEADLINE_J9;
};

// ── Mini bracket Fase Final (J6–J9) ───────────────────────────────────────
function MiniBracket({ partidos, visible, onPredicir }: { partidos: Partido[]; visible: boolean; onPredicir?: (p: Partido) => void }) {
  const j6 = partidos.filter(p => p.jornada === 6);
  const j7 = partidos.filter(p => p.jornada === 7);
  const j8 = partidos.filter(p => p.jornada === 8);
  const j9 = partidos.filter(p => p.jornada === 9);

  const CARD_W = 126;
  const CARD_H = 48;
  const SLOT_H = 56;
  const BH = 4 * SLOT_H;
  const CONN_W = 24;

  const itemCenter = (idx: number) => (idx + 0.5) * SLOT_H;

  const teamName = (p: Partido, local: boolean) => {
    const name = local ? p.equipo_local : p.equipo_visitante;
    if (name && name !== 'A definir') return name;
    const fk = getFechaKey(p.fecha_hora);
    const eq = equiposE32[fk];
    if (!eq) return 'A definir';
    return local ? (eq.local || 'A definir') : (eq.visitante || 'A definir');
  };
  const getBandera = (p: Partido, local: boolean) => {
    const name = teamName(p, local);
    const b = local ? p.bandera_local : p.bandera_visitante;
    return BANDERAS_EQUIPOS[name] ?? b ?? '';
  };

  const isDef = (s: string) => !s || s === 'A definir';

  function TeamRow({ nombre, bandera, goles, winner }: {
    nombre: string; bandera: string; goles: number | null; winner: boolean;
  }) {
    return (
      <div className="flex items-center justify-between px-2 py-1 gap-1"
        style={{ background: winner ? 'rgba(234,88,12,0.14)' : 'transparent', height: 24 }}>
        <div className="flex items-center gap-1.5 min-w-0">
          {bandera && !isDef(nombre) && <Bandera emoji={bandera} nombre={nombre} size="sm" />}
          <span className="text-[10px] truncate leading-tight" style={{
            fontFamily: 'var(--font-rajdhani)',
            fontWeight: winner ? 700 : 400,
            color: isDef(nombre) ? '#475569' : winner ? '#fb923c' : 'var(--text-primary)',
          }}>
            {isDef(nombre) ? '???' : nombre}
          </span>
        </div>
        {goles !== null && (
          <span className="text-xs shrink-0" style={{
            fontFamily: 'var(--font-bebas)',
            color: winner ? '#fb923c' : 'var(--text-secondary)',
          }}>{goles}</span>
        )}
      </div>
    );
  }

  function MatchCard({ p, onClick }: { p: Partido; onClick?: () => void }) {
    const local = teamName(p, true);
    const visit = teamName(p, false);
    const bL = getBandera(p, true);
    const bV = getBandera(p, false);
    const fin = p.estado === 'finalizado';
    const vivo = p.estado === 'en_curso';
    const gl = p.goles_local ?? 0;
    const gv = p.goles_visitante ?? 0;
    const wL = fin && gl > gv;
    const wV = fin && gv > gl;

    return (
      <div onClick={onClick} style={{
        width: CARD_W,
        background: 'var(--bg-surface)',
        border: `1px solid ${vivo ? 'rgba(234,88,12,0.6)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'opacity 0.15s',
      }}
        onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
        onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      >
        <TeamRow nombre={local} bandera={bL} goles={fin || vivo ? gl : null} winner={wL} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
        <TeamRow nombre={visit} bandera={bV} goles={fin || vivo ? gv : null} winner={wV} />
      </div>
    );
  }

  function ConnectorCuaToSemi() {
    const h = CONN_W / 2;
    return (
      <svg width={CONN_W} height={BH} style={{ display: 'block', flexShrink: 0 }}>
        <path d={`M0,28 H${h} V56 H${CONN_W}`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
        <path d={`M0,84 H${h} V56 H${CONN_W}`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
        <path d={`M0,140 H${h} V168 H${CONN_W}`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
        <path d={`M0,196 H${h} V168 H${CONN_W}`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
      </svg>
    );
  }

  function ConnectorSemiToFinal() {
    const h = CONN_W / 2;
    return (
      <svg width={CONN_W} height={BH} style={{ display: 'block', flexShrink: 0 }}>
        <path d={`M0,56 H${h} V112 H${CONN_W}`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
        <path d={`M0,168 H${h} V112 H${CONN_W}`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
      </svg>
    );
  }

  function slot(...items: (Partido | null)[]) {
    const r: (Partido | null)[] = [];
    for (const x of items) r.push(x);
    while (r.length < 4) r.push(null);
    return r;
  }

  function emptySlot(key: string, top: number) {
    return (
      <div key={key} style={{
        position: 'absolute', top: top - CARD_H / 2, left: 0,
        width: CARD_W, height: CARD_H,
        border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-rajdhani)' }}>—</span>
      </div>
    );
  }

  if (!visible) return null;

  const allEmpty = j6.length === 0 && j7.length === 0 && j8.length === 0 && j9.length === 0;
  const cuaSlots = slot(j6[0], j6[1], j6[2], j6[3]);
  const semiSlots = [j7[0] ?? null, j7[1] ?? null];
  const finalCard = j9[0] ?? null;
  const tercerCard = j8[0] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-3 overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
        🏆 Fase Final
      </p>

      {allEmpty ? (
        <p style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 11, color: '#475569', textAlign: 'center', padding: '12px 0' }}>
          Cargando bracket...
        </p>
      ) : (
        <>
          <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
              <div style={{ width: CARD_W, height: BH, position: 'relative', flexShrink: 0 }}>
                <p className="text-[8px] font-bold uppercase tracking-wider text-center" style={{ color: '#64748b', paddingBottom: 4 }}>Cuartos</p>
                {cuaSlots.map((p, i) =>
                  p ? (
                    <div key={p.id} style={{ position: 'absolute', top: itemCenter(i) - CARD_H / 2, left: 0 }}>
                      <MatchCard p={p} onClick={onPredicir ? () => onPredicir(p) : undefined} />
                    </div>
                  ) : emptySlot(`cua-${i}`, itemCenter(i))
                )}
              </div>
              <ConnectorCuaToSemi />
              <div style={{ width: CARD_W, height: BH, position: 'relative', flexShrink: 0 }}>
                <p className="text-[8px] font-bold uppercase tracking-wider text-center" style={{ color: '#64748b', paddingBottom: 4 }}>Semifinales</p>
                {semiSlots.map((p, i) => {
                  const y = (i * 2 + 1) * SLOT_H;
                  return p ? (
                    <div key={p.id} style={{ position: 'absolute', top: y - CARD_H / 2, left: 0 }}>
                      <MatchCard p={p} onClick={onPredicir ? () => onPredicir(p) : undefined} />
                    </div>
                  ) : emptySlot(`semi-${i}`, y);
                })}
              </div>
              <ConnectorSemiToFinal />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: BH, flexShrink: 0 }}>
                <p className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: '#ea580c' }}>🏆 Final</p>
                {finalCard ? (
                  <MatchCard p={finalCard} onClick={onPredicir ? () => onPredicir(finalCard) : undefined} />
                ) : (
                  <div style={{ width: CARD_W, height: CARD_H, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-rajdhani)' }}>—</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 48, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="text-[8px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#64748b' }}>🥉 3er Lugar</span>
              {tercerCard ? (
                <MatchCard p={tercerCard} onClick={onPredicir ? () => onPredicir(tercerCard) : undefined} />
              ) : (
                <div style={{ width: CARD_W, height: CARD_H, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-rajdhani)' }}>—</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── Stagger variants ───────────────────────────────────────────────────────
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 26, stiffness: 220 } },
};

const EXPO_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: EXPO_OUT, delay },
});

// ── Pill button ────────────────────────────────────────────────────────────
function Pill({
  active, onClick, children, faded,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; faded?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer"
      style={{
        background: active
          ? 'linear-gradient(135deg, #ea580c, #f97316)'
          : 'rgba(255,255,255,0.05)',
        color: active ? '#fff' : faded ? '#475569' : 'var(--text-secondary)',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'var(--font-rajdhani)',
        boxShadow: active ? '0 2px 14px rgba(234,88,12,0.25)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </motion.button>
  );
}

export default function PrediccionesPage() {
  const router = useRouter();
  const [userId, setUserId]               = useState<string | null>(null);
  const [partidos, setPartidos]           = useState<Partido[]>([]);
  const [predicciones, setPredicciones]   = useState<Record<string, Prediccion>>({});
  const [partidoActivo, setPartidoActivo] = useState<Partido | null>(null);
  const [loading, setLoading]             = useState(true);
  const [jornada, setJornada]             = useState(() => {
    if (TEMPORADA_ACTIVA === 'ligamx2026') {
      if (new Date() > DEADLINE_LMX_J5) return 5;
      if (new Date() > DEADLINE_LMX_J4) return 4;
      if (new Date() > new Date('2026-08-14T06:00:00Z')) return 4;
      if (new Date() > DEADLINE_LC_F2)  return 3;
      if (new Date() > DEADLINE_LC_F1)  return 2;
      return 1;
    }
    return 1;
  });
  const [jornadas, setJornadas]           = useState<number[]>([]);
  const [pozo, setPozo]                   = useState<Pozo | null>(null);
  const [participando, setParticipando]   = useState<boolean | null>(null);
  const [publicado, setPublicado]         = useState<boolean>(false);
  const [publicando, setPublicando]       = useState<boolean>(false);

  const [prediccionesBorrador, setPrediccionesBorrador] = useState<Record<string, DraftPrediccion>>({});

  const [campeonEquipos, setCampeonEquipos]     = useState<string[]>([]);
  const [miCampeonPick, setMiCampeonPick]       = useState<string | null>(null);
  const [campeonPickTemp, setCampeonPickTemp]   = useState<string | null>(null);
  const [campeonGuardando, setCampeonGuardando] = useState(false);
  const [campeonStats, setCampeonStats]         = useState<{ equipo: string; total: number }[]>([]);
  const [campeonDeclarado, setCampeonDeclarado] = useState<string | null>(null);
  const [todosMisPicksCampeon, setTodosMisPicksCampeon] = useState<{ quiniela_extra_id: string | null; equipo: string }[]>([]);

  const [j6Equipos, setJ6Equipos]     = useState<string[]>([]);
  const [j6Pick, setJ6Pick]           = useState<string | null>(null);
  const [j6PickTemp, setJ6PickTemp]   = useState<string | null>(null);
  const [j6Guardando, setJ6Guardando] = useState(false);

  const [bracketVisible, setBracketVisible] = useState(false);
  const [bracketPartidos, setBracketPartidos] = useState<Partido[]>([]);

  // ── Picks clasificación Leagues Cup ────────────────────────────────────────
  const [picksLigamx, setPicksLigamx] = useState<string[]>([]);
  const [picksMls, setPicksMls]       = useState<string[]>([]);
  const [picksGuardando, setPicksGuardando] = useState(false);

  useEffect(() => {
    if (jornada === 6) setBracketVisible(true);
  }, [jornada]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quinielasExtra, setQuinielasExtra]             = useState<any[]>([]);
  const [quinielaSeleccionada, setQuinielaSeleccionada] = useState<string | null>(null);
  const [showNuevaQuiniela, setShowNuevaQuiniela]       = useState(false);
  const [nombreNuevaQuiniela, setNombreNuevaQuiniela]   = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
    });

    supabase
      .from('quiniela_partidos')
      .select('jornada')
      .eq('temporada', TEMPORADA_ACTIVA)
      .order('jornada')
      .then(({ data }) => {
        const unicas = [...new Set((data ?? []).map((p: { jornada: number }) => p.jornada))];
        setJornadas(unicas);
      });
  }, [router]);

  const cargarQuinielas = useCallback(async (uid: string, j: number) => {
    const [{ data: extras }, { data: partics }] = await Promise.all([
      supabase.from('quiniela_extra').select('*').eq('user_id', uid).eq('activa', true).order('created_at'),
      supabase.from('quiniela_participaciones').select('quiniela_extra_id').eq('user_id', uid).eq('jornada', j).not('quiniela_extra_id', 'is', null),
    ]);
    const idsConParticipacion = new Set((partics || []).map((p: any) => p.quiniela_extra_id));
    let filtradas = (extras || []).filter((q: any) => idsConParticipacion.has(q.id));

    if (TEMPORADA_ACTIVA === 'ligamx2026' && filtradas.length > 0) {
      const qeIds = filtradas.map((q: any) => q.id);
      const { data: allPreds } = await supabase
        .from('quiniela_predicciones')
        .select('quiniela_extra_id, partido:quiniela_partidos!inner(temporada)')
        .eq('user_id', uid)
        .in('quiniela_extra_id', qeIds);
      const hasLigamxPreds = new Set<string>();
      const hasAnyPreds = new Set<string>();
      (allPreds ?? []).forEach((p: any) => {
        if (p.quiniela_extra_id) {
          hasAnyPreds.add(p.quiniela_extra_id);
          if (p.partido?.temporada === TEMPORADA_ACTIVA) hasLigamxPreds.add(p.quiniela_extra_id);
        }
      });
      filtradas = filtradas.filter((q: any) =>
        hasLigamxPreds.has(q.id) || !hasAnyPreds.has(q.id)
      );
    }

    setQuinielasExtra(filtradas);
    setQuinielaSeleccionada(prev => (prev && !filtradas.find((q: any) => q.id === prev) ? null : prev));
  }, []);

  const cargarPozoYParticipacion = useCallback(async (uid: string, j: number) => {
    // J4 es la base de la quiniela Liga MX (cubre J4 y J5), igual que J1 fue la base de Leagues Cup
    const baseJornada = TEMPORADA_ACTIVA === 'ligamx2026' && j === 5 ? 4 : j;

    const basePartQuery = supabase
      .from('quiniela_participaciones')
      .select('pagado, publicado')
      .eq('user_id', uid)
      .eq('jornada', baseJornada)
      .eq('temporada', TEMPORADA_ACTIVA);

    const partPromise = quinielaSeleccionada === null
      ? basePartQuery.is('quiniela_extra_id', null).maybeSingle()
      : basePartQuery.eq('quiniela_extra_id', quinielaSeleccionada).maybeSingle();

    const [{ data: pz }, { data: part }] = await Promise.all([
      supabase.from('quiniela_pozo').select('*').eq('jornada', baseJornada).eq('temporada', TEMPORADA_ACTIVA).maybeSingle(),
      partPromise,
    ]);
    setPozo(pz as Pozo ?? null);
    setPublicado(part?.publicado ?? false);

    // Liga MX 2026: pago de J1 cubre Leagues Cup (J2, J3); J4 cubre Liga MX (J4, J5)
    if (TEMPORADA_ACTIVA === 'ligamx2026' && j >= 2 && j <= 3 && !part?.pagado) {
      const { data: partJ1 } = await supabase
        .from('quiniela_participaciones')
        .select('pagado')
        .eq('user_id', uid)
        .eq('jornada', 1)
        .eq('temporada', TEMPORADA_ACTIVA)
        .is('quiniela_extra_id', null)
        .maybeSingle();
      setParticipando(partJ1?.pagado === true ? true : part?.pagado ?? null);
    } else {
      setParticipando(part?.pagado ?? null);
    }

    if (!part) {
      await supabase
        .from('quiniela_participaciones')
        .insert({
          user_id:           uid,
          jornada:           baseJornada,
          pagado:            false,
          publicado:         false,
          quiniela_extra_id: quinielaSeleccionada ?? null,
          temporada:         TEMPORADA_ACTIVA,
        });
      setParticipando(false);
    }
  }, [quinielaSeleccionada]);

  const cargarPartidos = useCallback(async () => {
    let query = supabase
      .from('quiniela_partidos')
      .select('*')
      .eq('temporada', TEMPORADA_ACTIVA)
      .eq('jornada', jornada);
    if (TEMPORADA_ACTIVA === 'ligamx2026' && jornada === 1) {
      query = query.lt('fecha_hora', '2026-08-07T23:00:00Z');
    }
    const { data } = await query.order('fecha_hora');
    setPartidos((data as Partido[]) ?? []);
  }, [jornada]);

  const cargarPredicciones = useCallback(async () => {
    if (!userId) return;
    const baseQuery = supabase
      .from('quiniela_predicciones')
      .select('*')
      .eq('user_id', userId);

    const { data } = await (quinielaSeleccionada === null
      ? baseQuery.is('quiniela_extra_id', null)
      : baseQuery.eq('quiniela_extra_id', quinielaSeleccionada));

    const map: Record<string, Prediccion> = {};
    (data as Prediccion[] ?? []).forEach(p => { map[p.partido_id] = p; });
    setPredicciones(map);
    setLoading(false);
  }, [userId, quinielaSeleccionada]);

  const cargarCampeon = useCallback(async () => {
    if (!userId) return;
    const [{ data: equiposData }, { data: pick }, { data: allPicks }, { data: final }, { data: misPicks }] = await Promise.all([
      supabase.from('quiniela_grupos').select('equipo').order('equipo'),
      (quinielaSeleccionada === null
        ? supabase.from('quiniela_prediccion_campeon').select('equipo').eq('user_id', userId).is('quiniela_extra_id', null).maybeSingle()
        : supabase.from('quiniela_prediccion_campeon').select('equipo').eq('user_id', userId).eq('quiniela_extra_id', quinielaSeleccionada).maybeSingle()),
      supabase.from('quiniela_prediccion_campeon').select('equipo'),
      supabase
        .from('quiniela_partidos')
        .select('goles_local, goles_visitante, equipo_local, equipo_visitante')
        .eq('grupo', 'FIN')
        .eq('estado', 'finalizado')
        .eq('temporada', TEMPORADA_ACTIVA)
        .maybeSingle(),
      supabase.from('quiniela_prediccion_campeon').select('quiniela_extra_id, equipo').eq('user_id', userId),
    ]);

    const allTeams = (equiposData ?? []).map((p: { equipo: string }) => p.equipo);
    setCampeonEquipos(allTeams);
    setMiCampeonPick(pick?.equipo ?? null);
    setCampeonPickTemp(pick?.equipo ?? null);
    setTodosMisPicksCampeon((misPicks ?? []) as { quiniela_extra_id: string | null; equipo: string }[]);

    if (final) {
      const ganador = (final.goles_local ?? 0) > (final.goles_visitante ?? 0)
        ? final.equipo_local
        : final.equipo_visitante;
      setCampeonDeclarado(ganador);
    }

    const statsMap: Record<string, number> = {};
    (allPicks ?? []).forEach((p: { equipo: string }) => {
      statsMap[p.equipo] = (statsMap[p.equipo] || 0) + 1;
    });
    setCampeonStats(
      Object.entries(statsMap)
        .map(([equipo, total]) => ({ equipo, total }))
        .sort((a, b) => b.total - a.total)
    );
  }, [userId, quinielaSeleccionada]);

  const cargarJ6Campeon = useCallback(async () => {
    if (!userId) return;
    const [{ data: partidos6 }, { data: pick }] = await Promise.all([
      supabase.from('quiniela_partidos').select('equipo_local, equipo_visitante').eq('jornada', 6).eq('temporada', TEMPORADA_ACTIVA).order('fecha_hora'),
      (quinielaSeleccionada === null
        ? supabase.from('quiniela_prediccion_campeon').select('equipo').eq('user_id', userId).eq('jornada', 6).is('quiniela_extra_id', null).maybeSingle()
        : supabase.from('quiniela_prediccion_campeon').select('equipo').eq('user_id', userId).eq('jornada', 6).eq('quiniela_extra_id', quinielaSeleccionada).maybeSingle()),
    ]);
    const equipos: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (partidos6 ?? []).forEach((p: any) => {
      if (p.equipo_local    && p.equipo_local    !== 'A definir') equipos.push(p.equipo_local);
      if (p.equipo_visitante && p.equipo_visitante !== 'A definir') equipos.push(p.equipo_visitante);
    });
    setJ6Equipos([...new Set(equipos)]);
    setJ6Pick(pick?.equipo ?? null);
    setJ6PickTemp(pick?.equipo ?? null);
  }, [userId, quinielaSeleccionada]);

  useEffect(() => { cargarPartidos(); }, [cargarPartidos]);
  useEffect(() => {
    if (userId) {
      cargarQuinielas(userId, jornada);
      cargarPredicciones();
      cargarCampeon();
      cargarPozoYParticipacion(userId, jornada);
      if (jornada === 6) cargarJ6Campeon();
      if (TEMPORADA_ACTIVA === 'ligamx2026' && jornada === 1) cargarPicksClasificacion(userId);
    }
  }, [userId, jornada, cargarQuinielas, cargarPredicciones, cargarCampeon, cargarPozoYParticipacion, cargarJ6Campeon]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarPicksClasificacion = async (uid: string) => {
    const { data } = await supabase
      .from('quiniela_picks_clasificacion')
      .select('liga, equipos')
      .eq('user_id', uid)
      .eq('temporada', TEMPORADA_ACTIVA);
    (data ?? []).forEach((row: { liga: string; equipos: string[] }) => {
      if (row.liga === 'ligamx') setPicksLigamx(row.equipos);
      if (row.liga === 'mls')    setPicksMls(row.equipos);
    });
  };

  const guardarPicksClasificacion = async (liga: 'ligamx' | 'mls', equipos: string[]) => {
    if (!userId || equipos.length !== 4) return;
    setPicksGuardando(true);
    await supabase
      .from('quiniela_picks_clasificacion')
      .delete()
      .eq('user_id', userId)
      .eq('temporada', TEMPORADA_ACTIVA)
      .eq('liga', liga);
    const { error } = await supabase
      .from('quiniela_picks_clasificacion')
      .insert({ user_id: userId, temporada: TEMPORADA_ACTIVA, liga, equipos });
    setPicksGuardando(false);
    if (error) { toast.error('Error al guardar picks'); return; }
    if (liga === 'ligamx') setPicksLigamx(equipos);
    if (liga === 'mls')    setPicksMls(equipos);
    toast.success('✅ Picks guardados');
  };

  useEffect(() => {
    supabase
      .from('quiniela_partidos')
      .select('*')
      .gte('jornada', 6)
      .eq('temporada', TEMPORADA_ACTIVA)
      .order('jornada')
      .order('fecha_hora')
      .then(({ data }) => setBracketPartidos((data as Partido[]) ?? []));
  }, []);

  useEffect(() => {
    if (partidos.length === 0) return;
    const primerPendiente = partidos.find(p => p.estado === 'pendiente');
    if (primerPendiente) {
      setTimeout(() => {
        const el = document.getElementById(`partido-${primerPendiente.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 800);
    }
  }, [partidos]);

  useEffect(() => {
    if (jornada !== 6) return;
    const timer = setTimeout(() => {
      const el = document.getElementById('semifinales-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1000);
    return () => clearTimeout(timer);
  }, [jornada, partidos]);

  const handleGuardado = () => {
    setPartidoActivo(null);
    cargarPredicciones();
    if (userId) cargarPozoYParticipacion(userId, jornada);
  };

  const handlePublicar = async () => {
    if (!userId) return;
    setPublicando(true);
    const baseJornadaPublicar = TEMPORADA_ACTIVA === 'ligamx2026' && jornada === 5 ? 4 : jornada;
    const baseUpdate = supabase
      .from('quiniela_participaciones')
      .update({ publicado: true })
      .eq('user_id', userId)
      .eq('jornada', baseJornadaPublicar);
    const { error } = await (quinielaSeleccionada === null
      ? baseUpdate.is('quiniela_extra_id', null)
      : baseUpdate.eq('quiniela_extra_id', quinielaSeleccionada));
    setPublicando(false);
    if (error) {
      toast.error('Error al publicar predicciones');
    } else {
      setPublicado(true);
      toast.success('📢 ¡Jornada publicada exitosamente!');
    }
  };

  const crearQuiniela = async () => {
    if (!nombreNuevaQuiniela.trim() || !userId) return;
    const { data, error } = await supabase
      .from('quiniela_extra')
      .insert({ user_id: userId, nombre: nombreNuevaQuiniela.trim() })
      .select()
      .single();
    if (!error && data) {
      await supabase
        .from('quiniela_participaciones')
        .insert({ user_id: userId, jornada, pagado: false, publicado: false, quiniela_extra_id: data.id });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setQuinielasExtra((prev: any[]) => [...prev, data]);
      setQuinielaSeleccionada(data.id);
      setNombreNuevaQuiniela('');
      setShowNuevaQuiniela(false);
      toast.success(`🎫 Quiniela "${data.nombre}" creada`);
    }
  };

  function rondaPartidos(ronda: 'cuartos' | 'semis' | 'final'): Partido[] {
    const fuente = bracketPartidos.length > 0 ? bracketPartidos : partidos;
    if (ronda === 'cuartos') return fuente.filter(p => p.jornada === 6);
    if (ronda === 'semis')   return fuente.filter(p => p.jornada === 7);
    return fuente.filter(p => p.jornada === 8 || p.jornada === 9);
  }

  function rondaPublicada(ronda: 'cuartos' | 'semis' | 'final'): boolean {
    const ps = rondaPartidos(ronda);
    return ps.length > 0 && ps.every(p => predicciones[p.id]?.publicado === true);
  }

  function rondaCompletados(ronda: 'cuartos' | 'semis' | 'final'): number {
    return rondaPartidos(ronda).filter(p =>
      prediccionesBorrador[p.id] !== undefined || predicciones[p.id] !== undefined
    ).length;
  }

  function rondaTotal(ronda: 'cuartos' | 'semis' | 'final'): number {
    return rondaPartidos(ronda).length;
  }

  const handleGuardadoBorrador = (partidoId: string, data: DraftPrediccion) => {
    setPrediccionesBorrador(prev => ({ ...prev, [partidoId]: data }));
  };

  const handleActualizar = async () => {
    if (!userId) return;
    setPublicando(true);
    const promises = Object.entries(prediccionesBorrador).map(async ([partidoId, borrador]) => {
      const predPayload = {
        goles_local_pred: borrador.goles_local_pred,
        goles_visitante_pred: borrador.goles_visitante_pred,
        clasificado_pred: borrador.clasificado_pred,
        como_termina_pred: borrador.como_termina_pred,
        publicado: true,
        updated_at: new Date().toISOString(),
      };
      const baseQ = supabase.from('quiniela_predicciones').select('id').eq('user_id', userId).eq('partido_id', partidoId);
      const { data: existing } = await (quinielaSeleccionada === null
        ? baseQ.is('quiniela_extra_id', null).maybeSingle()
        : baseQ.eq('quiniela_extra_id', quinielaSeleccionada).maybeSingle());
      if (existing) {
        await supabase.from('quiniela_predicciones').update(predPayload).eq('id', existing.id);
      } else {
        await supabase.from('quiniela_predicciones').insert({ user_id: userId, partido_id: partidoId, quiniela_extra_id: quinielaSeleccionada || null, ...predPayload });
      }
    });
    try {
      await Promise.all(promises);
      const baseJornadaAct = TEMPORADA_ACTIVA === 'ligamx2026' && jornada === 5 ? 4 : jornada;
      const baseUpdate = supabase.from('quiniela_participaciones').update({ publicado: true }).eq('user_id', userId).eq('jornada', baseJornadaAct);
      await (quinielaSeleccionada === null ? baseUpdate.is('quiniela_extra_id', null) : baseUpdate.eq('quiniela_extra_id', quinielaSeleccionada));
      setPrediccionesBorrador({});
      setPublicado(true);
      await cargarPredicciones();
      toast.success('🔄 ¡Predicciones actualizadas!');
    } catch {
      toast.error('Error al actualizar predicciones');
    }
    setPublicando(false);
  };

  const handlePublicarRonda = async (ronda: 'cuartos' | 'semis' | 'final') => {
    if (!userId) return;
    const rondaLabel = ronda === 'cuartos' ? 'Cuartos' : ronda === 'semis' ? 'Semifinales' : 'Final';
    setPublicando(true);
    const promises = rondaPartidos(ronda).map(async (p) => {
      const borrador = prediccionesBorrador[p.id];
      if (!borrador) return;
      const predPayload = {
        goles_local_pred: borrador.goles_local_pred,
        goles_visitante_pred: borrador.goles_visitante_pred,
        clasificado_pred: borrador.clasificado_pred,
        como_termina_pred: borrador.como_termina_pred,
        publicado: true,
        updated_at: new Date().toISOString(),
      };
      const baseExistingQuery = supabase.from('quiniela_predicciones').select('id').eq('user_id', userId).eq('partido_id', p.id);
      const { data: existing, error: selectError } = await (quinielaSeleccionada === null
        ? baseExistingQuery.is('quiniela_extra_id', null).maybeSingle()
        : baseExistingQuery.eq('quiniela_extra_id', quinielaSeleccionada).maybeSingle());
      if (selectError) throw new Error(`Error al buscar predicción: ${selectError.message}`);
      if (existing) {
        const { error: updateError } = await supabase.from('quiniela_predicciones').update(predPayload).eq('id', existing.id);
        if (updateError) throw new Error(`Error al actualizar: ${updateError.message}`);
      } else {
        const { error: insertError } = await supabase.from('quiniela_predicciones').insert({
          user_id: userId, partido_id: p.id, quiniela_extra_id: quinielaSeleccionada || null, ...predPayload,
        });
        if (insertError) throw new Error(`Error al insertar: ${insertError.message}`);
      }
    });
    try {
      await Promise.all(promises);
      const idsRonda = rondaPartidos(ronda).map(p => p.id);
      setPrediccionesBorrador(prev => {
        const next = { ...prev };
        idsRonda.forEach(id => delete next[id]);
        return next;
      });
      await cargarPredicciones();
      toast.success(`📢 ¡${rondaLabel} publicados exitosamente!`);
    } catch {
      toast.error(`Error al publicar ${rondaLabel}`);
    }
    setPublicando(false);
  };

  const guardarCampeonPick = async () => {
    if (!userId || !campeonPickTemp) return;
    setCampeonGuardando(true);
    const { error } = await supabase
      .from('quiniela_prediccion_campeon')
      .upsert(
        { user_id: userId, equipo: campeonPickTemp, quiniela_extra_id: quinielaSeleccionada },
        { onConflict: 'user_id,quiniela_extra_id' }
      );
    setCampeonGuardando(false);
    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      setMiCampeonPick(campeonPickTemp);
      toast.success('🏆 ¡Campeón guardado!');
    }
  };

  const guardarJ6Pick = async () => {
    if (!userId || !j6PickTemp) return;
    setJ6Guardando(true);
    const baseSelect = supabase
      .from('quiniela_prediccion_campeon')
      .select('user_id')
      .eq('user_id', userId)
      .eq('jornada', 6);
    const { data: existing } = await (quinielaSeleccionada === null
      ? baseSelect.is('quiniela_extra_id', null).maybeSingle()
      : baseSelect.eq('quiniela_extra_id', quinielaSeleccionada).maybeSingle());
    let error;
    if (existing) {
      const baseUpdate = supabase
        .from('quiniela_prediccion_campeon')
        .update({ equipo: j6PickTemp, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('jornada', 6);
      ({ error } = await (quinielaSeleccionada === null
        ? baseUpdate.is('quiniela_extra_id', null)
        : baseUpdate.eq('quiniela_extra_id', quinielaSeleccionada)));
    } else {
      ({ error } = await supabase
        .from('quiniela_prediccion_campeon')
        .insert({ user_id: userId, equipo: j6PickTemp, quiniela_extra_id: quinielaSeleccionada, jornada: 6 }));
    }
    setJ6Guardando(false);
    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      setJ6Pick(j6PickTemp);
      toast.success('🏆 ¡Pick de Cuartos guardado!');
    }
  };

  const predichasEnJornada = partidos.filter(p => predicciones[p.id]).length;
  const totalEnJornada = partidos.length;
  const porcentaje = totalEnJornada > 0 ? Math.round((predichasEnJornada / totalEnJornada) * 100) : 0;
  const jornadaCompleta = predichasEnJornada >= totalEnJornada && totalEnJornada > 0;

  const estaBloquado = (partido: Partido) => {
    if (partido.estado === 'finalizado') return true;
    if (TEMPORADA_ACTIVA === 'ligamx2026' && jornada >= 2 && jornada <= 5) {
      return new Date() >= new Date(partido.fecha_hora);
    }
    if (jornada === 6) {
      const fechaPartido = new Date(partido.fecha_hora);
      if (fechaPartido >= new Date('2026-07-19T00:00:00Z')) return new Date() > DEADLINE_FINAL;
      if (fechaPartido >= new Date('2026-07-18T00:00:00Z')) return new Date() > DEADLINE_TERCERO;
      if (fechaPartido >= new Date('2026-07-14T00:00:00Z')) return new Date() > DEADLINE_SEMIS;
      return new Date() > DEADLINE_J6;
    }
    if (new Date() > getDeadline(jornada)) return true;
    return false;
  };

  const resolvedPartidos = partidos.map(p => {
    if (jornada !== 4) return p;
    const key = getFechaKey(p.fecha_hora);
    const eq = equiposE32[key];
    if (!eq) return p;
    const equipLocal = p.equipo_local !== 'A definir' ? p.equipo_local : (eq.local || 'A definir');
    const equipVisitante = p.equipo_visitante !== 'A definir' ? p.equipo_visitante : (eq.visitante || 'A definir');
    return {
      ...p,
      equipo_local: equipLocal,
      equipo_visitante: equipVisitante,
      bandera_local: BANDERAS_EQUIPOS[equipLocal] ?? p.bandera_local ?? '',
      bandera_visitante: BANDERAS_EQUIPOS[equipVisitante] ?? p.bandera_visitante ?? '',
    };
  });
  const todosSinResolver = jornada === 4 && resolvedPartidos.every(p => p.equipo_local === 'A definir' && p.equipo_visitante === 'A definir');

  const campeonDeadlinePasado = Date.now() >= DEADLINE_J3.getTime();
  const campeonAcerto = campeonDeclarado && miCampeonPick === campeonDeclarado;
  const campeonFallo  = campeonDeclarado && miCampeonPick && miCampeonPick !== campeonDeclarado;

  // ── Equipos Leagues Cup ─────────────────────────────────────────────────
  const EQUIPOS_LIGAMX_LC = ['América','Guadalajara','Cruz Azul','Monterrey','Tigres','Pumas','Toluca','Atlas','León','Pachuca','Santos','Puebla','Querétaro','Tijuana','Juárez','San Luis','Necaxa','Atlante'];
  const EQUIPOS_MLS_LC    = ['Charlotte FC','Columbus Crew','FC Dallas','Inter Miami','New York City FC','Real Salt Lake','Seattle Sounders','FC Cincinnati','Minnesota United','Vancouver Whitecaps','Nashville SC','Orlando City','LAFC','Philadelphia Union','Chicago Fire','Austin FC','San Diego FC','Portland Timbers'];
  const picksDeadlinePasado = Date.now() >= DEADLINE_PICKS_CLASIFICACION.getTime();

  // ── Shared button style helpers ─────────────────────────────────────────
  const publishBtn = (disabled: boolean, variant: 'primary' | 'blue' = 'primary') => ({
    background: disabled ? 'rgba(255,255,255,0.06)' : variant === 'blue' ? '#3b82f6' : 'linear-gradient(135deg, #ea580c, #f97316)',
    color: disabled ? '#475569' : '#fff',
    border: 'none',
    fontFamily: 'var(--font-rajdhani)',
    boxShadow: disabled ? 'none' : '0 2px 14px rgba(234,88,12,0.25)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <main
      className="max-w-lg mx-auto px-4 pb-32 space-y-3"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      {/* ── HEADER ── */}
      <motion.div {...fadeUp(0)}>
        <h1
          style={{
            fontFamily: 'var(--font-bebas)',
            fontSize: '2.6rem',
            lineHeight: 1,
            letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 80%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {TEMPORADA_ACTIVA === 'ligamx2026'
            ? (jornada >= 4 ? 'Liga MX Apertura 2026' : 'Leagues Cup — Fase 1')
            : 'PREDICCIONES'}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {labelJornada(jornada)}
        </p>
      </motion.div>

      {/* ── BANNER: PAGO PENDIENTE ── */}
      <AnimatePresence>
        {participando === false && (
          <motion.div
            key="payment-banner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28 }}
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: 'linear-gradient(135deg, rgba(234,88,12,0.08) 0%, rgba(249,115,22,0.04) 100%)',
              border: '1px solid rgba(234,88,12,0.32)',
              boxShadow: '0 0 28px rgba(234,88,12,0.06)',
            }}
          >
            <p className="font-bold" style={{ fontFamily: 'var(--font-rajdhani)', color: '#f97316', fontSize: '1rem' }}>
              ⚠️ Tienes predicciones sin pagar en esta jornada
            </p>
            <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              💳 CLABE: <strong style={{ color: 'var(--text-primary)' }}>014180565546539842</strong>
              <br />
              <span style={{ color: 'var(--text-secondary)' }}>Monto: </span>
              <strong style={{ color: '#f97316' }}>${getMontoJornada(jornada)} MXN</strong>
            </p>
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.16)' }}>
              <p className="font-bold text-sm" style={{ fontFamily: 'var(--font-rajdhani)', color: '#f97316' }}>
                📱 Envía por WhatsApp al 55 2326 9241:
              </p>
              <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
                <li>Captura del comprobante de pago</li>
                <li>Tu correo de Google con el que entraste</li>
                <li>Tu nombre o apodo para el ranking</li>
              </ol>
              <p className="text-xs" style={{ color: '#475569', marginTop: '0.5rem' }}>
                Tu participación se activará en cuanto confirmemos tu pago ✅
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BANNER: POZO ── */}
      {pozo && (
        <motion.div
          {...fadeUp(0.05)}
          className="rounded-2xl px-4 py-3 space-y-1"
          style={{
            background: participando === true
              ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))'
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${participando === true ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{
              color: participando === true ? '#10b981' : 'var(--text-secondary)',
              fontFamily: 'var(--font-rajdhani)',
            }}>
              {participando === true
                ? `✅ Participando en ${labelJornada(jornada)}`
                : `🏆 Pozo ${labelJornada(jornada)}`}
            </p>
            <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: 'var(--accent-gold)', lineHeight: 1 }}>
              ${pozo.total_mxn} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>MXN</span>
            </p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            👥 {pozo.participantes} participante{pozo.participantes !== 1 ? 's' : ''}
            {pozo.estado !== 'abierto' && pozo.ganador_nombre && ` · 🥇 ${pozo.ganador_nombre}`}
          </p>
        </motion.div>
      )}

      {/* ── SELECTOR QUINIELA ── */}
      <motion.div
        {...fadeUp(0.08)}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        <Pill active={quinielaSeleccionada === null} onClick={() => setQuinielaSeleccionada(null)}>
          Mi quiniela
        </Pill>
        {quinielasExtra.map((q: any) => (
          <Pill key={q.id} active={quinielaSeleccionada === q.id} onClick={() => setQuinielaSeleccionada(q.id)}>
            {q.nombre}
          </Pill>
        ))}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setShowNuevaQuiniela(true)}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm cursor-pointer"
          style={{
            background: 'transparent',
            border: '1px dashed rgba(234,88,12,0.35)',
            color: '#f97316',
            fontFamily: 'var(--font-rajdhani)',
          }}
        >
          + Nueva
        </motion.button>
      </motion.div>

      {/* ── SELECTOR JORNADA ── */}
      <motion.div
        {...fadeUp(0.11)}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {jornadas.filter(j => TEMPORADA_ACTIVA === 'ligamx2026' ? j <= 5 : j <= 6).map(j => {
          const cerrada = TEMPORADA_ACTIVA === 'ligamx2026' ? new Date() > getDeadline(j) : j < 2 || new Date() > getDeadline(j);
          return (
            <Pill key={j} active={jornada === j} onClick={() => setJornada(j)} faded={cerrada && jornada !== j}>
              {cerrada && jornada !== j && <span style={{ fontSize: '0.55rem', marginRight: 2 }}>🔒</span>}
              {TEMPORADA_ACTIVA === 'ligamx2026' ? (j <= 3 ? `J${j}` : labelJornada(j)) : labelJornada(j)}
            </Pill>
          );
        })}
      </motion.div>

      {/* ── BARRA DE PROGRESO ── */}
      {!loading && totalEnJornada > 0 && (
        <motion.div
          {...fadeUp(0.14)}
          className="rounded-2xl px-4 py-3 space-y-2"
          style={{
            background: jornadaCompleta ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${jornadaCompleta ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{
              fontFamily: 'var(--font-rajdhani)',
              color: jornadaCompleta ? '#10b981' : 'var(--text-primary)',
            }}>
              {jornadaCompleta
                ? (publicado ? `✅ ¡${labelJornada(jornada)} publicada!` : `✅ ¡${labelJornada(jornada)} completa!`)
                : `${predichasEnJornada}/${totalEnJornada} partidos predichos`}
            </p>
            <span style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: '1.2rem',
              color: jornadaCompleta ? '#10b981' : 'var(--accent-gold)',
              lineHeight: 1,
            }}>
              {porcentaje}%
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${porcentaje}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              style={{
                background: jornadaCompleta
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #ea580c, #f97316)',
              }}
            />
          </div>

          {jornada !== 6 && jornadaCompleta && !publicado && (
            <div className="pt-1 space-y-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePublicar}
                disabled={publicando}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={publishBtn(publicando)}
              >
                {publicando ? 'Publicando...' : '📢 Publicar jornada'}
              </motion.button>
              <p className="text-[11px] text-center" style={{ color: 'var(--text-secondary)' }}>
                Tus predicciones no serán visibles hasta que las publiques.
              </p>
            </div>
          )}

          {jornada !== 6 && jornadaCompleta && publicado && (
            <div>
              <p className="text-xs" style={{ color: '#10b981' }}>
                Tus predicciones ya son visibles para todos ✓
              </p>
              {Object.keys(prediccionesBorrador).length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleActualizar}
                  disabled={publicando}
                  className="w-full mt-2 py-3 rounded-xl font-bold text-sm"
                  style={publishBtn(publicando)}
                >
                  {publicando ? 'Actualizando...' : '🔄 Actualizar predicciones'}
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── LOADING / PARTIDOS ── */}
      {loading ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full border-2"
            style={{ borderColor: 'rgba(234,88,12,0.15)', borderTopColor: '#ea580c' }}
          />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cargando partidos…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jornada >= 5 && TEMPORADA_ACTIVA !== 'ligamx2026' && (
            <motion.div {...fadeUp(0.12)} className="flex gap-3 text-xs flex-wrap" style={{ color: '#64748b' }}>
              <span>⏱️ Tiempo reglamentario</span>
              <span>⏩ Prórroga</span>
              <span>🥅 Penales</span>
            </motion.div>
          )}

          {/* ── Bracket Fase Final ── */}
          {jornada === 6 && (
            <>
              <motion.div {...fadeUp(0.1)}>
                <ReglasFaseFinal />
              </motion.div>

              <motion.div {...fadeUp(0.13)}>
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setBracketVisible(v => !v)}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--accent-gold)' }}>
                    🏆 Bracket Fase Final
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                    {bracketVisible ? '▲ Ocultar' : '▼ Ver bracket'}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {bracketVisible && (
                    <MiniBracket
                      partidos={bracketPartidos}
                      visible={bracketVisible}
                      onPredicir={(p) => { if (!estaBloquado(p)) setPartidoActivo(p); }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>

              {/* ── Progreso Fase Final ── */}
              <motion.div
                {...fadeUp(0.17)}
                className="rounded-xl p-3 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                  📊 Progreso Fase Final
                </p>
                {(['cuartos', 'semis', 'final'] as const).map(ronda => {
                  const label = ronda === 'cuartos' ? 'Cuartos' : ronda === 'semis' ? 'Semifinales' : 'Final + 3er Lugar';
                  const pub = rondaPublicada(ronda);
                  const hechos = rondaCompletados(ronda);
                  const total = rondaTotal(ronda);
                  return (
                    <div key={ronda} className="flex items-center justify-between gap-2" id={ronda === 'semis' ? 'publicar-semis-section' : undefined}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span style={{ fontSize: 11, color: pub ? '#22c55e' : 'var(--text-secondary)' }}>
                          {pub ? '✅' : '📋'}
                        </span>
                        <span className="text-xs font-semibold truncate" style={{ color: pub ? '#22c55e' : 'var(--text-primary)' }}>
                          {label}
                        </span>
                        <span className="text-[10px] shrink-0" style={{ color: hechos > 0 ? '#fbbf24' : '#64748b', fontFamily: 'var(--font-rajdhani)' }}>
                          {hechos}/{total}
                        </span>
                      </div>
                      {ronda === 'cuartos' && !pub ? (
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: '#64748b' }}>✅ Cuartos cerrados</span>
                      ) : ronda === 'semis' && new Date() <= DEADLINE_SEMIS ? (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePublicarRonda(ronda)}
                          disabled={publicando || hechos < total}
                          className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shrink-0"
                          style={publishBtn(publicando || hechos < total, pub ? 'blue' : 'primary')}
                        >
                          {publicando ? '⏳' : pub ? 'Actualizar' : 'Publicar'}
                        </motion.button>
                      ) : ronda === 'semis' ? (
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: '#64748b' }}>🔒 Cerradas</span>
                      ) : hechos === total && !pub ? (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePublicarRonda(ronda)}
                          disabled={publicando}
                          className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shrink-0"
                          style={publishBtn(publicando)}
                        >
                          {publicando ? '⏳' : 'Publicar'}
                        </motion.button>
                      ) : pub ? (
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: '#22c55e' }}>Publicado</span>
                      ) : (
                        <span className="text-[10px] shrink-0" style={{ color: '#64748b' }}>{hechos > 0 ? `${hechos}/${total}` : 'Pendiente'}</span>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            </>
          )}

          {/* ── LISTA DE PARTIDOS ── */}
          {jornada === 6 ? (
            (['cuartos', 'semis', 'final'] as const).map(ronda => {
              const ps = rondaPartidos(ronda);
              if (ps.length === 0) return null;
              const pub = rondaPublicada(ronda);
              const hechos = rondaCompletados(ronda);
              const total = rondaTotal(ronda);
              const label = ronda === 'cuartos' ? 'Cuartos de Final' : ronda === 'semis' ? 'Semifinales' : 'Final + 3er Lugar';
              return (
                <motion.div
                  key={ronda}
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                  id={ronda === 'semis' ? 'semifinales-section' : undefined}
                >
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                      {label}
                    </p>
                    {ronda === 'cuartos' && !pub ? (
                      <span className="text-[10px] font-semibold" style={{ color: '#64748b' }}>✅ Cuartos cerrados</span>
                    ) : ronda === 'semis' && new Date() <= DEADLINE_SEMIS ? (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePublicarRonda(ronda)}
                        disabled={publicando || hechos < total}
                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shrink-0"
                        style={{ ...publishBtn(publicando || hechos < total, pub ? 'blue' : 'primary'), fontFamily: 'var(--font-rajdhani)' }}
                      >
                        {publicando ? '⏳' : pub ? 'Actualizar Semifinales' : 'Publicar Semifinales'}
                      </motion.button>
                    ) : ronda === 'semis' ? (
                      <span className="text-[10px] font-semibold" style={{ color: '#64748b' }}>🔒 Cerradas</span>
                    ) : pub ? (
                      <span className="text-[10px] font-semibold" style={{ color: '#22c55e' }}>✅ Publicado</span>
                    ) : hechos === total && total > 0 ? (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePublicarRonda(ronda)}
                        disabled={publicando}
                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shrink-0"
                        style={{ ...publishBtn(publicando), fontFamily: 'var(--font-rajdhani)' }}
                      >
                        {publicando ? '⏳' : 'Publicar'}
                      </motion.button>
                    ) : (
                      <span className="text-[10px]" style={{ color: '#64748b' }}>{hechos}/{total}</span>
                    )}
                  </div>

                  {ronda === 'semis' && (
                    <p className="text-[11px] rounded-xl px-3 py-2" style={{ background: 'rgba(251,191,36,0.06)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}>
                      ⚽ Llena tus predicciones y presiona <strong>PUBLICAR</strong> para que aparezcan en la tabla.
                    </p>
                  )}

                  {ronda === 'final' && new Date() > DEADLINE_FINAL && (
                    <p className="text-[11px] rounded-xl px-3 py-2" style={{ background: 'rgba(239,68,68,0.06)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
                      🔒 Las predicciones de Final y 3er Lugar cerraron a las 3:00 PM
                    </p>
                  )}

                  {ps.map(partido => (
                    <motion.div key={partido.id} variants={itemVariants} id={`partido-${partido.id}`}>
                      <PartidoCard
                        partido={partido}
                        prediccion={prediccionesBorrador[partido.id] ?? predicciones[partido.id] ?? null}
                        participacionPagada={predicciones[partido.id] ? participando : undefined}
                        onPredicir={estaBloquado(partido) ? undefined : setPartidoActivo}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              );
            })
          ) : todosSinResolver ? (
            <motion.div
              {...fadeUp(0.2)}
              className="rounded-2xl p-8 text-center space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-4xl">⏳</p>
              <p className="font-bold text-sm" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                Los equipos se definen al término de la Fase de Grupos (J3)
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Deadline: 28 jun 2026 · 13:00 CDMX
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {resolvedPartidos.map(partido => (
                <motion.div key={partido.id} variants={itemVariants} id={`partido-${partido.id}`}>
                  <PartidoCard
                    partido={partido}
                    prediccion={prediccionesBorrador[partido.id] ?? predicciones[partido.id] ?? null}
                    participacionPagada={predicciones[partido.id] ? participando : undefined}
                    onPredicir={estaBloquado(partido) ? undefined : setPartidoActivo}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── Progreso bottom (J1-J5) ── */}
          {jornada !== 6 && totalEnJornada > 0 && (
            <div className="mt-4 mb-2">
              <div className="flex justify-between text-xs mb-2" style={{ color: '#64748b' }}>
                <span>Progreso {labelJornada(jornada)}</span>
                <span>{predichasEnJornada}/{totalEnJornada}</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  className="h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${totalEnJornada > 0 ? (predichasEnJornada / totalEnJornada) * 100 : 0}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    background: jornadaCompleta
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #ea580c, #f97316)',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Botón publicar bottom (J1-J5) ── */}
          {jornada !== 6 && jornadaCompleta && !publicado && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePublicar}
              disabled={publicando}
              className="w-full py-4 rounded-xl font-bold text-base mt-2"
              style={{
                ...publishBtn(publicando),
                fontSize: '1rem',
                boxShadow: publicando ? 'none' : '0 4px 24px rgba(234,88,12,0.3)',
              }}
            >
              {publicando ? '⏳ Publicando...' : '📢 Publicar mi quiniela'}
            </motion.button>
          )}

          {jornada !== 6 && jornadaCompleta && publicado && (
            <div
              className="w-full py-4 rounded-xl text-center font-bold text-base mt-2"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', color: '#34d399', fontFamily: 'var(--font-rajdhani)' }}
            >
              ✅ Quiniela publicada
            </div>
          )}
        </div>
      )}

      {/* ── PICKS CLASIFICACIÓN LEAGUES CUP ── */}
      {TEMPORADA_ACTIVA === 'ligamx2026' && jornada === 1 && (
        <>
          {(['ligamx', 'mls'] as const).map(liga => {
            const equipos     = liga === 'ligamx' ? EQUIPOS_LIGAMX_LC : EQUIPOS_MLS_LC;
            const picks       = liga === 'ligamx' ? picksLigamx : picksMls;
            const setPicks    = liga === 'ligamx' ? setPicksLigamx : setPicksMls;
            const titulo      = liga === 'ligamx' ? '🏆 ¿Cuáles 4 equipos de Liga MX clasifican a Cuartos?' : '🏆 ¿Cuáles 4 equipos de MLS clasifican a Cuartos?';
            const yaGuardado  = picks.length === 4;

            const toggleEquipo = (eq: string) => {
              if (picksDeadlinePasado) return;
              setPicks(prev =>
                prev.includes(eq) ? prev.filter(e => e !== eq) : prev.length < 4 ? [...prev, eq] : prev
              );
            };

            return (
              <motion.div
                key={liga}
                {...fadeUp(0.03)}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                    {titulo}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Selecciona exactamente 4 · +1 pt por cada acierto · Máximo +4 pts
                  </p>
                </div>

                {picksDeadlinePasado ? (
                  yaGuardado ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>🔒 Tus picks guardados</p>
                      <div className="grid grid-cols-4 gap-2">
                        {picks.map(eq => (
                          <div key={eq} className="flex flex-col items-center gap-1 rounded-xl py-2 px-1"
                            style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)' }}>
                            <Bandera emoji="" nombre={eq} size="md" />
                            <span className="text-[9px] text-center leading-tight" style={{ color: '#fb923c', fontFamily: 'var(--font-rajdhani)', fontWeight: 700 }}>{eq}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-center py-2" style={{ color: 'var(--text-secondary)' }}>No hiciste picks 🔒</p>
                  )
                ) : (
                  <>
                    <p className="text-xs" style={{ color: picks.length === 4 ? '#34d399' : 'var(--text-secondary)' }}>
                      {picks.length === 4 ? '✅ 4 equipos seleccionados' : `Seleccionados: ${picks.length}/4`}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {equipos.map(eq => {
                        const seleccionado = picks.includes(eq);
                        const lleno = picks.length === 4 && !seleccionado;
                        const tienelogo = !!LOGOS_LIGAMX[eq];
                        return (
                          <motion.button
                            key={eq}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => toggleEquipo(eq)}
                            className="flex flex-col items-center gap-1 rounded-xl py-2 px-1 cursor-pointer"
                            style={{
                              background: seleccionado ? 'linear-gradient(135deg, #ea580c, #f97316)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${seleccionado ? 'transparent' : 'rgba(255,255,255,0.07)'}`,
                              opacity: lleno ? 0.35 : 1,
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <Bandera emoji="" nombre={eq} size={tienelogo ? 'md' : 'sm'} />
                            <span className="text-[9px] text-center leading-tight" style={{
                              fontFamily: 'var(--font-rajdhani)', fontWeight: 600,
                              color: seleccionado ? '#fff' : 'var(--text-secondary)',
                            }}>{eq}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => guardarPicksClasificacion(liga, picks)}
                      disabled={picks.length !== 4 || picksGuardando}
                      className="w-full py-3 rounded-xl font-bold text-sm mt-1"
                      style={{
                        background: picks.length === 4 && !picksGuardando ? 'linear-gradient(135deg, #ea580c, #f97316)' : 'rgba(255,255,255,0.06)',
                        color: picks.length === 4 && !picksGuardando ? '#fff' : '#475569',
                        border: 'none', fontFamily: 'var(--font-rajdhani)',
                        cursor: picks.length !== 4 || picksGuardando ? 'not-allowed' : 'pointer',
                        boxShadow: picks.length === 4 && !picksGuardando ? '0 4px 18px rgba(234,88,12,0.3)' : 'none',
                      }}
                    >
                      {picksGuardando ? '⏳ Guardando...' : yaGuardado ? '🔄 Actualizar picks' : '✅ Guardar picks'}
                    </motion.button>
                  </>
                )}
              </motion.div>
            );
          })}
        </>
      )}

      {/* ── PREDICCIÓN CAMPEÓN MUNDIAL (J1-J5) ── */}
      {jornada !== 6 && TEMPORADA_ACTIVA !== 'ligamx2026' && (
        <motion.div
          {...fadeUp(0.03)}
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
            🏆 ¿Quién será el Campeón Mundial?
          </p>

          {campeonEquipos.length === 0 ? (
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-5 w-5 rounded-full border-2"
                style={{ borderColor: 'rgba(234,88,12,0.15)', borderTopColor: '#ea580c' }}
              />
            </div>
          ) : (
            <>
              {campeonAcerto && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)' }}>
                  <p className="font-bold" style={{ color: '#fbbf24', fontFamily: 'var(--font-rajdhani)' }}>
                    ✅ ¡Acertaste! — {campeonDeclarado}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>🏆 Tienes el badge de Campeón</p>
                </div>
              )}

              {campeonFallo && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                    ❌ No fue {miCampeonPick} — ganó <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong>
                  </p>
                </div>
              )}

              {campeonDeclarado && !miCampeonPick && (
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  No hiciste predicción — ganó <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong>
                </p>
              )}

              {!campeonDeclarado && campeonDeadlinePasado && !miCampeonPick && (
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>No hiciste una predicción 🔒</p>
              )}

              {!campeonDeclarado && campeonDeadlinePasado && miCampeonPick && (
                <>
                  <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(100,116,139,0.06)', border: '1px solid rgba(100,116,139,0.15)' }}>
                    <span>🔒</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Tu campeón: <strong style={{ color: '#fbbf24' }}>{miCampeonPick}</strong>
                    </span>
                  </div>
                  {campeonStats.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] uppercase tracking-widest" style={{ color: '#64748b' }}>Picks del grupo</p>
                      {campeonStats.map(s => (
                        <div key={s.equipo} className="flex items-center justify-between text-xs py-0.5">
                          <span style={{ color: s.equipo === miCampeonPick ? '#fbbf24' : 'var(--text-secondary)' }}>{s.equipo}</span>
                          <span style={{ color: '#64748b' }}>{s.total} jugador{s.total !== 1 ? 'es' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!campeonDeadlinePasado && !campeonDeclarado && (
                <>
                  {miCampeonPick && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Pick actual: <strong style={{ color: '#fbbf24' }}>{miCampeonPick}</strong> · Puedes cambiar hasta el 27 jun 2026
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                    {campeonEquipos.map(equipo => (
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        key={equipo}
                        onClick={() => setCampeonPickTemp(equipo)}
                        className="py-2 px-1 rounded-lg text-xs font-semibold text-center cursor-pointer"
                        style={{
                          background: campeonPickTemp === equipo
                            ? 'linear-gradient(135deg, #ea580c, #f97316)'
                            : 'rgba(255,255,255,0.04)',
                          color: campeonPickTemp === equipo ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${campeonPickTemp === equipo ? 'transparent' : 'rgba(255,255,255,0.06)'}`,
                          fontFamily: 'var(--font-rajdhani)',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {equipo}
                      </motion.button>
                    ))}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={guardarCampeonPick}
                    disabled={!campeonPickTemp || campeonGuardando || campeonPickTemp === miCampeonPick}
                    className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer"
                    style={publishBtn(!campeonPickTemp || campeonGuardando || campeonPickTemp === miCampeonPick)}
                  >
                    {campeonGuardando ? '⏳ Guardando...' : miCampeonPick ? '🔄 Actualizar predicción' : '🏆 Guardar predicción'}
                  </motion.button>
                </>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* ── RESUMEN PICKS CAMPEÓN ── */}
      {jornada !== 6 && todosMisPicksCampeon.length > 0 && TEMPORADA_ACTIVA !== 'ligamx2026' && (
        <motion.div
          {...fadeUp(0.05)}
          className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
            🏆 Predicciones de Campeón
          </p>
          {todosMisPicksCampeon.map((pick, i) => {
            const nombreQuiniela = pick.quiniela_extra_id
              ? quinielasExtra.find((q: any) => q.id === pick.quiniela_extra_id)?.nombre
              : null;
            return (
              <div key={i} className="flex items-center justify-between text-sm py-1"
                style={{ borderBottom: i < todosMisPicksCampeon.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {nombreQuiniela ? `🎫 ${nombreQuiniela}` : 'Tu quiniela'}
                </span>
                <span className="font-semibold" style={{ color: '#fbbf24' }}>{pick.equipo}</span>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ── PREDICCIÓN CAMPEÓN J6 — CUARTOS ── */}
      {jornada === 6 && TEMPORADA_ACTIVA !== 'ligamx2026' && (
        <motion.div
          {...fadeUp(0.03)}
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(234,88,12,0.2)',
            boxShadow: '0 0 24px rgba(234,88,12,0.05)',
          }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
              🏆 ¿Quién será el Campeón Mundial?
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Elige entre los 8 clasificados a Cuartos · +5 pts si aciertas
            </p>
          </div>

          {j6Equipos.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: '#64748b' }}>Equipos pendientes de definirse</p>
          ) : new Date() > DEADLINE_J6 ? (
            j6Pick ? (
              <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(100,116,139,0.06)', border: '1px solid rgba(100,116,139,0.15)' }}>
                <span>🔒</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Tu pick: <strong style={{ color: '#fbbf24' }}>{j6Pick}</strong>
                </span>
              </div>
            ) : (
              <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>No hiciste una predicción 🔒</p>
            )
          ) : (
            <>
              {j6Pick && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Pick actual: <strong style={{ color: '#fbbf24' }}>{j6Pick}</strong>
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {j6Equipos.map(equipo => (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    key={equipo}
                    onClick={() => setJ6PickTemp(equipo)}
                    className="py-2.5 px-2 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{
                      background: j6PickTemp === equipo
                        ? 'linear-gradient(135deg, #ea580c, #f97316)'
                        : 'rgba(255,255,255,0.04)',
                      color: j6PickTemp === equipo ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${j6PickTemp === equipo ? 'transparent' : 'rgba(255,255,255,0.06)'}`,
                      fontFamily: 'var(--font-rajdhani)',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <span>{BANDERAS_EQUIPOS[equipo] ?? ''}</span>
                    <span>{equipo}</span>
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={guardarJ6Pick}
                disabled={!j6PickTemp || j6Guardando || j6PickTemp === j6Pick}
                className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer"
                style={publishBtn(!j6PickTemp || j6Guardando || j6PickTemp === j6Pick)}
              >
                {j6Guardando ? '⏳ Guardando...' : j6Pick ? '🔄 Actualizar pick' : '🏆 Guardar pick de Campeón'}
              </motion.button>
            </>
          )}
        </motion.div>
      )}

      {/* ── FLOATING BUTTON: Publicar / Actualizar Final + 3er Lugar ── */}
      <AnimatePresence>
        {jornada === 6 && new Date() <= DEADLINE_FINAL &&
          rondaPartidos('final').some(p => prediccionesBorrador[p.id] !== undefined) && (
          <motion.div
            id="publicar-final-section"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="fixed bottom-20 left-0 right-0 flex justify-center z-[60] px-4"
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => handlePublicarRonda('final')}
              disabled={publicando}
              className="py-4 px-8 rounded-2xl font-bold text-base"
              style={{
                background: publicando ? 'rgba(255,255,255,0.08)' : rondaPublicada('final') ? '#3b82f6' : 'linear-gradient(135deg, #ea580c, #f97316)',
                color: publicando ? '#475569' : '#fff',
                fontFamily: 'var(--font-rajdhani)',
                fontSize: '1rem',
                boxShadow: publicando ? 'none' : rondaPublicada('final') ? '0 8px 32px rgba(59,130,246,0.45)' : '0 8px 32px rgba(234,88,12,0.5)',
                cursor: publicando ? 'not-allowed' : 'pointer',
                border: 'none',
                minWidth: 280,
              }}
            >
              {publicando ? '⏳ Actualizando...' : rondaPublicada('final') ? '🔄 Actualizar Final + 3er Lugar' : '✅ Publicar Final + 3er Lugar'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: PREDICCIÓN PARTIDO ── */}
      <AnimatePresence>
        {partidoActivo && userId && (
          <PrediccionForm
            partido={partidoActivo}
            userId={userId}
            quinielaExtraId={quinielaSeleccionada}
            prediccionExistente={prediccionesBorrador[partidoActivo.id] ?? predicciones[partidoActivo.id] ?? null}
            onGuardado={handleGuardado}
            onCancelar={() => setPartidoActivo(null)}
            onGuardadoBorrador={jornada === 6 && !estaBloquado(partidoActivo) ? handleGuardadoBorrador : undefined}
          />
        )}
      </AnimatePresence>

      {/* ── MODAL: NUEVA QUINIELA ── */}
      <AnimatePresence>
        {showNuevaQuiniela && (
          <motion.div
            key="nueva-quiniela-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowNuevaQuiniela(false)}
          >
            <motion.div
              key="nueva-quiniela-modal"
              className="rounded-2xl p-6 w-full max-w-sm"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid rgba(234,88,12,0.2)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              }}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', color: '#f97316', marginBottom: '1rem' }}>
                🎫 Nueva Quiniela
              </h3>
              <input
                type="text"
                placeholder="Ej: Esposa, Hija, Compadre..."
                maxLength={20}
                value={nombreNuevaQuiniela}
                onChange={e => setNombreNuevaQuiniela(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') crearQuiniela();
                  if (e.key === 'Escape') setShowNuevaQuiniela(false);
                }}
                autoFocus
                className="w-full rounded-xl px-4 py-3 mb-4 outline-none text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={crearQuiniela}
                  disabled={!nombreNuevaQuiniela.trim()}
                  className="flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer"
                  style={publishBtn(!nombreNuevaQuiniela.trim())}
                >
                  Crear
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowNuevaQuiniela(false)}
                  className="px-5 py-3 rounded-xl text-sm cursor-pointer"
                  style={{ color: '#64748b', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
