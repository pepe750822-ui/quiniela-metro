'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Prediccion, Pozo } from '@/types';
import { getNombreJornada, getFechaKey, equiposE32, BANDERAS_EQUIPOS, getMontoJornada } from '@/lib/utils';
import { Bandera } from '@/components/Bandera';
import PartidoCard from '@/components/PartidoCard';
import PrediccionForm from '@/components/PrediccionForm';
import { toast } from 'sonner';


const DEADLINE_J1 = new Date('2026-06-11T05:59:00Z');
const DEADLINE_J2 = new Date('2026-06-18T16:00:00Z'); // 18 jun 10:00 a.m. CDMX — primer partido J2
const DEADLINE_J3 = new Date('2026-06-24T19:00:00Z'); // 24 jun 13:00 CDMX — primer partido J3
const DEADLINE_J4 = new Date('2026-06-28T19:00:00Z');
const DEADLINE_J5 = new Date('2026-07-04T17:00:00Z'); // 4 jul 11:00 CDMX — primer partido J5 ya jugado
const DEADLINE_J6 = new Date('2026-07-11T18:00:00Z'); // 11 jul — Cuartos
const DEADLINE_J7 = new Date('2026-07-14T21:00:00Z'); // 14 jul — Semis
const DEADLINE_J8 = new Date('2026-07-18T21:00:00Z'); // 18 jul — 3er Lugar
const DEADLINE_J9 = new Date('2026-07-19T21:00:00Z'); // 19 jul — Final

const getDeadline = (jornada: number) => {
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
function MiniBracket({ partidos, visible }: { partidos: Partido[]; visible: boolean }) {
  const j6 = partidos.filter(p => p.jornada === 6);
  const j7 = partidos.filter(p => p.jornada === 7);
  const j8 = partidos.filter(p => p.jornada === 8);
  const j9 = partidos.filter(p => p.jornada === 9);

  const CARD_W = 130;
  const CARD_H = 50;

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
        style={{ background: winner ? 'rgba(234,88,12,0.14)' : 'transparent' }}>
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

  function MatchCard({ p }: { p: Partido }) {
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
      <div style={{
        width: CARD_W,
        background: 'var(--bg-surface)',
        border: `1px solid ${vivo ? 'rgba(234,88,12,0.6)' : 'var(--border)'}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <TeamRow nombre={local} bandera={bL} goles={fin || vivo ? gl : null} winner={wL} />
        <div style={{ height: 1, background: 'var(--border)' }} />
        <TeamRow nombre={visit} bandera={bV} goles={fin || vivo ? gv : null} winner={wV} />
      </div>
    );
  }

  function Connector({ pairs, left }: { pairs: number; left: boolean }) {
    const H = pairs * CARD_H + (pairs - 1) * 8;
    const gap = CARD_H + 8;
    const paths: string[] = [];
    for (let i = 0; i < pairs; i++) {
      const y1 = i * gap + CARD_H / 2;
      const y2 = (i + 1) * gap - CARD_H / 2;
      const yM = (y1 + y2) / 2;
      const w = 14;
      if (left) {
        paths.push(`M0,${y1} H${w/2} V${y2} H0`);
        paths.push(`M${w/2},${yM} H${w}`);
      } else {
        paths.push(`M${w},${y1} H${w/2} V${y2} H${w}`);
        paths.push(`M${w/2},${yM} H0`);
      }
    }
    return (
      <svg width={16} height={H} style={{ display: 'block', flexShrink: 0, marginTop: 4 }}>
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--border)" strokeWidth={1.5} strokeLinecap="round" />
        ))}
      </svg>
    );
  }

  if (!visible) return null;

  const allEmpty = j6.length === 0 && j7.length === 0 && j8.length === 0 && j9.length === 0;

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'fadeIn 0.2s ease-out' }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
        🏆 Fase Final
      </p>

      {allEmpty ? (
        <p style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 11, color: '#475569', textAlign: 'center', padding: '12px 0' }}>
          Cargando bracket...
        </p>
      ) : (
        <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex items-start gap-0" style={{ minWidth: 'max-content' }}>
            {/* Cuartos */}
            <div className="flex flex-col gap-1">
              <p className="text-[8px] font-bold uppercase tracking-wider text-center pb-1" style={{ color: '#64748b' }}>
                Cuartos
              </p>
              {j6.map(p => <MatchCard key={p.id} p={p} />)}
            </div>

            <Connector pairs={j6.length / 2} left />

            {/* Semifinales */}
            <div className="flex flex-col gap-1">
              <p className="text-[8px] font-bold uppercase tracking-wider text-center pb-1" style={{ color: '#64748b' }}>
                Semifinales
              </p>
              {j7.map(p => <MatchCard key={p.id} p={p} />)}
              {Array.from({ length: Math.max(0, 2 - j7.length) }).map((_, i) => (
                <div key={`semi-empty-${i}`} style={{
                  width: CARD_W, height: CARD_H,
                  border: '1px dashed var(--border)', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-rajdhani)' }}>—</span>
                </div>
              ))}
            </div>

            <Connector pairs={1} left />

            {/* Final */}
            <div className="flex flex-col items-center">
              <p className="text-[8px] font-bold uppercase tracking-wider text-center pb-1" style={{ color: '#ea580c' }}>
                🏆 Final
              </p>
              {j9.length > 0 ? j9.map(p => <MatchCard key={p.id} p={p} />) : (
                <div style={{
                  width: CARD_W, height: CARD_H,
                  border: '1px dashed var(--border)', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-rajdhani)' }}>—</span>
                </div>
              )}
              {j8.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p className="text-[8px] font-bold uppercase tracking-wider text-center pb-1" style={{ color: '#64748b' }}>
                    🥉 3er Lugar
                  </p>
                  {j8.map(p => <MatchCard key={p.id} p={p} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrediccionesPage() {
  const router = useRouter();
  const [userId, setUserId]               = useState<string | null>(null);
  const [partidos, setPartidos]           = useState<Partido[]>([]);
  const [predicciones, setPredicciones]   = useState<Record<string, Prediccion>>({});
  const [partidoActivo, setPartidoActivo] = useState<Partido | null>(null);
  const [loading, setLoading]             = useState(true);
  const [jornada, setJornada]             = useState(5);
  const [jornadas, setJornadas]           = useState<number[]>([]);
  const [pozo, setPozo]                   = useState<Pozo | null>(null);
  const [participando, setParticipando]   = useState<boolean | null>(null);
  const [publicado, setPublicado]         = useState<boolean>(false);
  const [publicando, setPublicando]       = useState<boolean>(false);

  // Predicción campeón mundial
  const [campeonEquipos, setCampeonEquipos]     = useState<string[]>([]);
  const [miCampeonPick, setMiCampeonPick]       = useState<string | null>(null);
  const [campeonPickTemp, setCampeonPickTemp]   = useState<string | null>(null);
  const [campeonGuardando, setCampeonGuardando] = useState(false);
  const [campeonStats, setCampeonStats]         = useState<{ equipo: string; total: number }[]>([]);
  const [campeonDeclarado, setCampeonDeclarado] = useState<string | null>(null);
  const [todosMisPicksCampeon, setTodosMisPicksCampeon] = useState<{ quiniela_extra_id: string | null; equipo: string }[]>([]);

  // Predicción campeón J6 (Cuartos de Final)
  const [j6Equipos, setJ6Equipos]     = useState<string[]>([]);
  const [j6Pick, setJ6Pick]           = useState<string | null>(null);
  const [j6PickTemp, setJ6PickTemp]   = useState<string | null>(null);
  const [j6Guardando, setJ6Guardando] = useState(false);

  // Bracket visual J6-J9
  const [bracketVisible, setBracketVisible] = useState(false);
  const [bracketPartidos, setBracketPartidos] = useState<Partido[]>([]);

  // Auto-expandir bracket en J6
  useEffect(() => {
    if (jornada === 6) setBracketVisible(true);
  }, [jornada]);

  // Múltiples quinielas
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
    const filtradas = (extras || []).filter((q: any) => idsConParticipacion.has(q.id));
    setQuinielasExtra(filtradas);
    setQuinielaSeleccionada(prev => (prev && !idsConParticipacion.has(prev) ? null : prev));
  }, []);

  const cargarPozoYParticipacion = useCallback(async (uid: string, j: number) => {
    const basePartQuery = supabase
      .from('quiniela_participaciones')
      .select('pagado, publicado')
      .eq('user_id', uid)
      .eq('jornada', j);

    const partPromise = quinielaSeleccionada === null
      ? basePartQuery.is('quiniela_extra_id', null).maybeSingle()
      : basePartQuery.eq('quiniela_extra_id', quinielaSeleccionada).maybeSingle();

    const [{ data: pz }, { data: part }] = await Promise.all([
      supabase.from('quiniela_pozo').select('*').eq('jornada', j).single(),
      partPromise,
    ]);
    setPozo(pz as Pozo ?? null);
    setParticipando(part?.pagado ?? null);
    setPublicado(part?.publicado ?? false);

    if (!part) {
      await supabase
        .from('quiniela_participaciones')
        .insert({
          user_id:           uid,
          jornada:           j,
          pagado:            false,
          publicado:         false,
          quiniela_extra_id: quinielaSeleccionada ?? null,
        });
      setParticipando(false);
    }
  }, [quinielaSeleccionada]);

  const cargarPartidos = useCallback(async () => {
    const { data } = await supabase
      .from('quiniela_partidos')
      .select('*')
      .eq('jornada', jornada)
      .order('fecha_hora');
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
      supabase.from('quiniela_partidos').select('equipo_local, equipo_visitante').eq('jornada', 6).order('fecha_hora'),
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
    }
  }, [userId, jornada, cargarQuinielas, cargarPredicciones, cargarCampeon, cargarPozoYParticipacion, cargarJ6Campeon]);

  // Cargar partidos J6-J9 para el bracket visual
  useEffect(() => {
    supabase
      .from('quiniela_partidos')
      .select('*')
      .gte('jornada', 6)
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
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 800);
    }
  }, [partidos]);

  const handleGuardado = () => {
    setPartidoActivo(null);
    cargarPredicciones();
    if (userId) cargarPozoYParticipacion(userId, jornada);
  };

  const handlePublicar = async () => {
    if (!userId) return;
    setPublicando(true);

    const baseUpdate = supabase
      .from('quiniela_participaciones')
      .update({ publicado: true })
      .eq('user_id', userId)
      .eq('jornada', jornada);

    const { error } = await (quinielaSeleccionada === null
      ? baseUpdate.is('quiniela_extra_id', null)
      : baseUpdate.eq('quiniela_extra_id', quinielaSeleccionada));

    setPublicando(false);
    if (error) {
      console.error('Error publicando:', error);
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
    // SELECT-then-UPDATE/INSERT para no depender del unique constraint existente
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

  // Progreso de predicciones en la jornada actual
  const predichasEnJornada = partidos.filter(p => predicciones[p.id]).length;
  const totalEnJornada = partidos.length;
  const porcentaje = totalEnJornada > 0 ? Math.round((predichasEnJornada / totalEnJornada) * 100) : 0;
  const jornadaCompleta = predichasEnJornada >= totalEnJornada && totalEnJornada > 0;

  const estaBloquado = (partido: Partido) =>
    partido.estado === 'finalizado' || new Date() > getDeadline(jornada);

  // Resolver nombres de equipos conocidos para Dieciseisavos
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

  return (
    <main
      className="max-w-lg mx-auto px-4 pb-24 space-y-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      {/* Header */}
      <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}>
          PREDICCIONES
        </h1>
      </div>

      {/* Banner: pago pendiente */}
      {participando === false && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.4)', animation: 'fadeInUp 0.4s ease-out 0.05s both' }}
        >
          <p className="font-bold" style={{ fontFamily: 'var(--font-rajdhani)', color: '#ea580c', fontSize: '1rem' }}>
            ⚠️ Tienes predicciones sin pagar en esta jornada
          </p>

          <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            💳 CLABE: <strong>014180565546539842</strong>
            <br />
            <span style={{ color: 'var(--text-muted)' }}>Monto: </span><strong style={{ color: 'var(--text-primary)' }}>${getMontoJornada(jornada)} MXN</strong>
          </p>

          <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)' }}>
            <p className="font-bold text-sm" style={{ fontFamily: 'var(--font-rajdhani)', color: '#f97316' }}>
              📱 Envía por WhatsApp al 55 2326 9241:
            </p>
            <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
              <li>Captura del comprobante de pago</li>
              <li>Tu correo de Google con el que entraste</li>
              <li>Tu nombre o apodo para el ranking</li>
            </ol>
            <p className="text-xs" style={{ color: '#64748b', marginTop: '0.5rem' }}>
              Tu participación se activará en cuanto confirmemos tu pago ✅
            </p>
          </div>
        </div>
      )}

      {/* Banner: pozo + estado confirmado */}
      {pozo && (
        <div
          className="rounded-2xl px-4 py-3 space-y-1"
          style={{
            background: participando === true ? 'rgba(16,185,129,0.08)' : 'rgba(234,88,12,0.06)',
            border: `1px solid ${participando === true ? 'rgba(16,185,129,0.3)' : 'rgba(234,88,12,0.2)'}`,
            animation: 'fadeInUp 0.4s ease-out 0.1s both',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: participando === true ? '#10b981' : 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
              {participando === true
                ? `✅ Participando en ${getNombreJornada(jornada)}`
                : `🏆 Pozo ${getNombreJornada(jornada)}`}
            </p>
            <div className="text-right">
              <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', color: 'var(--accent-gold)', lineHeight: 1 }}>
                ${pozo.total_mxn} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MXN</span>
              </p>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            👥 {pozo.participantes} participante{pozo.participantes !== 1 ? 's' : ''}
            {pozo.estado !== 'abierto' && pozo.ganador_nombre && ` · 🥇 ${pozo.ganador_nombre}`}
          </p>
        </div>
      )}

      {/* Selector quiniela */}
      <div className="flex gap-2 overflow-x-auto pb-2" style={{ animation: 'fadeInUp 0.4s ease-out 0.12s both' }}>
        <button
          onClick={() => setQuinielaSeleccionada(null)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
          style={{
            fontFamily: 'var(--font-rajdhani)',
            background: quinielaSeleccionada === null ? '#ea580c' : 'var(--bg-card)',
            color: quinielaSeleccionada === null ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${quinielaSeleccionada === null ? '#ea580c' : 'var(--border)'}`,
          }}>
          👤 Mi quiniela
        </button>
        {quinielasExtra.map(q => (
          <button
            key={q.id}
            onClick={() => setQuinielaSeleccionada(q.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              fontFamily: 'var(--font-rajdhani)',
              background: quinielaSeleccionada === q.id ? '#ea580c' : 'var(--bg-card)',
              color: quinielaSeleccionada === q.id ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${quinielaSeleccionada === q.id ? '#ea580c' : 'var(--border)'}`,
            }}>
            🎫 {q.nombre}
          </button>
        ))}
        <button
          onClick={() => setShowNuevaQuiniela(true)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-all"
          style={{
            fontFamily: 'var(--font-rajdhani)',
            background: 'var(--bg-card)',
            border: '1px dashed rgba(234,88,12,0.4)',
            color: '#ea580c',
          }}>
          + Nueva
        </button>
      </div>

      {/* Selector jornada */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ animation: 'fadeInUp 0.4s ease-out 0.15s both' }}>
        {jornadas.map(j => {
          const cerrada = j < 2 || new Date() > getDeadline(j);
          const activa  = jornada === j;
          return (
            <button key={j} onClick={() => setJornada(j)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 min-h-[36px] flex items-center gap-1"
              style={{
                background: activa ? 'var(--accent-gold)' : 'var(--bg-card)',
                color: activa ? '#000' : cerrada ? '#64748b' : 'var(--text-secondary)',
                border: `1px solid ${activa ? 'var(--accent-gold)' : 'var(--border)'}`,
                fontFamily: 'var(--font-rajdhani)',
              }}>
              {cerrada && !activa && <span style={{ fontSize: '0.6rem' }}>🔒</span>}
              {getNombreJornada(j)}
            </button>
          );
        })}
      </div>

      {/* Barra de progreso */}
      {!loading && totalEnJornada > 0 && (
        <div
          className="rounded-2xl px-4 py-3 space-y-2"
          style={{
            background: jornadaCompleta ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
            border: `1px solid ${jornadaCompleta ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
            animation: 'fadeInUp 0.4s ease-out 0.18s both',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: jornadaCompleta ? '#10b981' : 'var(--text-primary)' }}>
              {jornadaCompleta
                ? (publicado ? `✅ ¡${getNombreJornada(jornada)} completa y publicada!` : `✅ ¡${getNombreJornada(jornada)} completa!`)
                : `${getNombreJornada(jornada)}: ${predichasEnJornada}/${totalEnJornada} partidos predichos`}
            </p>
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-bebas)', color: jornadaCompleta ? '#10b981' : 'var(--accent-gold)' }}>
              {porcentaje}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${porcentaje}%`,
                background: jornadaCompleta
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #ea580c, #f97316)',
              }}
            />
          </div>
          {jornadaCompleta && !publicado && (
            <div className="pt-2">
              <button
                onClick={handlePublicar}
                disabled={publicando}
                className="w-full py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#10b981', color: '#000', fontFamily: 'var(--font-rajdhani)' }}
              >
                {publicando ? 'Publicando...' : '📢 Publicar jornada'}
              </button>
              <p className="text-xs text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
                Tus predicciones no serán visibles para los demás hasta que las publiques.
              </p>
            </div>
          )}
          {jornadaCompleta && publicado && (
            <p className="text-xs mt-1" style={{ color: '#10b981' }}>
              Tus predicciones ya son visibles para todos los participantes
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          {jornada >= 5 && (
            <div className="flex gap-3 text-xs flex-wrap" style={{ color: '#64748b' }}>
              <span>⏱️ Tiempo reglamentario</span>
              <span>⏩ Prórroga</span>
              <span>🥅 Penales</span>
            </div>
          )}

          {/* Bracket Fase Final colapsable */}
          <div style={{ animation: 'fadeInUp 0.4s ease-out 0.15s both' }}>
            <button
              onClick={() => setBracketVisible(v => !v)}
              className="w-full flex items-center justify-between rounded-xl px-4 py-2.5 transition-all active:scale-[0.99]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--accent-gold)' }}>
                🏆 Bracket Fase Final
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                {bracketVisible ? '▲ Ocultar' : '▼ Ver bracket'}
              </span>
            </button>
            <MiniBracket partidos={bracketPartidos} visible={bracketVisible} />
          </div>

          <div className="space-y-3" style={{ animation: 'fadeInUp 0.4s ease-out 0.2s both' }}>
          {todosSinResolver ? (
            <div
              className="rounded-2xl p-6 text-center space-y-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-3xl">⏳</p>
              <p className="font-bold text-sm" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                Los equipos se definen al término de la Fase de Grupos (J3)
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Deadline: 28 jun 2026 · 13:00 CDMX
              </p>
            </div>
          ) : (
            resolvedPartidos.map(partido => (
              <div key={partido.id} id={`partido-${partido.id}`}>
                <PartidoCard
                  partido={partido}
                  prediccion={predicciones[partido.id] ?? null}
                  participacionPagada={predicciones[partido.id] ? participando : undefined}
                  onPredicir={estaBloquado(partido) ? undefined : setPartidoActivo}
                />
              </div>
            ))
          )}

          {/* Progreso bottom */}
          {totalEnJornada > 0 && (
            <div className="mt-6 mb-2">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Progreso {getNombreJornada(jornada)}</span>
                <span>{predichasEnJornada}/{totalEnJornada}</span>
              </div>
              <div className="w-full bg-themedcard rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${totalEnJornada > 0 ? (predichasEnJornada / totalEnJornada) * 100 : 0}%`,
                    background: jornadaCompleta
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #ea580c, #f97316)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Botón publicar bottom */}
          {jornadaCompleta && !publicado && (
            <button
              onClick={handlePublicar}
              disabled={publicando}
              className="w-full text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              style={{ background: '#ea580c', fontFamily: 'var(--font-rajdhani)', boxShadow: '0 0 20px rgba(234,88,12,0.3)' }}
            >
              {publicando ? '⏳ Publicando...' : '📢 Publicar mi quiniela'}
            </button>
          )}

          {jornadaCompleta && publicado && (
            <div
              className="w-full py-4 rounded-xl text-center font-bold text-lg mt-2"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontFamily: 'var(--font-rajdhani)' }}
            >
              ✅ Quiniela publicada
            </div>
          )}
        </div>
        </>
      )}

      {/* ── PREDICCIÓN CAMPEÓN ── */}
      {jornada !== 6 && <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'fadeInUp 0.4s ease-out 0.03s both' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
          🏆 ¿Quién será el Campeón Mundial?
        </p>

        {campeonEquipos.length === 0 ? (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
          </div>
        ) : (<>
          {campeonAcerto && (
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.4)' }}>
              <p className="font-bold" style={{ color: '#fbbf24', fontFamily: 'var(--font-rajdhani)' }}>
                ✅ ¡Acertaste! — {campeonDeclarado}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>🏆 Tienes el badge de Campeón</p>
            </div>
          )}

          {campeonFallo && (
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                ❌ No fue {miCampeonPick} — ganó <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong>
              </p>
            </div>
          )}

          {campeonDeclarado && !miCampeonPick && (
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              No hiciste una predicción — ganó <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong>
            </p>
          )}

          {!campeonDeclarado && campeonDeadlinePasado && !miCampeonPick && (
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>No hiciste una predicción 🔒</p>
          )}

          {!campeonDeclarado && campeonDeadlinePasado && miCampeonPick && (
            <>
              <div className="rounded-xl p-3 flex items-center gap-2"
                style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)' }}>
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
                      <span style={{ color: s.equipo === miCampeonPick ? '#fbbf24' : 'var(--text-secondary)' }}>
                        {s.equipo}
                      </span>
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
                  <button
                    key={equipo}
                    onClick={() => setCampeonPickTemp(equipo)}
                    className="py-2 px-1 rounded-lg text-xs font-semibold text-center transition-all active:scale-95"
                    style={{
                      background: campeonPickTemp === equipo ? '#ea580c' : 'var(--bg-card-hover)',
                      color: campeonPickTemp === equipo ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${campeonPickTemp === equipo ? '#ea580c' : 'var(--border)'}`,
                      fontFamily: 'var(--font-rajdhani)',
                    }}
                  >
                    {equipo}
                  </button>
                ))}
              </div>
              <button
                onClick={guardarCampeonPick}
                disabled={!campeonPickTemp || campeonGuardando || campeonPickTemp === miCampeonPick}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                style={{ background: '#ea580c', color: '#fff', fontFamily: 'var(--font-rajdhani)' }}
              >
                {campeonGuardando ? '⏳ Guardando...' : miCampeonPick ? '🔄 Actualizar predicción' : '🏆 Guardar predicción'}
              </button>
            </>
          )}
        </>)}
      </div>}

      {/* ── RESUMEN DE PREDICCIONES DE CAMPEÓN ── */}
      {jornada !== 6 && todosMisPicksCampeon.length > 0 && (
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'fadeInUp 0.4s ease-out 0.05s both' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
            🏆 Predicciones de Campeón
          </p>
          {todosMisPicksCampeon.map((pick, i) => {
            const nombreQuiniela = pick.quiniela_extra_id
              ? quinielasExtra.find(q => q.id === pick.quiniela_extra_id)?.nombre
              : null;
            return (
              <div key={i} className="flex items-center justify-between text-sm py-1"
                style={{ borderBottom: i < todosMisPicksCampeon.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {nombreQuiniela ? `🎫 ${nombreQuiniela}` : 'Tu quiniela'}
                </span>
                <span className="font-semibold" style={{ color: '#fbbf24' }}>{pick.equipo}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PREDICCIÓN CAMPEÓN J6 — CUARTOS DE FINAL ── */}
      {jornada === 6 && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(234,88,12,0.3)', animation: 'fadeInUp 0.4s ease-out 0.03s both' }}
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
            <p className="text-xs text-center py-2" style={{ color: '#64748b' }}>
              Equipos pendientes de definirse
            </p>
          ) : new Date() > DEADLINE_J6 ? (
            j6Pick ? (
              <div className="rounded-xl p-3 flex items-center gap-2"
                style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)' }}>
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
                  <button
                    key={equipo}
                    onClick={() => setJ6PickTemp(equipo)}
                    className="py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    style={{
                      background: j6PickTemp === equipo ? '#ea580c' : 'var(--bg-card-hover)',
                      color: j6PickTemp === equipo ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${j6PickTemp === equipo ? '#ea580c' : 'var(--border)'}`,
                      fontFamily: 'var(--font-rajdhani)',
                    }}
                  >
                    <span>{BANDERAS_EQUIPOS[equipo] ?? ''}</span>
                    <span>{equipo}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={guardarJ6Pick}
                disabled={!j6PickTemp || j6Guardando || j6PickTemp === j6Pick}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                style={{ background: '#ea580c', color: '#fff', fontFamily: 'var(--font-rajdhani)' }}
              >
                {j6Guardando ? '⏳ Guardando...' : j6Pick ? '🔄 Actualizar pick' : '🏆 Guardar pick de Campeón'}
              </button>
            </>
          )}
        </div>
      )}

      {partidoActivo && userId && (
        <PrediccionForm
          partido={partidoActivo}
          userId={userId}
          quinielaExtraId={quinielaSeleccionada}
          prediccionExistente={predicciones[partidoActivo.id] ?? null}
          onGuardado={handleGuardado}
          onCancelar={() => setPartidoActivo(null)}
        />
      )}

      {/* Modal nueva quiniela */}
      {showNuevaQuiniela && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setShowNuevaQuiniela(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', color: '#ea580c', marginBottom: '1rem' }}>
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
              className="w-full rounded-lg px-3 py-2 mb-4 outline-none"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={crearQuiniela}
                disabled={!nombreNuevaQuiniela.trim()}
                className="flex-1 py-2 rounded-lg font-bold disabled:opacity-40"
                style={{ background: '#ea580c', color: '#fff', fontFamily: 'var(--font-rajdhani)' }}>
                Crear
              </button>
              <button
                onClick={() => setShowNuevaQuiniela(false)}
                className="px-4 py-2"
                style={{ color: '#64748b' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
