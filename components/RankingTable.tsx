'use client';

import { RankingConJugador } from '@/types';

interface Props {
  ranking: RankingConJugador[];
  userId?: string;
}

export default function RankingTable({ ranking, userId }: Props) {
  if (ranking.length === 0) {
    return <p className="text-center text-zinc-500 py-8">Aún no hay predicciones registradas.</p>;
  }

  return (
    <div className="space-y-2">
      {ranking.map((entry, i) => {
        const esYo = entry.user_id === userId;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return (
          <div key={entry.user_id}
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all
              ${esYo
                ? 'bg-amber-500/10 border-amber-500/40'
                : 'bg-zinc-800 border-zinc-700'}`}>
            <span className="text-xl w-8 text-center font-bold">{medal}</span>
            <div className="flex-1">
              <p className={`font-bold text-sm ${esYo ? 'text-amber-400' : 'text-white'}`}>
                {entry.jugador?.nombre ?? 'Jugador'}
                {esYo && <span className="ml-2 text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded-full font-black">TÚ</span>}
              </p>
              <p className="text-xs text-zinc-400">{entry.exactos} exactos ✅</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-white">{entry.puntos_total}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
