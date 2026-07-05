'use client';

import { useEffect, useState } from 'react';
import { Partido } from '@/types';
import { Bandera } from '@/components/Bandera';
import { formatearHoraCDMX, formatearDiaCDMX, BANDERAS_EQUIPOS } from '@/lib/utils';

interface Props {
  partido: Partido;
  prediccion?: {
    goles_local_pred: number;
    goles_visitante_pred: number;
    puntos_ganados: number;
    clasificado_pred?: string | null;
    como_termina_pred?: string | null;
  } | null;
  participacionPagada?: boolean | null;
  onPredicir?: (partido: Partido) => void;
}

const borderColor: Record<string, string> = {
  pendiente:  '#ea580c',
  en_curso:   '#10b981',
  finalizado: '#334155',
};

const estadoBadge: Record<string, { bg: string; text: string; label: string }> = {
  pendiente:  { bg: 'rgba(234,88,12,0.15)',  text: '#ea580c',  label: 'Pendiente' },
  en_curso:   { bg: 'rgba(16,185,129,0.15)',  text: '#10b981',  label: '● En curso' },
  finalizado: { bg: 'rgba(100,116,139,0.15)', text: '#64748b',  label: 'Final' },
};

export default function PartidoCard({ partido, prediccion, participacionPagada, onPredicir }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fechaStr  = mounted ? formatearDiaCDMX(partido.fecha_hora) : '';
  const horaStr   = mounted ? formatearHoraCDMX(partido.fecha_hora) : '--:--';
  const badge     = estadoBadge[partido.estado];
  const puedePredicir = partido.estado === 'pendiente' && !!onPredicir;

  const puntosColor = prediccion
    ? prediccion.puntos_ganados === 3 ? '#10b981'
    : prediccion.puntos_ganados === 1 ? '#ea580c'
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

      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex-1 flex flex-col items-center gap-1">
          <Bandera emoji={partido.bandera_local ?? ''} nombre={partido.equipo_local} size="lg" />
          <span className="text-center text-sm font-bold leading-tight mt-1" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
            {partido.equipo_local}
          </span>
        </div>

        <div className="flex flex-col items-center px-2 min-w-[72px]">
          {partido.estado === 'finalizado' || partido.estado === 'en_curso' ? (
            <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', color: 'var(--accent-gold)', lineHeight: 1 }}>
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
          <Bandera emoji={partido.bandera_visitante ?? ''} nombre={partido.equipo_visitante} size="lg" />
          <span className="text-center text-sm font-bold leading-tight mt-1" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
            {partido.equipo_visitante}
          </span>
        </div>
      </div>

      {partido.jornada >= 5 && partido.estado === 'finalizado' && partido.clasificado && (
        <div className="px-4 pb-2 flex items-center gap-1.5 flex-wrap" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.375rem' }}>
          <Bandera
            emoji={partido.equipo_local === partido.clasificado ? (partido.bandera_local ?? '') : (partido.bandera_visitante ?? '')}
            nombre={partido.clasificado}
            size="sm"
          />
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            {partido.clasificado} clasifica
          </span>
          {partido.como_termino && (
            <>
              <span className="text-xs" style={{ color: '#475569' }}>·</span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                {partido.como_termino === 'reglamentario' ? '⏱️ Tiempo reglamentario'
                  : partido.como_termino === 'tiempo_extra' ? '⏩ Prórroga'
                  : '🥅 Penales'}
              </span>
            </>
          )}
        </div>
      )}

      {prediccion && (
        <div className="px-4 pb-3 pt-1 border-t space-y-1.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Tu pred: <strong style={{ color: 'var(--text-primary)' }}>{prediccion.goles_local_pred} – {prediccion.goles_visitante_pred}</strong>
              {partido.jornada >= 5 && (prediccion.clasificado_pred || prediccion.como_termina_pred) && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  {prediccion.clasificado_pred && (
                    <> | <Bandera emoji={BANDERAS_EQUIPOS[prediccion.clasificado_pred] ?? ''} nombre={prediccion.clasificado_pred} size="sm" /> {prediccion.clasificado_pred}</>
                  )}
                  {prediccion.como_termina_pred && (
                    <> | {prediccion.como_termina_pred === 'reglamentario' ? '⏱️' : prediccion.como_termina_pred === 'tiempo_extra' ? '⏩' : '🥅'}</>
                  )}
                </span>
              )}
            </span>
            {partido.estado === 'finalizado' && (
              <span className="text-xs font-bold" style={{ color: puntosColor }}>
                {prediccion.puntos_ganados === 3 ? '✅ +3 pts' : prediccion.puntos_ganados === 1 ? '〰️ +1 pt' : '❌ 0 pts'}
              </span>
            )}
          </div>
          {participacionPagada === false && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-orange-600/20 text-orange-500 border border-orange-600/40">
              ⏳ Pago pendiente
            </span>
          )}
          {participacionPagada === true && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              ✅ Participación confirmada
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
