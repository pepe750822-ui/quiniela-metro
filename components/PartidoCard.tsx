'use client';

import { Partido } from '@/types';

interface Props {
  partido: Partido;
  prediccion?: { goles_local_pred: number; goles_visitante_pred: number; puntos_ganados: number } | null;
  onPredicir?: (partido: Partido) => void;
}

const borderColor: Record<string, string> = {
  pendiente:  '#f59e0b',
  en_curso:   '#10b981',
  finalizado: '#334155',
};

const estadoBadge: Record<string, { bg: string; text: string; label: string }> = {
  pendiente:  { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b',  label: 'Pendiente' },
  en_curso:   { bg: 'rgba(16,185,129,0.15)',  text: '#10b981',  label: '● En curso' },
  finalizado: { bg: 'rgba(100,116,139,0.15)', text: '#64748b',  label: 'Final' },
};

export default function PartidoCard({ partido, prediccion, onPredicir }: Props) {
  const fechaHora = new Date(partido.fecha_hora);
  const fechaStr  = fechaHora.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  const horaStr   = fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const badge     = estadoBadge[partido.estado];
  const puedePredicir = partido.estado === 'pendiente' && !!onPredicir;

  const puntosColor = prediccion
    ? prediccion.puntos_ganados === 3 ? '#10b981'
    : prediccion.puntos_ganados === 1 ? '#f59e0b'
    : '#ef4444'
    : '';

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        borderLeft: `4px solid ${borderColor[partido.estado]}`,
        border: `1px solid var(--border)`,
        borderLeftWidth: '4px',
        borderLeftColor: borderColor[partido.estado],
      }}
    >
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Grupo {partido.grupo} · J{partido.jornada}
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>
      </div>

      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-center gap-1">
          <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{partido.bandera_local}</span>
          <span className="text-center text-sm font-bold leading-tight" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
            {partido.equipo_local}
          </span>
        </div>

        <div className="flex flex-col items-center px-2 min-w-[80px]">
          {partido.estado === 'finalizado' || partido.estado === 'en_curso' ? (
            <span
              style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', color: 'var(--accent-gold)', lineHeight: 1 }}
            >
              {partido.goles_local ?? '-'}&nbsp;–&nbsp;{partido.goles_visitante ?? '-'}
            </span>
          ) : (
            <>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{fechaStr}</span>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{horaStr}</span>
            </>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{partido.bandera_visitante}</span>
          <span className="text-center text-sm font-bold leading-tight" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
            {partido.equipo_visitante}
          </span>
        </div>
      </div>

      {prediccion && (
        <div className="px-4 pb-2 pt-1 flex items-center justify-between border-t" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Tu pred: <strong style={{ color: 'var(--text-primary)' }}>{prediccion.goles_local_pred} – {prediccion.goles_visitante_pred}</strong>
          </span>
          {partido.estado === 'finalizado' && (
            <span className="text-xs font-bold" style={{ color: puntosColor }}>
              {prediccion.puntos_ganados === 3 ? '✅ +3 pts' : prediccion.puntos_ganados === 1 ? '〰️ +1 pt' : '❌ 0 pts'}
            </span>
          )}
        </div>
      )}

      {puedePredicir && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onPredicir(partido)}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 min-h-[48px]"
            style={{ background: 'var(--accent-gold)', color: '#000', fontFamily: 'var(--font-rajdhani)' }}
          >
            {prediccion ? '✏️ Editar predicción' : '⚽ Hacer predicción'}
          </button>
        </div>
      )}
    </div>
  );
}
