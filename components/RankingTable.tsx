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

function Avatar({ jugador, size, lider }: { jugador?: Jugador | null; size: number; lider?: boolean }) {
  return (
    <div
      className="font-senal flex shrink-0 items-center justify-center rounded-full font-extrabold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: lider ? 'var(--brand-soft)' : 'var(--bg-card-hover)',
        border: `3px solid ${lider ? 'var(--brand)' : 'var(--text-secondary)'}`,
        color: 'var(--text-primary)',
      }}
    >
      {iniciales(jugador)}
    </div>
  );
}

function Insignias({ entry, esJornadaAlta }: { entry: RankingConJugador; esJornadaAlta: boolean }) {
  const j = entry.jugador;
  return (
    <>
      {!esJornadaAlta && j?.badge_ultimo && (
        <span className="rounded-md px-1.5 py-0.5 text-[12px] font-semibold" style={{ background: 'var(--fl-soft)', color: 'var(--fl)' }}>
          Último J{j.badge_ultimo.replace('J', '')}
        </span>
      )}
      {j?.badge_campeon && (
        <span className="rounded-md px-1.5 py-0.5 text-[12px] font-semibold" style={{ background: 'var(--rs)', color: 'var(--rs-ink)' }}>
          Campeón {j.badge_campeon}
        </span>
      )}
      {!esJornadaAlta && j?.campeon_pick && (
        <span className="rounded-md px-1.5 py-0.5 text-[12px] font-semibold" style={{ background: 'var(--ex-soft)', color: 'var(--ex)' }}>
          Pick: {j.campeon_pick}
        </span>
      )}
    </>
  );
}

function EstadoPago({ pendiente }: { pendiente: boolean }) {
  return pendiente ? (
    <span className="rounded-md px-1.5 py-px text-[12px] font-semibold" style={{ background: 'var(--rs)', color: 'var(--rs-ink)' }}>
      Pago pendiente
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: 'var(--ex)' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
      Pagado
    </span>
  );
}

function Fila({ entry, pos, esYo, pendiente, esJornadaAlta, i }: {
  entry: RankingConJugador; pos: number; esYo: boolean; pendiente: boolean; esJornadaAlta: boolean; i: number;
}) {
  return (
    <li
      className="flex min-h-[64px] items-center gap-3 rounded-2xl px-3.5 py-2.5"
      style={{
        background: 'var(--bg-card)',
        boxShadow: esYo ? 'inset 0 0 0 2px var(--brand)' : undefined,
        animation: `fadeInUp 0.35s ease-out ${i * 40}ms both`,
      }}
    >
      <span className="font-senal w-7 shrink-0 text-center text-[24px] font-extrabold" style={{ color: 'var(--text-muted)' }}>{pos}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>{mostrarNombre(entry.jugador)}</span>
          {esYo && (
            <span className="rounded-md px-1.5 py-px text-[12px] font-bold" style={{ background: 'var(--brand)', color: 'var(--brand-on)' }}>TÚ</span>
          )}
          <Insignias entry={entry} esJornadaAlta={esJornadaAlta} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {!esJornadaAlta && <span>{entry.exactos === 1 ? '1 exacto' : `${entry.exactos} exactos`}</span>}
          <EstadoPago pendiente={pendiente} />
          {entry.jugador?.quiniela_nombre && <span style={{ color: 'var(--brand)' }}>{entry.jugador.quiniela_nombre}</span>}
          {entry.jugador?.email && <span className="truncate">{emailCorto(entry.jugador.email)}</span>}
        </div>
      </div>
      <span className="font-senal min-w-[44px] text-right text-[30px] font-extrabold leading-none" style={{ color: 'var(--text-primary)' }}>
        {entry.puntos_total}
      </span>
    </li>
  );
}

export default function RankingTable({ ranking, userId, pendienteIds, jornada }: Props) {
  const esJornadaAlta = typeof jornada === 'number' && jornada >= 5;

  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[20px] px-5 py-8 text-center" style={{ background: 'var(--bg-card)' }}>
        <svg width="96" height="40" viewBox="0 0 96 40" aria-hidden="true">
          <rect x="0" y="17" width="96" height="6" rx="3" fill="#C8006A" />
          <circle cx="16" cy="20" r="11" fill="var(--bg-card)" stroke="#C8006A" strokeWidth="5" />
          <circle cx="48" cy="20" r="11" fill="var(--bg-card)" stroke="#C8006A" strokeWidth="5" strokeDasharray="4 4" />
          <circle cx="80" cy="20" r="11" fill="var(--bg-card)" stroke="#C8006A" strokeWidth="5" strokeDasharray="4 4" />
        </svg>
        <p className="text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>Aún no hay predicciones registradas</p>
        <p className="text-[15px]" style={{ color: 'var(--text-muted)' }}>En cuanto alguien publique su quiniela aparece aquí.</p>
      </div>
    );
  }

  const top3  = ranking.slice(0, 3);
  const resto = ranking.slice(3);
  const pend  = (id: string) => !!pendienteIds?.includes(id);

  // Podio: 2° - 1° - 3°
  const alturas = [66, 96, 48];
  const orden = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0]] : [];

  return (
    <div className="space-y-4">
      {orden.length >= 2 && (
        <section aria-label="Podio" className={`grid items-end gap-2 pt-2 ${orden.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {orden.map((entry, visualIdx) => {
            const realIdx = entry === top3[0] ? 0 : entry === top3[1] ? 1 : 2;
            const lider = realIdx === 0;
            const esYo = entry.user_id === userId;
            return (
              <div key={entry.id} className="flex min-w-0 flex-col items-center gap-1" style={{ animation: `fadeInUp 0.45s ease-out ${visualIdx * 90}ms both` }}>
                {lider && (
                  <svg width="26" height="20" viewBox="0 0 26 20" fill="#C8006A" aria-hidden="true"><path d="M2 18L0 4l7 6 6-10 6 10 7-6-2 14z" /></svg>
                )}
                <Avatar jugador={entry.jugador} size={lider ? 66 : 54} lider={lider} />
                <span className="max-w-full truncate text-[15px] font-bold" style={{ color: esYo ? 'var(--brand)' : 'var(--text-primary)' }}>
                  {mostrarNombre(entry.jugador)}
                </span>
                <span className="font-senal font-extrabold leading-none" style={{ fontSize: lider ? 38 : 30, color: 'var(--text-primary)' }}>
                  {entry.puntos_total} <span className="text-[15px] font-semibold" style={{ color: 'var(--text-muted)' }}>pts</span>
                </span>
                {!esJornadaAlta && (
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {entry.exactos === 1 ? '1 exacto' : `${entry.exactos} exactos`}
                  </span>
                )}
                {pend(entry.user_id) && <EstadoPago pendiente />}
                <div
                  className="font-senal mt-1 flex w-full items-center justify-center rounded-t-[14px] rounded-b-[4px] font-extrabold"
                  style={{
                    height: alturas[realIdx],
                    fontSize: lider ? 44 : 32,
                    background: lider ? '#C8006A' : 'var(--bg-card-hover)',
                    color: lider ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {realIdx + 1}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <ol aria-label="Ranking" className="m-0 list-none space-y-2 p-0">
        {(orden.length >= 2 ? resto : ranking).map((entry, i) => (
          <Fila
            key={entry.id}
            entry={entry}
            pos={(orden.length >= 2 ? 4 : 1) + i}
            esYo={entry.user_id === userId}
            pendiente={pend(entry.user_id)}
            esJornadaAlta={esJornadaAlta}
            i={i}
          />
        ))}
      </ol>
    </div>
  );
}
