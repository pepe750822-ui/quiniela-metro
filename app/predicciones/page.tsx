'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Prediccion, Pozo } from '@/types';
import { getNombreJornada, getFechaKey, equiposE32, BANDERAS_EQUIPOS, getMontoJornada } from '@/lib/utils';
import PartidoCard from '@/components/PartidoCard';
import PrediccionForm from '@/components/PrediccionForm';
import { toast } from 'sonner';


const DEADLINE_J1 = new Date('2026-06-11T05:59:00Z');
const DEADLINE_J2 = new Date('2026-06-18T16:00:00Z'); // 18 jun 10:00 a.m. CDMX — primer partido J2
const DEADLINE_J3 = new Date('2026-06-24T19:00:00Z'); // 24 jun 13:00 CDMX — primer partido J3
const DEADLINE_J4 = new Date('2026-06-28T19:00:00Z');
const DEADLINE_J5 = new Date('2026-07-05T18:00:00Z'); // 5 jul 12:00 CDMX — primer Octavo
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

export default function PrediccionesPage() {
  const router = useRouter();
  const [userId, setUserId]               = useState<string | null>(null);
  const [partidos, setPartidos]           = useState<Partido[]>([]);
  const [predicciones, setPredicciones]   = useState<Record<string, Prediccion>>({});
  const [partidoActivo, setPartidoActivo] = useState<Partido | null>(null);
  const [loading, setLoading]             = useState(true);
  const [jornada, setJornada]             = useState(4);
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

  const cargarQuinielas = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('quiniela_extra')
      .select('*')
      .eq('user_id', uid)
      .eq('activa', true)
      .order('created_at');
    setQuinielasExtra(data || []);
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

  useEffect(() => { cargarPartidos(); }, [cargarPartidos]);
  useEffect(() => {
    if (userId) {
      cargarQuinielas(userId);
      cargarPredicciones();
      cargarCampeon();
      cargarPozoYParticipacion(userId, jornada);
    }
  }, [userId, jornada, cargarQuinielas, cargarPredicciones, cargarCampeon, cargarPozoYParticipacion]);

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
      )}

      {/* ── PREDICCIÓN CAMPEÓN ── */}
      <div
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
      </div>

      {/* ── RESUMEN DE PREDICCIONES DE CAMPEÓN ── */}
      {todosMisPicksCampeon.length > 0 && (
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
