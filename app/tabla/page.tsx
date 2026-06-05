'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';

export default function TablaPage() {
  const [jornada, setJornada]           = useState(1);
  const [partidos, setPartidos]         = useState<any[]>([]);
  const [jugadores, setJugadores]       = useState<any[]>([]);
  const [predicciones, setPredicciones] = useState<any[]>([]);
  const [participaciones, setParticipaciones] = useState<any[]>([]);

  useEffect(() => { cargarDatos(); }, [jornada]);

  const cargarDatos = async () => {
    const { data: parts } = await supabase
      .from('quiniela_partidos')
      .select('id, jornada, equipo_local, equipo_visitante, bandera_local, bandera_visitante, goles_local, goles_visitante, estado, grupo, fecha_hora')
      .eq('jornada', jornada)
      .not('equipo_local', 'eq', 'A definir')
      .order('fecha_hora');
    setPartidos(parts || []);

    const { data: partics } = await supabase
      .from('quiniela_participaciones')
      .select('id, user_id, pagado, publicado, quiniela_extra_id')
      .eq('jornada', jornada)
      .eq('pagado', true);

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
      .select('id, nombre, apodo, email')
      .in('id', userIds);
    setJugadores(jugs || []);

    const partidoIds = parts?.map((p: any) => p.id) || [];
    const { data: preds } = await supabase
      .from('quiniela_predicciones')
      .select('user_id, partido_id, goles_local_pred, goles_visitante_pred, puntos_ganados, quiniela_extra_id')
      .in('partido_id', partidoIds);
    setPredicciones(preds || []);
  };

  const mostrarNombre = (userId: string) => {
    const jugador = jugadores.find((j: any) => j.id === userId);
    return jugador?.apodo || jugador?.nombre?.split(' ')[0] || 'Jugador';
  };

  const getPred = (userId: string, partidoId: string, quinielaExtraId: string | null) =>
    predicciones.find((p: any) =>
      p.user_id === userId &&
      p.partido_id === partidoId &&
      (p.quiniela_extra_id === quinielaExtraId ||
        (!p.quiniela_extra_id && !quinielaExtraId))
    ) ?? null;

  const iniciales = (userId: string) => {
    const j = jugadores.find((j: any) => j.id === userId);
    return (j?.apodo || j?.nombre || 'J').substring(0, 2).toUpperCase();
  };

  const ptsColor = (pts: number) => {
    if (pts === 3) return '#34d399';
    if (pts === 1) return '#fb923c';
    return '#f87171';
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
        const pred = predicciones.find((p: any) =>
          p.user_id === part.user_id &&
          p.partido_id === partido.id &&
          (p.quiniela_extra_id === part.quiniela_extra_id ||
            (!p.quiniela_extra_id && !part.quiniela_extra_id))
        );
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

  return (
    <div className="min-h-screen bg-base pb-24">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: '#ea580c', letterSpacing: '0.05em' }}>
            📊 TABLA DE PUNTOS
          </h1>
          <div className="ml-auto flex gap-2">
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
                background: '#12121a',
                border: '1px solid #1e1e2e',
                color: '#64748b',
              }}
            >
              🖨️ PDF
            </button>
          </div>
        </div>

        {/* Selector jornada */}
        <div className="flex gap-2 mt-3">
          {[1, 2, 3].map(j => (
            <button
              key={j}
              onClick={() => setJornada(j)}
              className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all active:scale-95"
              style={{
                fontFamily: 'var(--font-rajdhani)',
                background: jornada === j ? '#ea580c' : '#12121a',
                color: jornada === j ? '#fff' : '#64748b',
                border: `1px solid ${jornada === j ? '#ea580c' : '#1e1e2e'}`,
              }}
            >
              J{j}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla horizontal scrollable */}
      <div className="overflow-x-auto px-2 print:overflow-visible">
        <table className="min-w-max print:min-w-0 print:w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1e2e' }}>
              <th className="sticky left-0 z-10 text-left px-3 py-3 min-w-[130px]"
                style={{ background: '#0a0a0a', borderBottom: '1px solid #1e1e2e' }}>
                <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: '#ea580c' }}>Jugador</span>
              </th>
              {partidos.map(partido => (
                <th key={partido.id}
                  className="px-2 py-2 text-center min-w-[70px]"
                  style={{ borderLeft: '1px solid #1e1e2e', borderBottom: '1px solid #1e1e2e' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Bandera emoji={partido.bandera_local ?? ''} nombre={partido.equipo_local} size="sm" />
                    <span style={{ fontSize: '0.625rem', color: '#475569' }}>vs</span>
                    <Bandera emoji={partido.bandera_visitante ?? ''} nombre={partido.equipo_visitante} size="sm" />
                  </div>
                  {partido.estado === 'finalizado' ? (
                    <div className="rounded px-1 py-0.5 font-bold text-xs"
                      style={{ background: 'rgba(234,88,12,0.2)', border: '1px solid rgba(234,88,12,0.3)', color: '#fb923c' }}>
                      {partido.goles_local}-{partido.goles_visitante}
                    </div>
                  ) : partido.estado === 'en_curso' ? (
                    <div className="rounded px-1 py-0.5 text-[10px] font-bold animate-pulse"
                      style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                      🔴 EN VIVO
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.625rem', color: '#334155' }}>pendiente</div>
                  )}
                </th>
              ))}
              <th className="px-3 py-2 text-center min-w-[55px]"
                style={{ borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid #1e1e2e', fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: '#ea580c' }}>
                PTS
              </th>
            </tr>
          </thead>
          <tbody>
            {participaciones.map(part => {
              const totalPuntos = predicciones
                .filter((p: any) =>
                  p.user_id === part.user_id &&
                  (p.quiniela_extra_id === part.quiniela_extra_id ||
                    (!p.quiniela_extra_id && !part.quiniela_extra_id)) &&
                  partidos.find((partido: any) =>
                    partido.id === p.partido_id && partido.estado === 'finalizado'
                  )
                )
                .reduce((sum: number, p: any) => sum + (p.puntos_ganados || 0), 0);

              return (
                <tr key={part.id}>
                  <td className="sticky left-0 z-10 px-3 py-3" style={{ background: '#0a0a0a', borderBottom: '1px solid #1e1e2e' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'rgba(234,88,12,0.2)', border: '1px solid rgba(234,88,12,0.3)', color: '#fb923c' }}>
                        {iniciales(part.user_id)}
                      </div>
                      <div>
                        <p className="font-bold text-sm whitespace-nowrap" style={{ color: '#fff', fontFamily: 'var(--font-rajdhani)' }}>
                          {mostrarNombre(part.user_id)}
                        </p>
                        {part.quiniela?.nombre && (
                          <p className="text-[10px]" style={{ color: '#fb923c' }}>🎫 {part.quiniela.nombre}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {partidos.map(partido => {
                    const pred = getPred(part.user_id, partido.id, part.quiniela_extra_id);
                    if (partido.estado === 'finalizado') {
                      const pts = pred?.puntos_ganados ?? null;
                      return (
                        <td key={partido.id}
                          className="px-1 py-2 text-center"
                          style={{ borderLeft: '1px solid #1e1e2e', borderBottom: '1px solid #1e1e2e' }}>
                          {pts !== null ? (
                            <div className="font-bold text-sm" style={{ color: ptsColor(pts) }}>
                              {pts}pts
                            </div>
                          ) : (
                            <div className="text-sm" style={{ color: '#334155' }}>–</div>
                          )}
                          {pred && (
                            <div className="text-xs" style={{ color: '#64748b' }}>
                              {pred.goles_local_pred}-{pred.goles_visitante_pred}
                            </div>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td key={partido.id}
                        className="px-1 py-2 text-center"
                        style={{ borderLeft: '1px solid #1e1e2e', borderBottom: '1px solid #1e1e2e' }}>
                        {pred ? (
                          <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
                            {pred.goles_local_pred}-{pred.goles_visitante_pred}
                          </div>
                        ) : (
                          <span style={{ color: '#334155', fontSize: '0.875rem' }}>–</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center"
                    style={{ borderLeft: '1px solid rgba(234,88,12,0.3)', borderBottom: '1px solid #1e1e2e', fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', color: '#ea580c' }}>
                    {totalPuntos}
                  </td>
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
      <div className="px-4 mt-4 flex flex-wrap gap-4 text-xs" style={{ color: '#475569' }}>
        <span style={{ color: '#34d399' }}>■ 3pts exacto</span>
        <span style={{ color: '#fb923c' }}>■ 1pt resultado</span>
        <span style={{ color: '#f87171' }}>■ 0pts fallo</span>
        <span style={{ color: '#64748b' }}>■ predicción pendiente</span>
      </div>
    </div>
  );
}
