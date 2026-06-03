'use client';

import { Jugador, RankingConJugador } from '@/types';
import { emailCorto } from '@/lib/utils';

interface Props {
  ranking: RankingConJugador[];
  userId?: string;
  pendienteIds?: string[];
}

const mostrarNombre = (j?: Jugador | null) =>
  j?.apodo ?? j?.nombre?.split(' ')[0] ?? 'Jugador';

const iniciales = (j?: Jugador | null) => {
  const texto = j?.apodo ?? j?.nombre ?? '?';
  return texto.slice(0, 2).toUpperCase();
};

function Iniciales({ jugador }: { jugador?: Jugador | null }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black shrink-0"
      style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
    >
      {iniciales(jugador)}
    </div>
  );
}

const podiumMedal = ['🥇', '🥈', '🥉'];

export default function RankingTable({ ranking, userId, pendienteIds }: Props) {
  if (ranking.length === 0) {
    return (
      <p className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Aún no hay predicciones registradas.
      </p>
    );
  }

  const top3  = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <div className="space-y-6">

      {/* Podio top 3 */}
      {top3.length >= 2 && (
        <div className="flex items-end justify-center gap-3 pt-4">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, visualIdx) => {
            const realIdx = entry === top3[0] ? 0 : entry === top3[1] ? 1 : 2;
            const glows   = ['rgba(192,192,192,0.15)', 'rgba(234,88,12,0.15)', 'rgba(180,120,60,0.1)'];
            return (
              <div key={entry.user_id}
                className="flex-1 flex flex-col items-center gap-2 rounded-2xl py-3 px-2"
                style={{ background: glows[visualIdx], animation: `fadeInUp 0.5s ease-out ${visualIdx * 100}ms both` }}
              >
                <span className="text-2xl">{podiumMedal[realIdx]}</span>
                <Iniciales jugador={entry.jugador} />
                <p className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {mostrarNombre(entry.jugador)}
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

      {/* Lista resto (posición 4+) */}
      {resto.length > 0 && (
        <div className="space-y-2">
          {resto.map((entry, i) => {
            const esYo = entry.user_id === userId;
            const pos  = i + 4;
            return (
              <div key={entry.user_id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                style={{
                  background: esYo ? 'rgba(234,88,12,0.08)' : 'var(--bg-card)',
                  border: `1px solid ${esYo ? 'rgba(234,88,12,0.4)' : 'var(--border)'}`,
                  outline: esYo ? '1px solid rgba(234,88,12,0.3)' : 'none',
                  animation: `fadeInUp 0.4s ease-out ${i * 50}ms both`,
                }}
              >
                <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{pos}</span>
                <Iniciales jugador={entry.jugador} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate flex items-center gap-1.5 flex-wrap"
                    style={{ color: esYo ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                    {mostrarNombre(entry.jugador)}
                    {esYo && <span className="text-[9px] bg-orange-600 text-black px-1.5 py-0.5 rounded-full font-black">TÚ</span>}
                    {pendienteIds?.includes(entry.user_id) && <span className="text-[10px] text-orange-500">⏳</span>}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {entry.exactos} exactos ✅
                    {pendienteIds?.includes(entry.user_id) && <span className="ml-1 text-orange-500">· Pago pendiente</span>}
                  </p>
                  {entry.jugador?.email && (
                    <p className="text-[10px] truncate" style={{ color: '#334155' }}>
                      {emailCorto(entry.jugador.email)}
                    </p>
                  )}
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

      {/* Si solo hay ≤3, mostrarlos en lista también */}
      {resto.length === 0 && ranking.length > 0 && (
        <div className="space-y-2">
          {ranking.map((entry, i) => {
            const esYo = entry.user_id === userId;
            return (
              <div key={entry.user_id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: esYo ? 'rgba(234,88,12,0.08)' : 'var(--bg-card)',
                  border: `1px solid ${esYo ? 'rgba(234,88,12,0.4)' : 'var(--border)'}`,
                  animation: `fadeInUp 0.4s ease-out ${i * 50}ms both`,
                }}
              >
                <span className="text-xl w-8 text-center">{podiumMedal[i] ?? `${i + 1}.`}</span>
                <Iniciales jugador={entry.jugador} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate flex items-center gap-1.5 flex-wrap"
                    style={{ color: esYo ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                    {mostrarNombre(entry.jugador)}
                    {esYo && <span className="text-[9px] bg-orange-600 text-black px-1.5 py-0.5 rounded-full font-black">TÚ</span>}
                    {pendienteIds?.includes(entry.user_id) && <span className="text-[10px] text-orange-500">⏳</span>}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {entry.exactos} exactos ✅
                    {pendienteIds?.includes(entry.user_id) && <span className="ml-1 text-orange-500">· Pago pendiente</span>}
                  </p>
                  {entry.jugador?.email && (
                    <p className="text-[10px] truncate" style={{ color: '#334155' }}>
                      {emailCorto(entry.jugador.email)}
                    </p>
                  )}
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
