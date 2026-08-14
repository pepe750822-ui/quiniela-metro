'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { LOGOS_LIGAMX, TEMPORADA_ACTIVA } from '@/lib/utils';

interface PosicionRow {
  equipo: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.2, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function PosicionesLmxPage() {
  const [rows, setRows]       = useState<PosicionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ligamx_posiciones')
        .select('equipo, pj, g, e, p, gf, gc, dg, pts, updated_at')
        .eq('temporada', TEMPORADA_ACTIVA)
        .order('pts', { ascending: false })
        .order('dg', { ascending: false });

      if (!error && data && data.length > 0) {
        setRows(data as PosicionRow[]);
        const latest = (data as any[]).reduce((acc: string, row: any) =>
          row.updated_at > acc ? row.updated_at : acc, '');
        if (latest) setUpdatedAt(latest);
      }
      setLoading(false);
    };
    cargar();
  }, []);

  const total = rows.length;

  return (
    <main className="min-h-screen pb-32 pt-6 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1
          style={{
            fontFamily: 'var(--font-bebas)',
            fontSize: '2rem',
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}
        >
          POSICIONES
        </h1>
        <p style={{ fontFamily: 'var(--font-rajdhani)', color: '#64748b', fontSize: '0.85rem', marginTop: 2 }}>
          Liga MX · Apertura 2026
        </p>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
              <th className="text-left px-3 py-2 w-5 text-xs" style={{ color: '#475569' }}>#</th>
              <th className="text-left px-2 py-2 text-xs font-bold"
                style={{ color: '#94a3b8', fontFamily: 'var(--font-rajdhani)', fontWeight: 700 }}>
                Equipo
              </th>
              {['PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'PTS'].map(h => (
                <th key={h}
                  className="text-center px-1.5 py-2 text-xs font-bold"
                  style={{ color: h === 'PTS' ? '#ea580c' : '#64748b', minWidth: 22 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-sm" style={{ color: '#475569' }}>
                  Cargando…
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-sm" style={{ color: '#475569' }}>
                  Sin datos disponibles
                </td>
              </tr>
            )}

            {!loading && rows.map((r, i) => {
              const playoff  = i < 8;
              const descenso = total >= 18 && i >= total - 3;

              const rowBg = playoff
                ? 'rgba(34,197,94,0.05)'
                : descenso
                ? 'rgba(239,68,68,0.05)'
                : 'transparent';

              const rowBorder = playoff
                ? '3px solid rgba(34,197,94,0.55)'
                : descenso
                ? '3px solid rgba(239,68,68,0.5)'
                : '3px solid transparent';

              const logo = LOGOS_LIGAMX[r.equipo];

              return (
                <motion.tr
                  key={r.equipo}
                  custom={i}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: rowBg,
                    borderLeft: rowBorder,
                  }}
                >
                  <td className="px-3 py-2 text-xs tabular-nums" style={{ color: '#475569' }}>{i + 1}</td>

                  {/* Equipo con logo */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {logo ? (
                        <img src={logo} alt={r.equipo} width={20} height={20}
                          style={{ objectFit: 'contain', flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: 20, height: 20, display: 'inline-block' }} />
                      )}
                      <span className="text-xs font-semibold whitespace-nowrap"
                        style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
                        {r.equipo}
                      </span>
                    </div>
                  </td>

                  {[r.pj, r.g, r.e, r.p, r.gf, r.gc, r.dg].map((v, j) => (
                    <td key={j} className="text-center px-1.5 py-2 text-xs tabular-nums"
                      style={{ color: j === 6 && v > 0 ? '#22c55e' : j === 6 && v < 0 ? '#ef4444' : '#94a3b8' }}>
                      {j === 6 && v > 0 ? `+${v}` : v}
                    </td>
                  ))}

                  <td className="text-center px-1.5 py-2 font-bold tabular-nums"
                    style={{ fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: '#ea580c' }}>
                    {r.pts}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: '#64748b' }}>
        <span><span style={{ color: '#22c55e' }}>■</span> Top 8 — Liguilla</span>
        <span><span style={{ color: '#ef4444' }}>■</span> Bottom 3 — Descenso</span>
        {updatedAt && (
          <span style={{ marginLeft: 'auto', color: '#475569' }}>
            Act. {new Date(updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </main>
  );
}
