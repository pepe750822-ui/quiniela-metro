'use client';

import { Jugador, RankingConJugador } from '@/types';
import { emailCorto } from '@/lib/utils';

interface Props {
  ranking: RankingConJugador[];
  userId?: string;
  pendienteIds?: string[];
  jornada?: number | 'general';
}

const mostrarNombre = (j?: Jugador | null) =>
  j?.apodo ?? j?.nombre?.split(' ')[0] ?? 'Jugador';

const iniciales = (j?: Jugador | null) => {
  const texto = j?.apodo ?? j?.nombre ?? '?';
  return texto.slice(0, 2).toUpperCase();
};

function Iniciales({ jugador, grande, lider }: { jugador?: Jugador | null; grande?: boolean; lider?: boolean }) {
  const t = grande ? 56 : 40;
  return (
    <div
      className="rounded-full flex items-center justify-center font-display shrink-0"
      style={{ width: t, height: t, fontSize: grande ? 22 : 16, background: lider ? 'var(--brS)' : 'var(--sf)', color: lider ? 'var(--br)' : 'var(--ink)', border: `${grande ? 4 : 3}px solid ${lider ? 'var(--br)' : 'var(--ink)'}` }}
    >
      {iniciales(jugador)}
    </div>
  );
}

export default function RankingTable({ ranking, userId, pendienteIds, jornada }: Props) {
  const esJornadaAlta = typeof jornada === 'number' && jornada >= 5;

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
        <div className="flex items-end justify-center gap-2 pt-2">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, visualIdx) => {
            const realIdx = entry === top3[0] ? 0 : entry === top3[1] ? 1 : 2;
            const lider = realIdx === 0;
            const alto  = [56, 88, 40][realIdx];
            return (
              <div key={entry.id}
                className="flex-1 flex flex-col items-center min-w-0"
                style={{ animation: `fadeInUp 0.4s ease-out ${visualIdx * 80}ms both` }}
              >
                {lider && (
                  <svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true" style={{ color: 'var(--br)', marginBottom: 2 }}>
                    <path d="M2 16 4 4l5 5 3-7 3 7 5-5 2 12Z" fill="currentColor" />
                  </svg>
                )}
                <Iniciales jugador={entry.jugador} grande={lider} lider={lider} />
                <p className="text-[14px] font-bold text-center leading-tight mt-1.5 truncate max-w-full" style={{ color: 'var(--ink)' }}>
                  {mostrarNombre(entry.jugador)}
                </p>
                {entry.jugador?.quiniela_nombre && (
                  <span className="text-[12px] text-center block truncate max-w-full" style={{ color: 'var(--br)' }}>
                    {entry.jugador.quiniela_nombre}
                  </span>
                )}
                <p className="font-display mt-1" style={{ fontSize: lider ? 34 : 26, color: 'var(--ink)', lineHeight: 1 }}>
                  {entry.puntos_total}<span className="text-[13px] ml-1 normal-case font-sans font-semibold" style={{ color: 'var(--mut)' }}>pts</span>
                </p>
                {!esJornadaAlta && <p className="text-[12px]" style={{ color: 'var(--mut)' }}>{entry.exactos} exacto{entry.exactos !== 1 ? 's' : ''}</p>}
                <div className="flex flex-wrap justify-center gap-1 mt-1">
                  {!esJornadaAlta && entry.jugador?.badge_ultimo && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-[6px]" style={{ background: 'var(--pnS)', color: 'var(--ink2)' }}>
                      🤡 Último J{entry.jugador.badge_ultimo.replace('J', '')}
                    </span>
                  )}
                  {entry.jugador?.badge_campeon && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-[6px]" style={{ background: 'var(--rs)', color: '#2B1D00' }}>
                      🏆 {entry.jugador.badge_campeon}
                    </span>
                  )}
                  {!esJornadaAlta && entry.jugador?.campeon_pick && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-[6px]" style={{ background: 'var(--pnS)', color: 'var(--ink2)' }}>
                      ⚽ {entry.jugador.campeon_pick}
                    </span>
                  )}
                </div>
                <div className="w-full mt-2 flex items-start justify-center rounded-t-[12px] font-display pt-1.5"
                  style={{ height: alto, background: lider ? 'var(--br)' : 'var(--sf2)', color: lider ? 'var(--brI)' : 'var(--ink2)', fontSize: lider ? 36 : 26, lineHeight: 1 }}>
                  {realIdx + 1}
                </div>
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
              <div key={entry.id}
                className="flex items-center gap-3 px-4 py-3 rounded-[16px] transition-all"
                style={{
                  background: 'var(--sf)',
                  border: `${esYo ? 2 : 1}px solid ${esYo ? 'var(--br)' : 'var(--ln)'}`,
                                    animation: `fadeInUp 0.4s ease-out ${i * 50}ms both`,
                }}
              >
                <span className="w-6 text-center font-display text-[20px]" style={{ color: 'var(--ink2)' }}>{pos}</span>
                <Iniciales jugador={entry.jugador} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate flex items-center gap-1.5 flex-wrap"
                    style={{ color: 'var(--ink)' }}>
                    {mostrarNombre(entry.jugador)}
                    {esYo && <span className="text-[11px] px-1.5 py-0.5 rounded-[6px] font-bold" style={{ background: 'var(--br)', color: 'var(--brI)' }}>TÚ</span>}
                    {pendienteIds?.includes(entry.user_id) && <span className="text-[10px] text-orange-500">⏳</span>}
                    {!esJornadaAlta && entry.jugador?.badge_ultimo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--rs) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--rs) 30%, transparent)', color: 'var(--rs)' }}>
                        🤡 Último J{entry.jugador.badge_ultimo.replace('J', '')}
                      </span>
                    )}
                    {entry.jugador?.badge_campeon && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--rs) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--rs) 40%, transparent)', color: 'var(--rs)' }}>
                        🏆 {entry.jugador.badge_campeon}
                      </span>
                    )}
                    {!esJornadaAlta && entry.jugador?.campeon_pick && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--ex) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--ex) 30%, transparent)', color: 'var(--ex)' }}>
                        ⚽ {entry.jugador.campeon_pick}
                      </span>
                    )}
                  </p>
                  {entry.jugador?.quiniela_nombre && (
                    <span className="text-xs block" style={{ color: 'var(--br)' }}>
                      🎫 {entry.jugador.quiniela_nombre}
                    </span>
                  )}
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {!esJornadaAlta && `${entry.exactos} exactos`}
                    {pendienteIds?.includes(entry.user_id) && <span className="ml-1 font-semibold" style={{ color: 'var(--fl)' }}>· Pago pendiente</span>}
                  </p>
                  {entry.jugador?.email && (
                    <p className="text-[10px] truncate" style={{ color: 'var(--mut)' }}>
                      {emailCorto(entry.jugador.email)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--ink)', lineHeight: 1 }}>
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
              <div key={entry.id}
                className="flex items-center gap-3 px-4 py-3 rounded-[16px]"
                style={{
                  background: 'var(--sf)',
                  border: `${esYo ? 2 : 1}px solid ${esYo ? 'var(--br)' : 'var(--ln)'}`,
                  animation: `fadeInUp 0.4s ease-out ${i * 50}ms both`,
                }}
              >
                <span className="w-6 text-center font-display text-[20px]" style={{ color: i === 0 ? 'var(--br)' : 'var(--ink2)' }}>{i + 1}</span>
                <Iniciales jugador={entry.jugador} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate flex items-center gap-1.5 flex-wrap"
                    style={{ color: 'var(--ink)' }}>
                    {mostrarNombre(entry.jugador)}
                    {esYo && <span className="text-[11px] px-1.5 py-0.5 rounded-[6px] font-bold" style={{ background: 'var(--br)', color: 'var(--brI)' }}>TÚ</span>}
                    {pendienteIds?.includes(entry.user_id) && <span className="text-[10px] text-orange-500">⏳</span>}
                    {!esJornadaAlta && entry.jugador?.badge_ultimo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--rs) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--rs) 30%, transparent)', color: 'var(--rs)' }}>
                        🤡 Último J{entry.jugador.badge_ultimo.replace('J', '')}
                      </span>
                    )}
                    {entry.jugador?.badge_campeon && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--rs) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--rs) 40%, transparent)', color: 'var(--rs)' }}>
                        🏆 {entry.jugador.badge_campeon}
                      </span>
                    )}
                    {!esJornadaAlta && entry.jugador?.campeon_pick && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--ex) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--ex) 30%, transparent)', color: 'var(--ex)' }}>
                        ⚽ {entry.jugador.campeon_pick}
                      </span>
                    )}
                  </p>
                  {entry.jugador?.quiniela_nombre && (
                    <span className="text-xs block" style={{ color: 'var(--br)' }}>
                      🎫 {entry.jugador.quiniela_nombre}
                    </span>
                  )}
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {!esJornadaAlta && `${entry.exactos} exactos`}
                    {pendienteIds?.includes(entry.user_id) && <span className="ml-1 font-semibold" style={{ color: 'var(--fl)' }}>· Pago pendiente</span>}
                  </p>
                  {entry.jugador?.email && (
                    <p className="text-[10px] truncate" style={{ color: 'var(--mut)' }}>
                      {emailCorto(entry.jugador.email)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--ink)', lineHeight: 1 }}>
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
