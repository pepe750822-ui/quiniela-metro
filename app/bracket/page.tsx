'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bandera } from '@/components/Bandera';
import { Partido } from '@/types';
import { formatearFechaCDMX } from '@/lib/utils';

const RONDAS: { key: string; label: string; short: string }[] = [
  { key: 'E32',  label: 'Ronda de 32',  short: 'R32'  },
  { key: 'OCT',  label: 'Octavos',      short: 'OCT'  },
  { key: 'CUA',  label: 'Cuartos',      short: 'CUA'  },
  { key: 'SEMI', label: 'Semis',        short: 'SEMI' },
  { key: 'FIN',  label: 'Final',        short: 'FIN'  },
];

// ── Tarjeta de partido ──────────────────────────────────────────────────────
function PartidoCard({ p, compact = false }: { p: Partido; compact?: boolean }) {
  const fin = p.estado === 'finalizado';
  const vivo = p.estado === 'en_curso';
  const gl = p.goles_local ?? 0;
  const gv = p.goles_visitante ?? 0;
  const ganadorLocal    = fin && gl > gv;
  const ganadorVisitante = fin && gv > gl;

  const TeamRow = ({
    nombre, bandera, goles, ganador,
  }: { nombre: string; bandera: string | null; goles: number | null; ganador: boolean }) => (
    <div
      className="flex items-center justify-between px-2.5 py-2 gap-1"
      style={{ background: ganador ? 'rgba(234,88,12,0.13)' : 'transparent' }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {bandera && <Bandera emoji={bandera} nombre={nombre} size="sm" />}
        <span
          className="text-[11px] leading-tight truncate"
          style={{
            fontFamily: 'var(--font-rajdhani)',
            fontWeight: ganador ? 700 : 400,
            color: ganador ? 'var(--accent-gold)' : nombre ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {nombre || 'Por definir'}
        </span>
      </div>
      {(fin || vivo) && goles !== null && (
        <span
          className="text-sm shrink-0"
          style={{
            fontFamily: 'var(--font-bebas)',
            color: ganador ? 'var(--accent-gold)' : 'var(--text-primary)',
          }}
        >
          {goles}
        </span>
      )}
    </div>
  );

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${vivo ? 'rgba(234,88,12,0.6)' : 'var(--border)'}`,
        background: 'var(--bg-card)',
        width: compact ? 148 : 164,
        boxShadow: vivo ? '0 0 12px rgba(234,88,12,0.25)' : 'none',
      }}
    >
      {vivo && (
        <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest"
          style={{ background: 'rgba(234,88,12,0.2)', color: 'var(--accent-gold)' }}>
          🔴 En vivo
        </div>
      )}
      <TeamRow
        nombre={p.equipo_local}
        bandera={p.bandera_local}
        goles={p.goles_local}
        ganador={ganadorLocal}
      />
      <div style={{ height: 1, background: 'var(--border)' }} />
      <TeamRow
        nombre={p.equipo_visitante}
        bandera={p.bandera_visitante}
        goles={p.goles_visitante}
        ganador={ganadorVisitante}
      />
      {p.estado === 'pendiente' && p.equipo_local && (
        <div className="px-2.5 py-1" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
          <p className="text-[9px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
            {formatearFechaCDMX(p.fecha_hora)}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Columna de ronda ────────────────────────────────────────────────────────
function Columna({ label, partidos }: { label: string; partidos: Partido[] }) {
  return (
    <div className="flex flex-col shrink-0" style={{ width: 172 }}>
      <p
        className="text-[10px] font-bold uppercase tracking-widest text-center mb-3 px-1"
        style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}
      >
        {label}
      </p>
      <div className="flex flex-col gap-3">
        {partidos.length === 0 ? (
          <div className="rounded-xl px-3 py-4 text-center text-[10px]"
            style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
            Próximamente
          </div>
        ) : (
          partidos.map(p => <PartidoCard key={p.id} p={p} />)
        )}
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function BracketPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('quiniela_partidos')
        .select('*')
        .in('grupo', ['E32', 'OCT', 'CUA', 'SEMI', '3ER', 'FIN'])
        .order('fecha_hora', { ascending: true });
      setPartidos(data || []);
      setLoading(false);
    };
    cargar();
  }, []);

  const porRonda = (key: string) =>
    partidos.filter(p => p.grupo === key);

  const tercerLugar = porRonda('3ER');
  const final       = porRonda('FIN');

  return (
    <div className="min-h-screen pt-6 pb-28" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="px-4 mb-5">
        <h1 style={{
          fontFamily: 'var(--font-bebas)',
          fontSize: '2rem',
          color: 'var(--accent-gold)',
          letterSpacing: '0.05em',
        }}>
          🏆 CUADRO ELIMINATORIO
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
          Mundial 2026 · desliza para ver el bracket completo →
        </p>
      </div>

      {loading ? (
        <p className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
      ) : (
        <>
          {/* Bracket principal — scroll horizontal */}
          <div className="overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex gap-4 px-4" style={{ minWidth: 'max-content' }}>
              {RONDAS.map(r => (
                <Columna key={r.key} label={r.label} partidos={porRonda(r.key)} />
              ))}
            </div>
          </div>

          {/* Tercer lugar y Final — fijados abajo del bracket */}
          {(tercerLugar.length > 0 || final.length > 0) && (
            <div className="px-4 mt-6">
              <div className="flex gap-4">
                {tercerLugar.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                      style={{ color: '#64748b', fontFamily: 'var(--font-rajdhani)' }}>
                      🥉 Tercer lugar
                    </p>
                    <PartidoCard p={tercerLugar[0]} />
                  </div>
                )}
                {final.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                      style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                      🏆 Gran Final
                    </p>
                    <PartidoCard p={final[0]} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {partidos.length === 0 && (
            <div className="mx-4 rounded-2xl p-10 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-4xl mb-3">⏳</p>
              <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)', fontSize: '0.95rem' }}>
                El cuadro eliminatorio se publicará al finalizar la fase de grupos
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
