'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bandera } from '@/components/Bandera';
import { TEMPORADA_ACTIVA } from '@/lib/utils';

const GRUPOS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

interface EquipoGrupo {
  id: string;
  grupo: string;
  equipo: string;
  bandera: string | null;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

const ordenarGrupo = (equipos: EquipoGrupo[]): EquipoGrupo[] => {
  return [...equipos].sort((a, b) => {
    // 1. Puntos
    const ptsDiff = (b.pts || 0) - (a.pts || 0);
    if (ptsDiff !== 0) return ptsDiff;

    // 2. Diferencia de goles general
    const dgA = (a.gf || 0) - (a.gc || 0);
    const dgB = (b.gf || 0) - (b.gc || 0);
    const dgDiff = dgB - dgA;
    if (dgDiff !== 0) return dgDiff;

    // 3. Goles marcados general
    const gfDiff = (b.gf || 0) - (a.gf || 0);
    if (gfDiff !== 0) return gfDiff;

    // 4. Alfabético como último recurso
    return a.equipo.localeCompare(b.equipo);
  });
};

const badgeClasificacion = (index: number) => {
  if (index < 2)   return { cls: 'bg-green-600/20 text-green-400',  label: '✓' };
  if (index === 2) return { cls: 'bg-yellow-600/20 text-yellow-400', label: '?' };
  return             { cls: 'bg-red-600/20 text-red-400',            label: '✗' };
};

export default function GruposPage() {
  const [equipos, setEquipos] = useState<EquipoGrupo[]>([]);
  const [grupoActivo, setGrupoActivo] = useState('A');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('quiniela_grupos').select('*');
      setEquipos(data || []);
      setLoading(false);
    };
    cargar();
  }, []);

  if (TEMPORADA_ACTIVA === 'ligamx2026') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          No disponible en esta temporada
        </p>
      </div>
    );
  }

  const equiposOrdenados = ordenarGrupo(
    equipos.filter(e => e.grupo === grupoActivo)
  );
  const grupoConPartidos = equiposOrdenados.some(e => (e.pj || 0) > 0);

  return (
    <div className="min-h-screen px-4 pt-6 pb-28" style={{ background: 'var(--bg-base)' }}>
      <h1 style={{
        fontFamily: 'var(--font-bebas)',
        fontSize: '2rem',
        color: 'var(--accent-gold)',
        letterSpacing: '0.05em',
      }}>
        🌎 GRUPOS — MUNDIAL 2026
      </h1>
      <p className="text-xs mb-4 mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
        Tabla de posiciones por grupo · criterios de desempate FIFA 2026
      </p>

      {/* Tabs A–L */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {GRUPOS.map(g => (
          <button
            key={g}
            onClick={() => setGrupoActivo(g)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest shrink-0 transition-all active:scale-95"
            style={{
              fontFamily: 'var(--font-rajdhani)',
              background: grupoActivo === g ? 'rgba(234,88,12,0.2)' : 'var(--bg-card)',
              border: grupoActivo === g ? '1px solid rgba(234,88,12,0.6)' : '1px solid var(--border)',
              color: grupoActivo === g ? 'var(--accent-gold)' : 'var(--text-secondary)',
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
      ) : equiposOrdenados.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-4xl mb-3">⏳</p>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)', fontSize: '0.95rem' }}>
            Los datos del Grupo {grupoActivo} se actualizarán durante el torneo
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 340 }}>
                <thead>
                  <tr style={{ background: 'rgba(234,88,12,0.1)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-3 py-2.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)', fontWeight: 700, letterSpacing: '0.08em' }}>
                      Equipo
                    </th>
                    {['PJ','G','E','P','GF','GC','DG','PTS'].map(h => (
                      <th key={h} className="text-center px-2 py-2.5 w-8" style={{
                        color: h === 'PTS' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-rajdhani)',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {equiposOrdenados.map((eq, i) => {
                    const badge = badgeClasificacion(i);
                    return (
                      <tr
                        key={eq.id}
                        style={{
                          background: i === 0
                            ? 'rgba(234,88,12,0.07)'
                            : i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-card-hover)',
                          borderBottom: '1px solid var(--border)',
                          borderLeft: i < 2 ? '3px solid var(--accent-gold)' : i === 2 ? '3px solid #ca8a04' : '3px solid transparent',
                        }}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {eq.bandera && (
                              <Bandera emoji={eq.bandera} nombre={eq.equipo} size="sm" />
                            )}
                            <span style={{
                              color: i === 0 ? 'var(--accent-gold)' : 'var(--text-primary)',
                              fontFamily: 'var(--font-rajdhani)',
                              fontWeight: i < 2 ? 700 : 400,
                              whiteSpace: 'nowrap',
                            }}>
                              {eq.equipo}
                            </span>
                            {grupoConPartidos && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${badge.cls}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                        </td>
                        {[eq.pj, eq.g, eq.e, eq.p, eq.gf, eq.gc, eq.dg, eq.pts].map((val, vi) => (
                          <td key={vi} className="text-center px-2 py-2.5" style={{
                            color: vi === 7 ? 'var(--accent-gold)' : 'var(--text-primary)',
                            fontFamily: 'var(--font-rajdhani)',
                            fontWeight: vi === 7 ? 700 : 400,
                          }}>
                            {val ?? 0}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leyenda clasificación */}
          <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)' }}>
              ℹ️ Clasificación
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-green-600/20 text-green-400 shrink-0">✓</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                  Top 2 de cada grupo — clasifican directo (24 equipos)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-yellow-600/20 text-yellow-400 shrink-0">?</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                  3er lugar — los 8 mejores terceros también clasifican
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-600/20 text-red-400 shrink-0">✗</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                  4to lugar — eliminado
                </span>
              </div>
            </div>
            <p className="text-[10px] mt-3" style={{ color: '#475569', fontFamily: 'var(--font-rajdhani)' }}>
              Desempate: puntos directos → DG directa → goles directos → DG general → goles general → tarjetas → ranking FIFA
            </p>
          </div>
        </>
      )}
    </div>
  );
}
