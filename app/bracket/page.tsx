'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bandera } from '@/components/Bandera';
import { Partido } from '@/types';
import { getFechaKey, equiposE32, BANDERAS_EQUIPOS } from '@/lib/utils';

// ── Layout constants ──────────────────────────────────────────────────────────
const SLOT_H  = 86;               // px per E32 slot
const BH      = 8 * SLOT_H;      // bracket height = 688px
const CARD_W  = 150;             // match card width
const CARD_H  = 60;              // approximate match card height
const CONN_W  = 22;              // connector SVG width

function itemCenter(round: number, idx: number) {
  return (idx * Math.pow(2, round) + Math.pow(2, round - 1)) * SLOT_H;
}
function itemTop(round: number, idx: number) {
  return itemCenter(round, idx) - CARD_H / 2;
}

// ── TeamRow ───────────────────────────────────────────────────────────────────
function TeamRow({ nombre, bandera, goles, winner }: {
  nombre: string; bandera: string; goles: number | null; winner: boolean;
}) {
  const isDef = !nombre || nombre === 'A definir';
  return (
    <div className="flex items-center justify-between px-2 py-1.5 gap-1"
      style={{ background: winner ? 'rgba(234,88,12,0.14)' : 'transparent' }}>
      <div className="flex items-center gap-1.5 min-w-0">
        {bandera && !isDef && <Bandera emoji={bandera} nombre={nombre} size="sm" />}
        <span className="text-[11px] truncate leading-tight" style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: winner ? 700 : 400,
          color: isDef ? '#334155' : winner ? '#fb923c' : '#e2e8f0',
        }}>
          {isDef ? 'Por definir' : nombre}
        </span>
      </div>
      {goles !== null && (
        <span className="text-sm shrink-0" style={{
          fontFamily: 'var(--font-bebas)',
          color: winner ? '#fb923c' : '#cbd5e1',
        }}>{goles}</span>
      )}
    </div>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────────
function MatchCard({ partido, isFinal }: { partido: Partido | null; isFinal?: boolean }) {
  if (!partido) {
    return (
      <div style={{
        width: isFinal ? CARD_W + 20 : CARD_W,
        height: CARD_H,
        background: '#0d1526',
        border: '1px dashed rgba(255,255,255,0.07)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 10, color: '#1e3a5f', fontFamily: 'var(--font-rajdhani)' }}>—</span>
      </div>
    );
  }

  const fin         = partido.estado === 'finalizado';
  const vivo        = partido.estado === 'en_curso';
  const gl          = partido.goles_local  ?? 0;
  const gv          = partido.goles_visitante ?? 0;
  const clasificado = partido.clasificado ?? null;
  const comoTermino = partido.como_termino ?? null;
  const extraTime   = !!(fin && clasificado && comoTermino && comoTermino !== 'reglamentario');

  const fk    = getFechaKey(partido.fecha_hora);
  const local = (partido.equipo_local && partido.equipo_local !== 'A definir')
    ? partido.equipo_local : (equiposE32[fk]?.local || 'A definir');
  const visit = (partido.equipo_visitante && partido.equipo_visitante !== 'A definir')
    ? partido.equipo_visitante : (equiposE32[fk]?.visitante || 'A definir');
  const bL    = BANDERAS_EQUIPOS[local]  ?? partido.bandera_local  ?? '';
  const bV    = BANDERAS_EQUIPOS[visit] ?? partido.bandera_visitante ?? '';

  // Winner highlight: goals first, then clasificado (for draws/penalties)
  const wL = fin && (gl > gv || (extraTime && clasificado === local));
  const wV = fin && (gv > gl || (extraTime && clasificado === visit));

  return (
    <div style={{
      width: isFinal ? CARD_W + 20 : CARD_W,
      background: '#1e293b',
      border: `1px solid ${vivo ? 'rgba(234,88,12,0.6)' : isFinal ? 'rgba(234,88,12,0.35)' : 'rgba(255,255,255,0.09)'}`,
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: isFinal
        ? '0 0 24px rgba(234,88,12,0.18), 0 0 2px rgba(234,88,12,0.4)'
        : vivo ? '0 0 12px rgba(234,88,12,0.25)' : undefined,
    }}>
      {vivo && (
        <div style={{ padding: '2px 8px', background: 'rgba(234,88,12,0.2)', fontSize: 9, color: '#fb923c', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🔴 En vivo
        </div>
      )}
      <TeamRow nombre={local} bandera={bL} goles={fin || vivo ? gl : null} winner={wL} />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <TeamRow nombre={visit} bandera={bV} goles={fin || vivo ? gv : null} winner={wV} />
      {extraTime && (
        <div style={{
          padding: '2px 6px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.25)',
          fontSize: 9,
          color: '#94a3b8',
          textAlign: 'center',
          fontFamily: 'var(--font-rajdhani)',
          letterSpacing: '0.04em',
        }}>
          {comoTermino === 'penales' ? '🥅' : '⏱️'}{partido.marcador_penales ? ` ${partido.marcador_penales}` : ''} · {clasificado}
        </div>
      )}
    </div>
  );
}

// ── BracketColumn (absolute-positioned) ──────────────────────────────────────
function BracketColumn({ roundIdx, items }: { roundIdx: number; items: (Partido | null)[] }) {
  return (
    <div style={{ width: CARD_W, height: BH, position: 'relative', flexShrink: 0 }}>
      {items.map((p, i) => (
        <div key={i} style={{ position: 'absolute', top: itemTop(roundIdx, i), left: 0 }}>
          <MatchCard partido={p} />
        </div>
      ))}
    </div>
  );
}

// ── ConnectorL: lines flow left→right (E32 side left, SEMI side right) ───────
function ConnectorL({ fromRound, pairs }: { fromRound: number; pairs: number }) {
  const paths: string[] = [];
  for (let i = 0; i < pairs; i++) {
    const y1   = itemCenter(fromRound, 2 * i);
    const y2   = itemCenter(fromRound, 2 * i + 1);
    const yMid = (y1 + y2) / 2;
    paths.push(`M0,${y1} H${CONN_W / 2} V${y2} H0`);
    paths.push(`M${CONN_W / 2},${yMid} H${CONN_W}`);
  }
  return (
    <svg width={CONN_W} height={BH} style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#1e3a5f" strokeWidth={1.5} strokeLinecap="round" />
      ))}
    </svg>
  );
}

// ── ConnectorR: mirror of L (SEMI side left, E32 side right) ─────────────────
function ConnectorR({ fromRound, pairs }: { fromRound: number; pairs: number }) {
  const paths: string[] = [];
  for (let i = 0; i < pairs; i++) {
    const y1   = itemCenter(fromRound, 2 * i);
    const y2   = itemCenter(fromRound, 2 * i + 1);
    const yMid = (y1 + y2) / 2;
    paths.push(`M${CONN_W},${y1} H${CONN_W / 2} V${y2} H${CONN_W}`);
    paths.push(`M${CONN_W / 2},${yMid} H0`);
  }
  return (
    <svg width={CONN_W} height={BH} style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#1e3a5f" strokeWidth={1.5} strokeLinecap="round" />
      ))}
    </svg>
  );
}

// ── Round label pill ──────────────────────────────────────────────────────────
function RoundLabel({ label, w }: { label: string; w: number }) {
  return (
    <div style={{
      width: w, flexShrink: 0, textAlign: 'center',
      fontSize: 10, fontWeight: 700,
      fontFamily: 'var(--font-rajdhani)',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: '#ea580c', paddingBottom: 10,
    }}>
      {label}
    </div>
  );
}

// ── E32 slot order by exact Supabase ID prefix (slot 0-7 = left, 8-15 = right) ─
const E32_SLOT_IDS: string[] = [
  '7932f464', // slot 0  — Alemania vs Paraguay
  'cf0c326b', // slot 1  — Francia vs Suecia
  'a6241b5c', // slot 2  — Sudáfrica vs Canadá
  'f6fa8151', // slot 3  — Países Bajos vs Marruecos
  '99bbfca0', // slot 4  — Portugal vs Croacia
  '1898a12a', // slot 5  — España vs Austria
  '7ddfbb44', // slot 6  — Estados Unidos vs Bosnia y Herzegovina
  '89ce35d6', // slot 7  — Bélgica vs Senegal
  '740698dc', // slot 8  — Brasil vs Japón
  '1f1c5663', // slot 9  — Costa de Marfil vs Noruega
  '955c309a', // slot 10 — México vs Ecuador
  '2bbb2a3b', // slot 11 — Inglaterra vs RD Congo
  '64bb1d55', // slot 12 — Argentina vs Cabo Verde
  'd433ca27', // slot 13 — Australia vs Egipto
  'f8275c98', // slot 14 — Suiza vs Argelia
  '3904746a', // slot 15 — Colombia vs Ghana
];

function sortE32ByBracket(partidos: Partido[]): (Partido | null)[] {
  return E32_SLOT_IDS.map(prefix =>
    partidos.find(p => p.id.startsWith(prefix)) ?? null
  );
}

// ── OCT slot order by exact Supabase ID prefix (slot 0-3 = left, 4-7 = right) ─
const OCT_SLOT_IDS: string[] = [
  '7b870446', // slot 0 — Francia vs Paraguay (G0 vs G1)
  '54d43cf5', // slot 1 — Canadá vs Marruecos (G2 vs G3)
  '58fc08fc', // slot 2 — G4 vs G5 (Portugal/España)
  'ca03402a', // slot 3 — Bélgica vs EUA/Bosnia (G6 vs G7)
  '096db262', // slot 4 — Brasil vs Noruega (G8 vs G9)
  'e59a2e9d', // slot 5 — México vs Inglaterra (G10 vs G11)
  '467600a3', // slot 6 — G12 vs G13 (Argentina/Australia)
  'aebc9abe', // slot 7 — G14 vs G15 (Suiza/Colombia)
];

function sortOCTByBracket(partidos: Partido[]): (Partido | null)[] {
  return OCT_SLOT_IDS.map(prefix =>
    partidos.find(p => p.id.startsWith(prefix)) ?? null
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BracketPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from('quiniela_partidos')
      .select('*')
      .in('grupo', ['E32', 'OCT', 'CUA', 'SEMI', 'FIN', '3ER'])
      .order('fecha_hora', { ascending: true })
      .then(({ data }) => {
        setPartidos(data || []);
        setLoading(false);
      });
  }, []);

  const byGrupo = (g: string) => partidos.filter(p => p.grupo === g);

  const e32   = byGrupo('E32');
  const oct   = byGrupo('OCT');
  const cua   = byGrupo('CUA');
  const semi  = byGrupo('SEMI');
  const fin   = byGrupo('FIN');
  const tercer = byGrupo('3ER');

  const pad = (arr: Partido[], n: number): (Partido | null)[] =>
    [...arr, ...Array(Math.max(0, n - arr.length)).fill(null)];

  // Sorted by official bracket position
  const e32Ordered = sortE32ByBracket(e32);
  const LE32 = e32Ordered.slice(0, 8);
  const RE32 = e32Ordered.slice(8, 16);
  const octOrdered = sortOCTByBracket(oct);
  const LOct = octOrdered.slice(0, 4);
  const ROct = octOrdered.slice(4, 8);
  const LCua  = pad(cua.slice(0, 2),  2);
  const RCua  = pad(cua.slice(2, 4),  2);
  const LSemi = pad(semi.slice(0, 1), 1);
  const RSemi = pad(semi.slice(1, 2), 1);
  const finalP = fin[0] ?? null;

  const FINAL_W = CARD_W + 48; // center column width

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <p style={{ color: '#475569', fontFamily: 'var(--font-rajdhani)' }}>Cargando bracket...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#0f172a' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <h1 style={{
          fontFamily: 'var(--font-bebas)',
          fontSize: '2rem',
          color: '#ea580c',
          letterSpacing: '0.05em',
        }}>
          🏆 DIECISEISAVOS DE FINAL
        </h1>
        <p className="text-xs mt-0.5" style={{ color: '#475569', fontFamily: 'var(--font-rajdhani)' }}>
          Mundial 2026 · Cuadro eliminatorio · desliza para ver completo →
        </p>
      </div>

      {/* Bracket — horizontal scroll */}
      <div className="overflow-x-auto pb-6" style={{ scrollbarWidth: 'thin' }}>
        <div style={{ padding: '0 16px 0 16px', minWidth: 'max-content' }}>

          {/* ── Round labels ── */}
          <div className="flex">
            {/* Left labels: E32, OCT, CUA, SEMI */}
            {(['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal'] as const).map((label, i) => (
              <RoundLabel key={label} label={label}
                w={i < 3 ? CARD_W + CONN_W : CARD_W}
              />
            ))}
            {/* Final */}
            <RoundLabel label="Final" w={FINAL_W} />
            {/* Right labels: SEMI, CUA, OCT, E32 */}
            {(['Semifinal', 'Cuartos', 'Octavos', 'Dieciseisavos'] as const).map((label, i) => (
              <RoundLabel key={label + 'R'} label={label}
                w={i === 0 ? CARD_W : CARD_W + CONN_W}
              />
            ))}
          </div>

          {/* ── Bracket body ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* ── LEFT SIDE ── */}
            <BracketColumn roundIdx={0} items={LE32} />
            <ConnectorL fromRound={0} pairs={4} />
            <BracketColumn roundIdx={1} items={LOct} />
            <ConnectorL fromRound={1} pairs={2} />
            <BracketColumn roundIdx={2} items={LCua} />
            <ConnectorL fromRound={2} pairs={1} />
            <BracketColumn roundIdx={3} items={LSemi} />

            {/* ── FINAL CENTER ── */}
            <div style={{ width: FINAL_W, height: BH, flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Connector from left semi */}
              <svg width={FINAL_W / 2} height={BH}
                style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
                <line x1={0} y1={BH / 2} x2={FINAL_W / 2} y2={BH / 2}
                  stroke="#1e3a5f" strokeWidth={1.5} />
              </svg>
              {/* Connector from right semi */}
              <svg width={FINAL_W / 2} height={BH}
                style={{ position: 'absolute', right: 0, top: 0, pointerEvents: 'none' }}>
                <line x1={FINAL_W / 2} y1={BH / 2} x2={0} y2={BH / 2}
                  stroke="#1e3a5f" strokeWidth={1.5} />
              </svg>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  textAlign: 'center', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: '#ea580c', fontFamily: 'var(--font-rajdhani)',
                  marginBottom: 6,
                }}>
                  🏆 GRAN FINAL
                </div>
                <MatchCard partido={finalP} isFinal />
              </div>
            </div>

            {/* ── RIGHT SIDE (SEMI → E32, left to right from center) ── */}
            <BracketColumn roundIdx={3} items={RSemi} />
            <ConnectorR fromRound={2} pairs={1} />
            <BracketColumn roundIdx={2} items={RCua} />
            <ConnectorR fromRound={1} pairs={2} />
            <BracketColumn roundIdx={1} items={ROct} />
            <ConnectorR fromRound={0} pairs={4} />
            <BracketColumn roundIdx={0} items={RE32} />
          </div>
        </div>
      </div>

      {/* Tercer lugar */}
      {tercer.length > 0 && (
        <div className="px-4 mt-2">
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#64748b',
            fontFamily: 'var(--font-rajdhani)', marginBottom: 8,
          }}>
            🥉 Tercer lugar
          </p>
          <MatchCard partido={tercer[0]} />
        </div>
      )}

      {/* Empty state */}
      {partidos.length === 0 && (
        <div className="mx-4 rounded-2xl p-10 text-center"
          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-4xl mb-3">⏳</p>
          <p style={{ color: '#475569', fontFamily: 'var(--font-rajdhani)', fontSize: '0.95rem' }}>
            El cuadro eliminatorio se publicará al finalizar la fase de grupos
          </p>
        </div>
      )}
    </div>
  );
}
