'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
      .select('id, equipo_local, equipo_visitante, goles_local, goles_visitante, estado, grupo')
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

  const ptsColor = (pts: number) => {
    if (pts === 3) return '#34d399';
    if (pts === 1) return '#fb923c';
    return '#f87171';
  };

  const descargarCSV = () => {
    const headers = [
      'Jugador',
      'Quiniela',
      ...partidos.map(p =>
        `${p.equipo_local.substring(0, 3).toUpperCase()}vs${p.equipo_visitante.substring(0, 3).toUpperCase()}`
      ),
      'PTS',
    ];

    const filas = participaciones.map(part => {
      const jugador = jugadores.find((j: any) => j.id === part.user_id);
      const nombre = jugador?.apodo || jugador?.nombre?.split(' ')[0] || 'Jugador';
      const quiniela = part.quiniela?.nombre || '';

      const celdas = partidos.map(partido => {
        const pred = predicciones.find((p: any) =>
          p.user_id === part.user_id &&
          p.partido_id === partido.id &&
          (p.quiniela_extra_id === part.quiniela_extra_id ||
           (!p.quiniela_extra_id && !part.quiniela_extra_id))
        );
        if (!pred) return '–';
        const marcador = `="${pred.goles_local_pred}-${pred.goles_visitante_pred}"`;
        if (partido.estado === 'finalizado') {
          return `${pred.puntos_ganados}pts (${marcador})`;
        }
        return marcador;
      });

      const total = predicciones
        .filter((p: any) =>
          p.user_id === part.user_id &&
          (p.quiniela_extra_id === part.quiniela_extra_id ||
           (!p.quiniela_extra_id && !part.quiniela_extra_id)) &&
          partidos.find((partido: any) =>
            partido.id === p.partido_id && partido.estado === 'finalizado'
          )
        )
        .reduce((sum: number, p: any) => sum + (p.puntos_ganados || 0), 0);

      return [nombre, quiniela, ...celdas, total];
    });

    const csv = [headers, ...filas]
      .map(fila => fila.map(v => `"${v}"`).join(','))
      .join('\n');

    const BOM = '﻿';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiniela-jornada-${jornada}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      <div className="overflow-x-auto px-2">
        <table className="min-w-max text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1e2e' }}>
              <th className="sticky left-0 z-10 text-left px-3 py-2 min-w-[120px]"
                style={{ background: '#0a0a0a', color: '#ea580c', fontFamily: 'var(--font-bebas)', fontSize: '1rem' }}>
                Jugador
              </th>
              {partidos.map(partido => (
                <th key={partido.id}
                  className="px-2 py-2 text-center min-w-[60px]"
                  style={{ borderLeft: '1px solid #1e1e2e', color: '#64748b', fontFamily: 'var(--font-rajdhani)', fontSize: '0.75rem' }}>
                  <div>{partido.equipo_local.substring(0, 3).toUpperCase()}</div>
                  <div style={{ color: '#334155' }}>vs</div>
                  <div>{partido.equipo_visitante.substring(0, 3).toUpperCase()}</div>
                  {partido.estado === 'finalizado' && (
                    <div style={{ color: '#ea580c', fontWeight: 'bold' }}>
                      {partido.goles_local}-{partido.goles_visitante}
                    </div>
                  )}
                </th>
              ))}
              <th className="px-3 py-2 text-center min-w-[60px]"
                style={{ borderLeft: '1px solid rgba(234,88,12,0.3)', color: '#ea580c', fontFamily: 'var(--font-bebas)', fontSize: '1rem' }}>
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
                <tr key={part.id} style={{ borderBottom: '1px solid #1e1e2e' }}>
                  <td className="sticky left-0 z-10 px-3 py-2" style={{ background: '#0a0a0a' }}>
                    <div className="font-semibold text-sm text-white" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                      {mostrarNombre(part.user_id)}
                    </div>
                    {part.quiniela?.nombre && (
                      <div className="font-bold text-xs" style={{ color: '#fb923c', fontFamily: 'var(--font-rajdhani)' }}>
                        🎫 {part.quiniela.nombre}
                      </div>
                    )}
                    <div className="text-xs no-print" style={{ color: '#475569' }}>
                      {part.pagado ? '✅' : '⏳'}{!part.publicado && ' 🔒'}
                    </div>
                  </td>
                  {partidos.map(partido => {
                    const pred = getPred(part.user_id, partido.id, part.quiniela_extra_id);
                    if (partido.estado === 'finalizado') {
                      const pts = pred?.puntos_ganados ?? null;
                      return (
                        <td key={partido.id}
                          className="px-2 py-2 text-center"
                          style={{ borderLeft: '1px solid #1e1e2e' }}>
                          {pts !== null ? (
                            <div className="font-bold text-sm" style={{ color: ptsColor(pts) }}>
                              {pts}pts
                            </div>
                          ) : (
                            <div className="text-sm" style={{ color: '#334155' }}>–</div>
                          )}
                          {pred && (
                            <div className="text-xs" style={{ color: '#475569' }}>
                              {pred.goles_local_pred}-{pred.goles_visitante_pred}
                            </div>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td key={partido.id}
                        className="px-2 py-2 text-center text-xs"
                        style={{ borderLeft: '1px solid #1e1e2e', color: '#64748b' }}>
                        {pred ? `${pred.goles_local_pred}-${pred.goles_visitante_pred}` : '–'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center"
                    style={{ borderLeft: '1px solid rgba(234,88,12,0.3)', fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', color: '#ea580c' }}>
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
