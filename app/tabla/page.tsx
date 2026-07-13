'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';
import { getNombreJornada, BANDERAS_EQUIPOS } from '@/lib/utils';
import ReglasFaseFinal from '@/components/ReglasFaseFinal';

export default function TablaPage() {
  const [jornada, setJornada]           = useState(6);
  const [partidos, setPartidos]         = useState<any[]>([]);
  const [jugadores, setJugadores]       = useState<any[]>([]);
  const [predicciones, setPredicciones] = useState<any[]>([]);
  const [participaciones, setParticipaciones] = useState<any[]>([]);
  const [pozoParticipantes, setPozoParticipantes] = useState<number | null>(null);
  const [campeonJ6Declarado, setCampeonJ6Declarado] = useState<string | null>(null);
  const [esAdmin, setEsAdmin]           = useState(false);
  const [campeonPicks, setCampeonPicks] = useState<Record<string, string>>({});
  const [bonosCampeon, setBonosCampeon] = useState<Record<string, number>>({});
  const [loading, setLoading]           = useState(false);
  const tablaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const verificarAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('quiniela_jugadores')
        .select('rol')
        .eq('id', user.id)
        .single();
      setEsAdmin(data?.rol === 'admin');
    };
    verificarAdmin();
  }, []);

  useEffect(() => { refreshData(); }, [jornada]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (partidos.length === 0) return;
    if (tablaRef.current) {
      setTimeout(() => {
        const col = document.getElementById('col-pts');
        if (col) {
          col.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 800);
    }
  }, [partidos]);

  const refreshData = async () => {
    setLoading(true);
    const partidosQuery = supabase
      .from('quiniela_partidos')
      .select('id, jornada, equipo_local, equipo_visitante, bandera_local, bandera_visitante, goles_local, goles_visitante, estado, grupo, fecha_hora, clasificado, como_termino')
      .order('fecha_hora');
    const { data: parts } = jornada === 6
      ? await partidosQuery.gte('jornada', 6)
      : await partidosQuery.eq('jornada', jornada);
    setPartidos(parts || []);

    // Para J6 (Fase Final), incluir participaciones de J7+ igual que partidos
    const particsQuery = supabase
      .from('quiniela_participaciones')
      .select('id, user_id, pagado, publicado, quiniela_extra_id, jornada')
      .eq('pagado', true);
    const { data: particsRaw } = jornada === 6
      ? await particsQuery.gte('jornada', 6)
      : await particsQuery.eq('jornada', jornada);
    // Deduplicar por (user_id, quiniela_extra_id) manteniendo la participación de menor jornada
    let partics: any[] = [];
    if (jornada === 6) {
      const seen = new Map<string, any>();
      for (const p of (particsRaw || [])) {
        const key = `${p.user_id}:${p.quiniela_extra_id ?? 'null'}`;
        if (!seen.has(key) || seen.get(key).jornada > p.jornada) {
          seen.set(key, p);
        }
      }
      partics = [...seen.values()];
    } else {
      partics = particsRaw || [];
    }

    // Cargar nombres de quinielas extra
    const quinielaIds = [...new Set(
      (partics || []).map((p: any) => p.quiniela_extra_id).filter(Boolean)
    )] as string[];
    const quinielasMap: Record<string, string> = {};
    if (quinielaIds.length) {
      const { data: quinielasData } = await supabase
        .from('quiniela_extra').select('id, nombre').in('id', quinielaIds);
      (quinielasData || []).forEach((q: any) => { quinielasMap[q.id] = q.nombre; });
    }
    setParticipaciones((partics || []).map((p: any) => ({
      ...p,
      quiniela: p.quiniela_extra_id ? { nombre: quinielasMap[p.quiniela_extra_id] ?? null } : null,
    })));

    const userIds = [...new Set(partics?.map((p: any) => p.user_id) || [])];
    const { data: jugs } = await supabase
      .from('quiniela_jugadores')
      .select('id, nombre, apodo, referencia_admin, email')
      .in('id', userIds);
    setJugadores(jugs || []);

    const partidoIds = parts?.map((p: any) => p.id) || [];

    // Usar API route con service_role para bypassear RLS y ver predicciones de todos los usuarios
    const predsRes = await fetch('/api/predicciones-tabla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partidoIds }),
    });
    const { predicciones: allPreds = [] } = await predsRes.json();
    setPredicciones(allPreds);

    const { data: pozoDat } = await supabase
      .from('quiniela_pozo')
      .select('participantes, campeon_j6')
      .eq('jornada', jornada)
      .single();
    setPozoParticipantes(pozoDat?.participantes ?? null);
    setCampeonJ6Declarado(pozoDat?.campeon_j6 ?? null);

    // Campeón elegido (solo J6)
    const picksMap: Record<string, string> = {};
    if (jornada === 6 && userIds.length) {
      const { data: picks } = await supabase
        .from('quiniela_prediccion_campeon')
        .select('user_id, quiniela_extra_id, equipo')
        .eq('jornada', 6)
        .in('user_id', userIds);
      (picks || []).forEach((p: any) => { picksMap[`${p.user_id}:${p.quiniela_extra_id ?? 'null'}`] = p.equipo; });
    }
    setCampeonPicks(picksMap);

    // Bonos de campeón (solo J6)
    const bonosMap: Record<string, number> = {};
    if (jornada === 6 && userIds.length) {
      const { data: bonos } = await supabase
        .from('quiniela_bono_campeon')
        .select('user_id, quiniela_extra_id, puntos')
        .eq('jornada', 6)
        .in('user_id', userIds);
      (bonos || []).forEach((b: any) => {
        const k = `${b.user_id}:${b.quiniela_extra_id ?? 'null'}`;
        bonosMap[k] = (bonosMap[k] || 0) + b.puntos;
      });
    }
    setBonosCampeon(bonosMap);

    setLoading(false);
  };

  const mostrarNombre = (userId: string) => {
    const jugador = jugadores.find((j: any) => j.id === userId);
    return jugador?.apodo || jugador?.nombre?.split(' ')[0] || 'Jugador';
  };

  const getPred = (userId: string, partidoId: string, quinielaExtraId: string | null) => {
    const partido = partidos.find(p => p.id === partidoId);
    
    // Para J7 (Semifinales), buscar con fallback por quiniela_extra_id
    if (partido?.jornada === 7) {
      // 1. Buscar por user_id + partido_id
      let pred = predicciones.find((p: any) =>
        p.user_id === userId && p.partido_id === partidoId
      );
      
      // 2. Si no, buscar por quiniela_extra_id + partido_id
      if (!pred && quinielaExtraId) {
        pred = predicciones.find((p: any) =>
          p.quiniela_extra_id === quinielaExtraId &&
          p.partido_id === partidoId
        );
      }
      
      // ❌ ELIMINADO: nivel 3 (buscar solo por partido_id — devolvía predicciones de otro usuario)
      
      return pred ?? null;
    }
    
    // Para otras jornadas, comportamiento normal
    let pred = predicciones.find((p: any) =>
      p.user_id === userId &&
      p.partido_id === partidoId &&
      p.quiniela_extra_id === quinielaExtraId
    );
    if (!pred) {
      pred = predicciones.find((p: any) =>
        p.user_id === userId &&
        p.partido_id === partidoId
      );
    }
    return pred ?? null;
  };

  const iniciales = (userId: string) => {
    const j = jugadores.find((j: any) => j.id === userId);
    return (j?.apodo || j?.nombre || 'J').substring(0, 2).toUpperCase();
  };

  const ptsClass = (pts: number) => {
    if (pts === 3) return 'font-bold text-sm text-emerald-700 dark:text-emerald-400';
    if (pts === 1) return 'font-bold text-sm text-orange-700 dark:text-orange-400';
    return 'text-sm text-red-700 dark:text-red-400';
  };

  const emojiComoTermino = (como: string | null | undefined) => {
    if (como === 'reglamentario') return '⏱️';
    if (como === 'tiempo_extra')  return '⏱️';
    if (como === 'penales')       return '🥅';
    return '';
  };

  const getBanderaClasificado = (clasificadoPred: string, partido: any): string => {
    if (partido.equipo_local === clasificadoPred) return partido.bandera_local || BANDERAS_EQUIPOS[clasificadoPred] || clasificadoPred;
    if (partido.equipo_visitante === clasificadoPred) return partido.bandera_visitante || BANDERAS_EQUIPOS[clasificadoPred] || clasificadoPred;
    return BANDERAS_EQUIPOS[clasificadoPred] || clasificadoPred;
  };

  const descargarCSV = () => {
    const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

    const metadataRow = [
      `"Quiniela Metro Mundial 2026"`,
      `"Jornada ${jornada}"`,
      `"Generado: ${ahora}"`,
      `"RESPALDO COMPLETO"`,
    ].join(',');

    const headers = [
      '"ID Participación"',
      '"User ID"',
      '"Jugador"',
      '"Apodo"',
      '"Quiniela"',
      '"Pagado"',
      '"Publicado"',
      ...partidos.map(p =>
        `"${p.equipo_local.substring(0, 3).toUpperCase()}vs${p.equipo_visitante.substring(0, 3).toUpperCase()}"`
      ),
      '"TOTAL PTS"',
      '"EXACTOS"',
      '"Email"',
    ].join(',');

    const filas = participaciones.map((part: any) => {
      const jugador = jugadores.find((j: any) => j.id === part.user_id);
      const nombre = jugador?.nombre || 'Sin nombre';
      const apodo = jugador?.apodo || '';
      const email = jugador?.email || '';
      const quinielaNombre = part.quiniela?.nombre || 'Principal';

      const celdas = partidos.map((partido: any) => {
        const pred = getPred(part.user_id, partido.id, part.quiniela_extra_id);
        if (!pred) return '""';
        if (partido.estado === 'finalizado') {
          return `"${pred.puntos_ganados}pts (${pred.goles_local_pred}/${pred.goles_visitante_pred})"`;
        }
        return `"${pred.goles_local_pred}/${pred.goles_visitante_pred}"`;
      });

      const predsFinalizadas = predicciones.filter((p: any) =>
        p.user_id === part.user_id &&
        (p.quiniela_extra_id === part.quiniela_extra_id ||
          (!p.quiniela_extra_id && !part.quiniela_extra_id)) &&
        partidos.find((partido: any) =>
          partido.id === p.partido_id && partido.estado === 'finalizado'
        )
      );
      const total = predsFinalizadas.reduce((sum: number, p: any) => sum + (p.puntos_ganados || 0), 0);
      const exactos = predsFinalizadas.filter((p: any) => p.puntos_ganados === 3).length;

      return [
        `"${part.id}"`,
        `"${part.user_id}"`,
        `"${nombre}"`,
        `"${apodo}"`,
        `"${quinielaNombre}"`,
        `"${part.pagado ? 'SI' : 'NO'}"`,
        `"${part.publicado ? 'SI' : 'NO'}"`,
        ...celdas,
        `"${total}"`,
        `"${exactos}"`,
        `"${email}"`,
      ].join(',');
    });

    const headerPartidos = [
      '"ID Partido"',
      '"Jornada"',
      '"Grupo"',
      '"Equipo Local"',
      '"Equipo Visitante"',
      '"Goles Local"',
      '"Goles Visitante"',
      '"Estado"',
      '"Fecha CDMX"',
    ].join(',');

    const filasPartidos = partidos.map((p: any) => [
      `"${p.id}"`,
      `"${p.jornada}"`,
      `"${p.grupo}"`,
      `"${p.equipo_local}"`,
      `"${p.equipo_visitante}"`,
      `"${p.goles_local ?? ''}"`,
      `"${p.goles_visitante ?? ''}"`,
      `"${p.estado}"`,
      `"${new Date(p.fecha_hora).toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })}"`,
    ].join(','));

    const csvContent = [
      metadataRow,
      '',
      '"=== PREDICCIONES Y PUNTOS ==="',
      headers,
      ...filas,
      '',
      '"=== PARTIDOS Y RESULTADOS ==="',
      headerPartidos,
      ...filasPartidos,
      '',
      `"Descargado el ${ahora}"`,
    ].join('\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiniela-metro-jornada${jornada}-respaldo-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('✅ CSV descargado con respaldo completo');
  };

  const calcTotal = (part: any) => {
    const own = predicciones.filter((p: any) =>
      p.user_id === part.user_id &&
      (p.quiniela_extra_id === part.quiniela_extra_id ||
        (!p.quiniela_extra_id && !part.quiniela_extra_id))
    );
    const pool = (own.length === 0 && part.quiniela_extra_id)
      ? predicciones.filter((p: any) => p.user_id === part.user_id && !p.quiniela_extra_id)
      : own;
    const base = pool
      .filter((p: any) => partidos.find((partido: any) => partido.id === p.partido_id && partido.estado === 'finalizado'))
      .reduce((sum: number, p: any) => sum + (p.puntos_ganados || 0), 0);
    const bono = jornada === 6 ? (bonosCampeon[`${part.user_id}:${part.quiniela_extra_id ?? 'null'}`] || 0) : 0;
    return base + bono;
  };

  const participacionesOrdenadas = participaciones
    .map(part => ({ ...part, puntosTotal: calcTotal(part) }))
    .sort((a, b) => b.puntosTotal - a.puntosTotal);

  const participacionesConPrediccion = participacionesOrdenadas
    .filter(part =>
      predicciones.some((p: any) =>
        p.user_id === part.user_id &&
        (p.quiniela_extra_id === part.quiniela_extra_id ||
          (!p.quiniela_extra_id && !part.quiniela_extra_id) ||
          // Quinielas extra sin predicciones propias: el usuario tiene al menos el slot principal
          (!!part.quiniela_extra_id && !p.quiniela_extra_id))
      )
    );

  const partidosMitad1 = partidos.slice(0, 12);
  const partidosMitad2 = partidos.slice(12);

  const finalizados = partidos.filter((p: any) => p.estado === 'finalizado');
  const pendientes  = partidos.filter((p: any) => p.estado !== 'finalizado');

  // Campeón declarado cuando la Final (J9) está finalizada
  const campeonDeclarado = jornada === 6 && campeonJ6Declarado !== null;


  const renderFilasPrint = (mitad: any[]) =>
    participacionesConPrediccion.map((part: any) => {
      const jugador = jugadores.find((j: any) => j.id === part.user_id) as any;
      const nombre = jugador?.apodo || jugador?.nombre?.split(' ')[0] || 'Jugador';
      const quinielaNombre = part.quiniela?.nombre;
      const totalPuntos = calcTotal(part);
      return (
        <tr key={part.id} style={{ borderBottom: '0.5px solid #ddd' }}>
          <td style={{ background: '#f5f5f5', padding: '3px 4px', fontWeight: 'bold', fontSize: '8px' }}>
            {nombre}
            {quinielaNombre && <div style={{ color: '#c2410c', fontSize: '7px' }}>{quinielaNombre}</div>}
          </td>
          {mitad.map((partido: any) => {
            const pred = getPred(part.user_id, partido.id, part.quiniela_extra_id);
            const pts = pred?.puntos_ganados;
            const color = pts === 3 ? '#16a34a' : pts === 1 ? '#ea580c' : pts === 0 ? '#dc2626' : '#666';
            return (
              <td key={partido.id} style={{ border: '0.5px solid #ddd', padding: '2px', textAlign: 'center' }}>
                {pred ? (
                  <>
                    {partido.estado === 'finalizado' && (
                      <div style={{ color, fontWeight: 'bold', fontSize: '8px' }}>{pts}pts</div>
                    )}
                    <div style={{ color: '#555', fontSize: '7px' }}>
                      {pred.goles_local_pred}/{pred.goles_visitante_pred}
                    </div>
                  </>
                ) : (
                  <span style={{ color: '#ccc' }}>–</span>
                )}
              </td>
            );
          })}
          <td style={{ background: '#fff3e0', color: '#c2410c', fontWeight: 'bold', textAlign: 'center', fontSize: '10px' }}>
            {totalPuntos}
          </td>
        </tr>
      );
    });

  const renderHeadersPrint = (mitad: any[]) => (
    <tr>
      <th style={{ background: '#333', color: 'white', padding: '4px', textAlign: 'left', width: '80px' }}>Jugador</th>
      {mitad.map((p: any) => (
        <th key={p.id} style={{ background: '#333', color: 'white', padding: '2px', textAlign: 'center', fontSize: '7px', border: '0.5px solid #666' }}>
          <div>{p.equipo_local.substring(0, 3).toUpperCase()}</div>
          <div style={{ color: '#aaa', fontSize: '6px' }}>vs</div>
          <div>{p.equipo_visitante.substring(0, 3).toUpperCase()}</div>
          {p.estado === 'finalizado' && (
            <div style={{ color: '#fb923c', fontWeight: 'bold' }}>{p.goles_local}-{p.goles_visitante}</div>
          )}
        </th>
      ))}
      <th style={{ background: '#c2410c', color: 'white', padding: '4px', textAlign: 'center', width: '28px' }}>PTS</th>
    </tr>
  );

  return (
    <div className="min-h-screen bg-base pb-24">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: '#ea580c', letterSpacing: '0.05em' }}>
            📊 TABLA DE PUNTOS
          </h1>
          <div className="ml-auto flex gap-2">
            {esAdmin && (
              <button
                onClick={refreshData}
                disabled={loading}
                className="text-xs bg-[#12121a] border border-[#1e1e2e] text-slate-400 px-3 py-1.5 rounded-lg hover:border-orange-500/40 hover:text-orange-400 transition-all disabled:opacity-50"
              >
                {loading ? '⏳' : '🔄'} Actualizar
              </button>
            )}
            <button
              onClick={descargarCSV}
              className="flex items-center gap-2 px-4 py-1.5 bg-surface border border-theme rounded-lg text-slate-400 text-sm hover:border-orange-500/40 hover:text-orange-400 transition-all"
              style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 'bold' }}
            >
              ⬇️ CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all"
              style={{
                fontFamily: 'var(--font-rajdhani)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              🖨️ PDF
            </button>
          </div>
        </div>

        {/* Selector jornada */}
        <div className="flex gap-2 mt-3">
          {[1, 2, 3, 4, 5, 6].map(j => (
            <button
              key={j}
              onClick={() => setJornada(j)}
              className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all active:scale-95"
              style={{
                fontFamily: 'var(--font-rajdhani)',
                background: jornada === j ? '#ea580c' : 'var(--bg-card)',
                color: jornada === j ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${jornada === j ? '#ea580c' : 'var(--border-color)'}`,
              }}
            >
              {getNombreJornada(j)}
            </button>
          ))}
        </div>
      </div>

      {/* Reglas Fase Final — solo J6 */}
      {jornada === 6 && (
        <div className="mb-2">
          <ReglasFaseFinal />
        </div>
      )}

      {/* Indicador comparativo Pozo vs Tabla */}
      <div className="px-4 mb-2 print:hidden">
        <div className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)' }}>
          <span style={{ color: '#94a3b8' }}>
            {'👥 Pozo: '}
            <strong style={{ color: '#e2e8f0' }}>{pozoParticipantes ?? '…'}</strong>
            {' · Tabla: '}
            <strong style={{ color: '#e2e8f0' }}>{participaciones.length}</strong>
            {' '}
          </span>
          {pozoParticipantes !== null && (
            pozoParticipantes === participaciones.length
              ? <span style={{ color: '#22c55e' }}>✅</span>
              : <span style={{ color: '#f59e0b' }}>⚠️</span>
          )}
        </div>
      </div>

      {/* Tabla horizontal scrollable — oculta al imprimir */}
      <div ref={tablaRef} className="overflow-x-auto overflow-y-auto px-2 print:hidden" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <table className="min-w-max print:min-w-0 print:w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20">
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th className="sticky left-0 z-30 text-left px-3 py-3 min-w-[130px]"
                style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: '#ea580c' }}>Jugador</span>
              </th>
              <th className="sticky left-[130px] z-20 px-3 py-2 text-center min-w-[55px]"
                style={{ background: 'var(--bg-base)', borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: '#ea580c' }}>
                PTS
              </th>
              {finalizados.map(partido => (
                <th key={partido.id}
                  className="px-2 py-2 text-center min-w-[70px]"
                  style={{ background: 'var(--bg-base)', borderLeft: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Bandera emoji={partido.bandera_local ?? ''} nombre={partido.equipo_local} size="sm" />
                    <span style={{ fontSize: '0.625rem', color: '#475569' }}>vs</span>
                    <Bandera emoji={partido.bandera_visitante ?? ''} nombre={partido.equipo_visitante} size="sm" />
                  </div>
                  <div className="rounded px-1 py-0.5 font-bold text-xs"
                    style={{ background: 'rgba(234,88,12,0.2)', border: '1px solid rgba(234,88,12,0.3)', color: '#fb923c' }}>
                    {partido.goles_local}-{partido.goles_visitante}
                  </div>
                  {jornada >= 5 && partido.clasificado && (
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <Bandera emoji={BANDERAS_EQUIPOS[partido.clasificado] ?? ''} nombre={partido.clasificado} size="sm" />
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                        {emojiComoTermino(partido.como_termino)}
                      </span>
                    </div>
                  )}
                </th>
              ))}
              <th id="col-pts" className="px-3 py-2 text-center min-w-[55px]"
                style={{ background: 'var(--bg-base)', borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: '#ea580c' }}>
                PTS
              </th>
              {pendientes.map(partido => (
                <th key={partido.id} id={`col-${partido.id}`}
                  className="px-2 py-2 text-center min-w-[70px]"
                  style={{ background: 'var(--bg-base)', borderLeft: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Bandera emoji={partido.bandera_local ?? ''} nombre={partido.equipo_local} size="sm" />
                    <span style={{ fontSize: '0.625rem', color: '#475569' }}>vs</span>
                    <Bandera emoji={partido.bandera_visitante ?? ''} nombre={partido.equipo_visitante} size="sm" />
                  </div>
                  {partido.estado === 'en_curso' ? (
                    <div className="rounded px-1 py-0.5 text-[10px] font-bold animate-pulse"
                      style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                      🔴 EN VIVO
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.625rem', color: '#334155' }}>pendiente</div>
                  )}
                </th>
              ))}
              {jornada !== 6 && (
                <th className="px-3 py-2 text-center min-w-[55px]"
                  style={{ background: 'var(--bg-base)', borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: '#ea580c' }}>
                  PTS
                </th>
              )}
              {jornada === 6 && (
                <th className="px-3 py-2 text-center min-w-[72px]"
                  style={{ background: 'var(--bg-base)', borderLeft: '1px solid rgba(251,191,36,0.4)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-bebas)', fontSize: '0.75rem', color: '#fbbf24' }}>
                  🏆 +5
                </th>
              )}
              {jornada === 6 && (
                <th className="px-3 py-2 text-center min-w-[55px]"
                  style={{ background: 'var(--bg-base)', borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: '#ea580c' }}>
                  PTS
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {participacionesOrdenadas.map((part, idx) => {
              const jugador = jugadores.find((j: any) => j.id === part.user_id);
              const totalPuntos = calcTotal(part);
              const campKey   = `${part.user_id}:${part.quiniela_extra_id ?? 'null'}`;
              const campPick  = campeonPicks[campKey];
              const campBono  = bonosCampeon[campKey];
              const campAcerto = campBono !== undefined && campBono > 0;
              const campFallo  = campeonDeclarado && !campAcerto;

              return (
                <tr key={part.id}>
                  <td className="sticky left-0 z-10 px-3 py-3" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-600 w-4 text-right shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'rgba(234,88,12,0.2)', border: '1px solid rgba(234,88,12,0.3)', color: '#fb923c' }}>
                        {iniciales(part.user_id)}
                      </div>
                      <div>
                        <p className="font-bold text-sm whitespace-nowrap text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                          {mostrarNombre(part.user_id)}
                        </p>
                        {part.quiniela?.nombre && (
                          <p className="text-[10px]" style={{ color: '#fb923c' }}>🎫 {part.quiniela.nombre}</p>
                        )}
                        {esAdmin && jugador?.referencia_admin && (
                          <p className="text-xs text-blue-400">📋 {jugador.referencia_admin}</p>
                        )}
                        {esAdmin && (
                          <p className="text-xs text-slate-500">
                            {jugador?.email?.split('@')[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="sticky left-[130px] z-20 px-3 py-2 text-center text-xl text-orange-600 dark:text-orange-400"
                    style={{ background: 'var(--bg-base)', borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-bebas)' }}>
                    {totalPuntos}
                  </td>
                  {finalizados.map(partido => {
                    const pred = getPred(part.user_id, partido.id, part.quiniela_extra_id);
                    const pts = pred?.puntos_ganados ?? null;
                    if (partido.jornada >= 5) {
                      // ── desglose J5+ ─────────────────────────────
                      if (pts !== null && pred) {
                        const ptsClasif = (partido.clasificado && pred.clasificado_pred === partido.clasificado) ? 1 : 0;
                        const ptsComo   = (partido.como_termino && pred.como_termina_pred === partido.como_termino) ? 1 : 0;
                        const ptsBase   = Math.max(0, pts - ptsClasif - ptsComo);
                        const emojiPartidoComo = partido.como_termino === 'penales' ? '🥅'
                          : partido.como_termino === 'tiempo_extra' ? '⏩' : '⏱️';
                        const banderaClasif = pred.clasificado_pred
                          ? getBanderaClasificado(pred.clasificado_pred, partido) : null;
                        const totalColor = pts >= 4 ? '#eab308' : pts === 3 ? '#10b981'
                          : pts === 2 ? '#60a5fa' : pts === 1 ? '#f97316' : '#ef4444';
                        return (
                          <td key={partido.id}
                            className="px-1 py-1 text-center"
                            style={{ borderLeft: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', minWidth: 64 }}>
                            <div style={{ fontSize: 9, lineHeight: '1.55', color: '#94a3b8' }}>
                              <div>{pred.goles_local_pred}-{pred.goles_visitante_pred}</div>
                              {(pred.clasificado_pred || pred.como_termina_pred) && (
                                <div style={{ color: '#64748b' }}>
                                  {pred.clasificado_pred ? getBanderaClasificado(pred.clasificado_pred, partido) : ''}
                                  {pred.clasificado_pred && pred.como_termina_pred ? ' ' : ''}
                                  {pred.como_termina_pred === 'reglamentario' ? '⏱️' : pred.como_termina_pred === 'tiempo_extra' ? '⏩' : pred.como_termina_pred === 'penales' ? '🥅' : ''}
                                </div>
                              )}
                              <div style={{ color: ptsBase >= 3 ? '#10b981' : ptsBase >= 1 ? '#f97316' : '#ef4444' }}>
                                {ptsBase >= 3 ? '⚽⚽⚽' : ptsBase >= 1 ? '⚽' : '✗'} {ptsBase}pt{ptsBase !== 1 ? 's' : ''}
                              </div>
                              {partido.clasificado && (
                                <div style={{ color: ptsClasif ? '#10b981' : '#ef4444' }}>
                                  {banderaClasif ?? '?'} {ptsClasif ? '+1pt' : '+0'}
                                </div>
                              )}
                              {partido.como_termino && (
                                <div style={{ color: ptsComo ? '#10b981' : '#ef4444' }}>
                                  {emojiPartidoComo} {ptsComo ? '+1pt' : '+0'}
                                </div>
                              )}
                              <div style={{ borderTop: '1px solid rgba(148,163,184,0.2)', marginTop: 2, paddingTop: 2, fontWeight: 700, fontSize: 11, color: totalColor }}>
                                {pts}pts
                              </div>
                            </div>
                          </td>
                        );
                      }
                      // J5+ sin puntos aún (partido no finalizado o sin pred)
                      const bandera = pred?.clasificado_pred
                        ? getBanderaClasificado(pred.clasificado_pred, partido) : null;
                      const emojiTermina = pred?.como_termina_pred === 'reglamentario' ? '⏱️'
                        : pred?.como_termina_pred === 'tiempo_extra' ? '⏩'
                        : pred?.como_termina_pred === 'penales' ? '🥅' : '';
                      return (
                        <td key={partido.id}
                          className="px-1 py-2 text-center"
                          style={{ borderLeft: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                          {pred ? (
                            <>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                {pred.goles_local_pred}-{pred.goles_visitante_pred}
                              </div>
                              {(bandera || emojiTermina) && (
                                <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                                  {[bandera, emojiTermina].filter(Boolean).join(' ')}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-sm text-slate-400 dark:text-slate-600">–</div>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td key={partido.id}
                        className="px-1 py-2 text-center"
                        style={{ borderLeft: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                        {pts !== null ? (
                          <div className={ptsClass(pts)}>{pts}pts</div>
                        ) : (
                          <div className="text-sm text-slate-400 dark:text-slate-600">–</div>
                        )}
                        {pred && (
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {pred.goles_local_pred}-{pred.goles_visitante_pred}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center text-xl text-orange-600 dark:text-orange-400"
                    style={{ borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-bebas)' }}>
                    {totalPuntos}
                  </td>
                  {pendientes.map(partido => {
                    const pred = getPred(part.user_id, partido.id, part.quiniela_extra_id);
                    return (
                      <td key={partido.id}
                        className="px-1 py-2 text-center"
                        style={{ borderLeft: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                        {pred ? (
                          <>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {pred.goles_local_pred}-{pred.goles_visitante_pred}
                            </div>
                            {partido.jornada >= 5 && (pred.clasificado_pred || pred.como_termina_pred) && (
                              <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                                {[
                                  pred.clasificado_pred ? getBanderaClasificado(pred.clasificado_pred, partido) : null,
                                  pred.como_termina_pred === 'reglamentario' ? '⏱️'
                                    : pred.como_termina_pred === 'tiempo_extra' ? '⏩'
                                    : pred.como_termina_pred === 'penales' ? '🥅' : null,
                                ].filter(Boolean).join(' ')}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-sm">–</span>
                        )}
                      </td>
                    );
                  })}
                  {jornada !== 6 && (
                    <td className="px-3 py-2 text-center text-xl text-orange-600 dark:text-orange-400"
                      style={{ borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-bebas)' }}>
                      {totalPuntos}
                    </td>
                  )}
                  {jornada === 6 && (
                    <td className="px-2 py-2 text-center"
                      style={{ borderLeft: '1px solid rgba(251,191,36,0.3)', borderBottom: '1px solid var(--border-color)', minWidth: 72 }}>
                      {campAcerto ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <div style={{ fontSize: 14, lineHeight: 1 }}>✅</div>
                          <div style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>+5pts</div>
                          {campPick && (
                            <div className="flex items-center justify-center gap-0.5">
                              <Bandera emoji={BANDERAS_EQUIPOS[campPick] ?? ''} nombre={campPick} size="sm" />
                              <span style={{ fontSize: '0.6rem', color: '#22c55e' }}>{campPick}</span>
                            </div>
                          )}
                        </div>
                      ) : campFallo ? (
                        <div>
                          <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>✗</div>
                          {campPick && (
                            <div className="flex items-center justify-center gap-0.5 mt-0.5">
                              <Bandera emoji={BANDERAS_EQUIPOS[campPick] ?? ''} nombre={campPick} size="sm" />
                              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>{campPick}</span>
                            </div>
                          )}
                        </div>
                      ) : campPick ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <Bandera emoji={BANDERAS_EQUIPOS[campPick] ?? ''} nombre={campPick} size="sm" />
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-primary)' }}>{campPick}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: '#475569' }}>—</span>
                      )}
                    </td>
                  )}
                  {jornada === 6 && (
                    <td className="px-3 py-2 text-center text-xl text-orange-600 dark:text-orange-400"
                      style={{ borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-bebas)' }}>
                      {totalPuntos}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {participaciones.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: '#475569' }}>
            Aún no hay participantes en esta jornada.
          </p>
        )}
      </div>

      {/* Leyenda */}
      <div className="px-4 mt-4 flex flex-wrap gap-4 text-xs leyenda" style={{ color: '#475569' }}>
        {jornada < 5 ? (
          <>
            <span style={{ color: '#34d399' }}>■ 3pts exacto</span>
            <span style={{ color: '#fb923c' }}>■ 1pt resultado</span>
            <span style={{ color: '#f87171' }}>■ 0pts fallo</span>
            <span style={{ color: '#64748b' }}>■ predicción pendiente</span>
          </>
        ) : (
          <>
            <span style={{ color: '#eab308' }}>■ 5pts</span>
            <span style={{ color: '#9333ea' }}>■ 4pts</span>
            <span style={{ color: '#059669' }}>■ 3pts</span>
            <span style={{ color: '#2563eb' }}>■ 2pts</span>
            <span style={{ color: '#f97316' }}>■ 1pt</span>
            <span style={{ color: '#b91c1c' }}>■ 0pts</span>
            <span style={{ color: '#64748b' }}>■ pendiente</span>
            <span style={{ color: '#94a3b8' }}>⏱️ T. Reglamentario · ⏩ Prórroga · 🥅 Penales</span>
          </>
        )}
      </div>

      {/* Tablas para impresión — ocultas en pantalla */}
      <div className="hidden print:block">

        {/* Primera hoja: partidos 1-12 */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '18px', color: '#e65100', marginBottom: '4px' }}>
            📊 TABLA DE PUNTOS — J{jornada} (Partidos 1–{Math.min(12, partidos.length)})
          </h1>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
            <thead>{renderHeadersPrint(partidosMitad1)}</thead>
            <tbody>{renderFilasPrint(partidosMitad1)}</tbody>
          </table>
        </div>

        {/* Segunda hoja: partidos 13-24 */}
        {partidosMitad2.length > 0 && (
          <div style={{ pageBreakBefore: 'always' }}>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '18px', color: '#e65100', marginBottom: '4px' }}>
              📊 TABLA DE PUNTOS — J{jornada} (Partidos 13–{partidos.length})
            </h1>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
              <thead>{renderHeadersPrint(partidosMitad2)}</thead>
              <tbody>{renderFilasPrint(partidosMitad2)}</tbody>
            </table>
            <div style={{ marginTop: '8px', fontSize: '8px', color: '#555' }}>
              🟢 3pts = exacto &nbsp; 🟠 1pt = resultado &nbsp; 🔴 0pts = fallo
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
