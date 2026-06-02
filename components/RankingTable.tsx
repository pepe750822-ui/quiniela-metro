'use client';

import { RankingConJugador } from '@/types';

interface Props {
  ranking: RankingConJugador[];
  userId?: string;
}

function Iniciales({ nombre }: { nombre: string }) {
  const parts = nombre.trim().split(' ');
  const ini = parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : nombre.slice(0, 2);
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black shrink-0"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
    >
      {ini.toUpperCase()}
    </div>
  );
}

const podiumH: Record<number, string> = { 0: 'h-16', 1: 'h-12', 2: 'h-8' };
const podiumMedal = ['🥇', '🥈', '🥉'];

export default function RankingTable({ ranking, userId }: Props) {
  if (ranking.length === 0) {
    return (
      <p className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Aún no hay predicciones registradas.
      </p>
    );
  }

  const top3    = ranking.slice(0, 3);
  const resto   = ranking.slice(3);

  return (
    <div className="space-y-6">

      {/* Podio top 3 */}
      {top3.length >= 2 && (
        <div className="flex items-end justify-center gap-3 pt-4">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, visualIdx) => {
            const realIdx = entry === top3[0] ? 0 : entry === top3[1] ? 1 : 2;
            const heights = ['h-28', 'h-36', 'h-24'];
            const glows   = ['rgba(192,192,192,0.15)', 'rgba(245,158,11,0.15)', 'rgba(180,120,60,0.1)'];
            return (
              <div key={entry.user_id}
                className="flex-1 flex flex-col items-center gap-2 rounded-2xl py-3 px-2"
                style={{ background: glows[visualIdx], animation: `fadeInUp 0.5s ease-out ${visualIdx * 100}ms both` }}
              >
                <span className="text-2xl">{podiumMedal[realIdx]}</span>
                <Iniciales nombre={entry.jugador?.nombre ?? '?'} />
                <p className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {entry.jugador?.nombre?.split(' ')[0] ?? 'Jugador'}
                </p>
                <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', color: 'var(--accent-gold)', lineHeight: 1 }}>
                  {entry.puntos_total}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{entry.exactos} exactos</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista resto */}
      {resto.length > 0 && (
        <div className="space-y-2">
          {resto.map((entry, i) => {
            const esYo = entry.user_id === userId;
            const pos  = i + 4;
            return (
              <div key={entry.user_id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                style={{
                  background: esYo ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)',
                  border: `1px solid ${esYo ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                  outline: esYo ? '1px solid rgba(245,158,11,0.3)' : 'none',
                  animation: `fadeInUp 0.4s ease-out ${i * 50}ms both`,
                }}
              >
                <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{pos}</span>
                <Iniciales nombre={entry.jugador?.nombre ?? '?'} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: esYo ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                    {entry.jugador?.nombre ?? 'Jugador'}
                    {esYo && <span className="ml-2 text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded-full font-black">TÚ</span>}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.exactos} exactos ✅</p>
                </div>
                <div className="text-right">
                  <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                    {entry.puntos_total}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Si solo hay top3, mostrarlos también en lista */}
      {resto.length === 0 && ranking.length > 0 && (
        <div className="space-y-2">
          {ranking.map((entry, i) => {
            const esYo = entry.user_id === userId;
            return (
              <div key={entry.user_id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: esYo ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)',
                  border: `1px solid ${esYo ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                  animation: `fadeInUp 0.4s ease-out ${i * 50}ms both`,
                }}
              >
                <span className="text-xl w-8 text-center">{podiumMedal[i] ?? `${i + 1}.`}</span>
                <Iniciales nombre={entry.jugador?.nombre ?? '?'} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: esYo ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                    {entry.jugador?.nombre ?? 'Jugador'}
                    {esYo && <span className="ml-2 text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded-full font-black">TÚ</span>}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.exactos} exactos ✅</p>
                </div>
                <div className="text-right">
                  <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                    {entry.puntos_total}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
