'use client';

import { JUGADORES_DESEMPATE, JORNADA_DESEMPATE, DesempateRow } from '@/lib/desempate';
import { labelJornada } from '@/lib/utils';

interface Props {
  filas: DesempateRow[];
  cargando?: boolean;
  // Desempate dinámico (empatados detectados): reemplaza los textos fijos de los 4 jugadores
  subtitulo?: string;
  dinamico?: boolean;
}

const filaDesempate = (r: DesempateRow, pos: number, lider: boolean) => (
  <div
    key={r.key}
    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
    style={{
      background: lider ? 'color-mix(in srgb, var(--rs) 8%, transparent)' : 'var(--bg-card)',
      border: `1px solid ${lider ? 'color-mix(in srgb, var(--rs) 45%, transparent)' : 'var(--border)'}`,
    }}
  >
    <span className="w-6 text-center text-sm font-bold" style={{ color: lider ? 'var(--rs)' : 'var(--text-secondary)' }}>
      {lider ? '🏆' : pos}
    </span>
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
      style={{ background: 'var(--br)' }}
    >
      {r.nombre.slice(0, 2).toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm truncate" style={{ color: lider ? 'var(--accent-gold)' : 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
        {r.nombre}
      </p>
      <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{r.detalle ?? `${r.exactos} exactos ✅`}</p>
    </div>
    <div className="text-right">
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: lider ? 'var(--rs)' : 'var(--text-primary)', lineHeight: 1 }}>
        {r.puntos}
      </p>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>pts</p>
    </div>
  </div>
);

export default function DesempateTabla({ filas, cargando = false, subtitulo, dinamico = false }: Props) {
  const maxPuntos = filas.length ? Math.max(...filas.map(r => r.puntos)) : 0;
  // Hay líder solo si alguien ya sumó; con todos en 0 el desempate sigue abierto
  const hayLider = maxPuntos > 0;
  const lideres = filas.filter(r => r.puntos === maxPuntos).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl" style={{ color: 'var(--rs)' }}>
          🏆 Desempate — Pozo jornada anterior
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {subtitulo ?? `${labelJornada(JORNADA_DESEMPATE)} · puntos de la jornada 11`}
        </p>
      </div>

      {cargando ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
        </div>
      ) : filas.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--mut)' }}>
          No se encontraron TOKEN, J. Manuel, ALV ni JLG
        </p>
      ) : (
        <div className="space-y-2">
          {filas.map((r, i) => filaDesempate(r, i + 1, hayLider && r.puntos === maxPuntos))}
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {!hayLider
              ? 'Sin puntos todavía: el desempate sigue abierto'
              : lideres > 1 && dinamico
              ? `Siguen empatados con ${maxPuntos} pts: el desempate sigue abierto`
              : `🏆 va primero entre los ${dinamico ? filas.length : 4} con ${maxPuntos} pts`}
          </p>
          {!dinamico && filas.length < JUGADORES_DESEMPATE.length && (
            <p className="text-[11px]" style={{ color: 'var(--br)' }}>
              Solo se encontraron {filas.length} de los 4 jugadores
            </p>
          )}
        </div>
      )}
    </div>
  );
}
