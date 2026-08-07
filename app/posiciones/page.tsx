'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bandera } from '@/components/Bandera';
import { TEMPORADA_ACTIVA } from '@/lib/utils';

// Equipos de cada liga
const EQUIPOS_LIGAMX = new Set([
  'América', 'Atlante', 'Atlas', 'Cruz Azul', 'Guadalajara', 'Juárez',
  'León', 'Monterrey', 'Necaxa', 'Pachuca', 'Puebla', 'Pumas',
  'Querétaro', 'San Luis', 'Santos', 'Tigres', 'Tijuana', 'Toluca',
]);

// Sistema de puntos LC:
// Victoria reglamentario = 3 pts
// Victoria penales/tiempo_extra = 2 pts ganador / 1 pt perdedor
// Derrota reglamentario = 0 pts

interface Row {
  equipo: string;
  pj: number;
  g: number;   // victorias (reg)
  gpe: number; // victorias por penales/TE
  lpe: number; // derrotas por penales/TE (1pt)
  p: number;   // derrotas reglamentario
  gf: number;
  gc: number;
  pts: number;
}

function TablaLiga({ rows, titulo, cutoff }: { rows: Row[]; titulo: string; cutoff: number }) {
  return (
    <div className="mb-8">
      <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', color: '#ea580c', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {titulo}
      </h2>
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
              <th className="text-left px-3 py-2 w-6 text-xs" style={{ color: '#475569' }}>#</th>
              <th className="text-left px-2 py-2" style={{ color: '#94a3b8', fontFamily: 'var(--font-rajdhani)', fontWeight: 700 }}>Equipo</th>
              {['PJ','G','GPE','LPE','P','GF','GC','DG','PTS'].map(h => (
                <th key={h} className="text-center px-2 py-2 text-xs font-bold"
                  style={{ color: h === 'PTS' ? '#ea580c' : '#64748b', minWidth: 24 }}
                  title={
                    h === 'G' ? 'Victorias reglamentario (3pts)' :
                    h === 'GPE' ? 'Victorias penales/TE (2pts)' :
                    h === 'LPE' ? 'Derrotas penales/TE (1pt)' :
                    h === 'P' ? 'Derrotas reglamentario (0pts)' : undefined
                  }>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const clasifica = i < cutoff;
              return (
                <tr key={r.equipo}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: clasifica ? 'rgba(34,197,94,0.05)' : 'transparent',
                    borderLeft: clasifica ? '3px solid rgba(34,197,94,0.6)' : '3px solid transparent',
                  }}>
                  <td className="px-3 py-2 text-xs tabular-nums" style={{ color: '#475569' }}>{i + 1}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <Bandera emoji="" nombre={r.equipo} size="sm" />
                      <span className="text-xs font-semibold whitespace-nowrap"
                        style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
                        {r.equipo}
                      </span>
                      {clasifica && <span style={{ fontSize: '0.5rem', color: '#22c55e', fontWeight: 700 }}>✓Q</span>}
                    </div>
                  </td>
                  {[r.pj, r.g, r.gpe, r.lpe, r.p, r.gf, r.gc, r.gf - r.gc].map((v, j) => (
                    <td key={j} className="text-center px-2 py-2 text-xs tabular-nums" style={{ color: '#94a3b8' }}>{v >= 0 ? v : v}</td>
                  ))}
                  <td className="text-center px-2 py-2 font-bold tabular-nums"
                    style={{ fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: '#ea580c' }}>
                    {r.pts}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-8 text-sm" style={{ color: '#475569' }}>
                  Sin resultados finalizados aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: '#475569' }}>
        <span><span style={{ color: '#22c55e' }}>■</span> Top {cutoff} clasifican a Cuartos</span>
        <span>G=+3pts · GPE=+2pts · LPE=+1pt · P=0pts</span>
      </div>
    </div>
  );
}

export default function PosicionesPage() {
  const [rowsLigamx, setRowsLigamx] = useState<Row[]>([]);
  const [rowsMls, setRowsMls]       = useState<Row[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const { data: partidos } = await supabase
        .from('quiniela_partidos')
        .select('equipo_local, equipo_visitante, goles_local, goles_visitante, clasificado, como_termino')
        .eq('temporada', TEMPORADA_ACTIVA)
        .eq('estado', 'finalizado');

      const stats: Record<string, Row> = {};
      const getRow = (equipo: string): Row => {
        if (!stats[equipo]) stats[equipo] = { equipo, pj: 0, g: 0, gpe: 0, lpe: 0, p: 0, gf: 0, gc: 0, pts: 0 };
        return stats[equipo];
      };

      for (const p of (partidos ?? [])) {
        const gl = p.goles_local ?? 0;
        const gv = p.goles_visitante ?? 0;
        const local = getRow(p.equipo_local);
        const visit = getRow(p.equipo_visitante);

        local.pj++; visit.pj++;
        local.gf += gl; local.gc += gv;
        visit.gf += gv; visit.gc += gl;

        const esReglamentario = p.como_termino === 'reglamentario';
        const esPenalesOTE = p.como_termino === 'penales' || p.como_termino === 'tiempo_extra';

        if (esReglamentario) {
          if (gl > gv) {
            local.g++; local.pts += 3; local.p === local.p; // no change
            visit.p++;
          } else if (gl < gv) {
            visit.g++; visit.pts += 3;
            local.p++;
          } else {
            // Empate en reglamentario sin penales (raro en LC, pero por si acaso)
            local.pts += 1; local.lpe++;
            visit.pts += 1; visit.lpe++;
          }
        } else if (esPenalesOTE) {
          // Decidido por penales o tiempo extra — clasificado es el ganador
          const ganador = p.clasificado;
          if (ganador === p.equipo_local) {
            local.gpe++; local.pts += 2;
            visit.lpe++; visit.pts += 1;
          } else if (ganador === p.equipo_visitante) {
            visit.gpe++; visit.pts += 2;
            local.lpe++; local.pts += 1;
          } else {
            // Sin clasificado declarado — tratar como empate provisional
            local.pts += 1; local.lpe++;
            visit.pts += 1; visit.lpe++;
          }
        } else {
          // como_termino no declarado — usar marcador
          if (gl > gv) {
            local.g++; local.pts += 3; visit.p++;
          } else if (gl < gv) {
            visit.g++; visit.pts += 3; local.p++;
          }
        }
      }

      const sort = (rows: Row[]) =>
        [...rows].sort((a, b) =>
          b.pts - a.pts ||
          (b.gf - b.gc) - (a.gf - a.gc) ||
          b.gf - a.gf
        );

      const all = Object.values(stats);
      setRowsLigamx(sort(all.filter(r => EQUIPOS_LIGAMX.has(r.equipo))));
      setRowsMls(sort(all.filter(r => !EQUIPOS_LIGAMX.has(r.equipo))));
      setLoading(false);
    };
    cargar();
  }, []);

  return (
    <div className="min-h-screen bg-base pb-24 px-4 pt-6">
      <h1 style={{
        fontFamily: 'var(--font-bebas)', fontSize: '2rem',
        color: '#ea580c', letterSpacing: '0.05em', marginBottom: '0.25rem',
      }}>
        Leagues Cup — Posiciones
      </h1>
      <p className="text-xs mb-6" style={{ color: '#475569' }}>
        Solo partidos finalizados · {TEMPORADA_ACTIVA}
      </p>

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: '#475569' }}>Cargando…</div>
      ) : (
        <>
          <TablaLiga rows={rowsLigamx} titulo="🇲🇽 Liga MX" cutoff={4} />
          <TablaLiga rows={rowsMls}    titulo="🇺🇸 MLS"     cutoff={4} />
        </>
      )}
    </div>
  );
}
