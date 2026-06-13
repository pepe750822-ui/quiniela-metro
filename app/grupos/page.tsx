'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bandera } from '@/components/Bandera';

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

export default function GruposPage() {
  const [equipos, setEquipos] = useState<EquipoGrupo[]>([]);
  const [grupoActivo, setGrupoActivo] = useState('A');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('quiniela_grupos')
        .select('*');
      setEquipos(data || []);
      setLoading(false);
    };
    cargar();
  }, []);

  const equiposGrupo = equipos
    .filter(e => e.grupo === grupoActivo)
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

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
        Tabla de posiciones por grupo · se actualiza en tiempo real
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
      ) : equiposGrupo.length === 0 ? (
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
                  {equiposGrupo.map((eq, i) => (
                    <tr
                      key={eq.id}
                      style={{
                        background: i === 0
                          ? 'rgba(234,88,12,0.07)'
                          : i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-card-hover)',
                        borderBottom: '1px solid var(--border)',
                        borderLeft: i === 0 ? '3px solid var(--accent-gold)' : '3px solid transparent',
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
                            fontWeight: i === 0 ? 700 : 400,
                            whiteSpace: 'nowrap',
                          }}>
                            {eq.equipo}
                          </span>
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Leyenda */}
            <div className="px-3 py-2 flex items-center gap-2"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div className="w-3 h-3 rounded-sm shrink-0"
                style={{ background: 'rgba(234,88,12,0.25)', border: '1px solid rgba(234,88,12,0.5)' }} />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                Líder del grupo — clasifica directo a octavos de final
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
