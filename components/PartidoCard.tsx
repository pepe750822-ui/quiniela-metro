'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Partido } from '@/types';
import { Bandera } from '@/components/Bandera';
import { formatearHoraCDMX, formatearDiaCDMX, BANDERAS_EQUIPOS, TEMPORADA_ACTIVA } from '@/lib/utils';

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

const estadoBadge: Record<string, { bg: string; text: string; label: string; glow: string; dot: boolean }> = {
  pendiente:  { bg: 'rgba(234,88,12,0.12)',   text: '#f97316', label: 'Pendiente', glow: 'rgba(234,88,12,0.08)',  dot: false },
  en_curso:   { bg: 'rgba(16,185,129,0.12)',  text: '#10b981', label: 'En vivo',   glow: 'rgba(16,185,129,0.12)', dot: true  },
  finalizado: { bg: 'rgba(100,116,139,0.08)', text: '#64748b', label: 'Final',     glow: 'none',                  dot: false },
};

const borderAccent: Record<string, string> = {
  pendiente:  'rgba(234,88,12,0.28)',
  en_curso:   'rgba(16,185,129,0.45)',
  finalizado: 'rgba(255,255,255,0.05)',
};

export default function PartidoCard({ partido, prediccion, participacionPagada, onPredicir }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fechaStr  = mounted ? formatearDiaCDMX(partido.fecha_hora) : '';
  const horaStr   = mounted ? formatearHoraCDMX(partido.fecha_hora) : '--:--';
  const badge     = estadoBadge[partido.estado];
  const puedePredicir = partido.estado === 'pendiente' && !!onPredicir;

  const gl = partido.goles_local ?? 0;
  const gv = partido.goles_visitante ?? 0;
  const fin  = partido.estado === 'finalizado';
  const vivo = partido.estado === 'en_curso';
  const localWins = fin && gl > gv;
  const visitWins = fin && gv > gl;

  const fechaPartido = new Date(partido.fecha_hora);
  const esLeaguesCup = TEMPORADA_ACTIVA === 'ligamx2026'
    && fechaPartido >= new Date('2026-08-04T00:00:00Z')
    && fechaPartido < new Date('2026-08-14T00:00:00Z');
  const mostrarTerminacion = partido.jornada >= 5 || esLeaguesCup;

  const puntosInfo = prediccion
    ? prediccion.puntos_ganados === 3
      ? { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  label: '+3 pts' }
      : prediccion.puntos_ganados === 1
      ? { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)',  label: '+1 pt'  }
      : { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   label: '0 pts'  }
    : null;

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${borderAccent[partido.estado]}`,
        boxShadow: vivo ? '0 0 28px rgba(16,185,129,0.1)' : 'none',
      }}
    >
      {/* ── Header bar ── */}
      <div
        className="px-4 pt-3 pb-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {partido.grupo ? `Grupo ${partido.grupo} · ` : ''}J{partido.jornada}
        </span>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: badge.bg }}
        >
          {badge.dot && (
            <motion.span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: badge.text }}
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: badge.text }}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* ── Teams + Score ── */}
      <div className="px-4 py-4 flex items-center justify-between gap-2">
        {/* Local */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <Bandera emoji={partido.bandera_local ?? ''} nombre={partido.equipo_local} size="lg" />
          <span
            className="text-xs font-bold text-center leading-tight w-full truncate"
            style={{
              fontFamily: 'var(--font-rajdhani)',
              color: localWins ? '#f97316' : 'var(--text-primary)',
            }}
          >
            {partido.equipo_local}
          </span>
        </div>

        {/* Score / Time */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          {fin || vivo ? (
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  fontFamily: 'var(--font-bebas)',
                  fontSize: '2.75rem',
                  lineHeight: 1,
                  color: localWins ? '#f97316' : 'var(--text-primary)',
                }}
              >
                {gl}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-bebas)',
                  fontSize: '1.75rem',
                  lineHeight: 1,
                  color: 'rgba(255,255,255,0.15)',
                }}
              >
                –
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-bebas)',
                  fontSize: '2.75rem',
                  lineHeight: 1,
                  color: visitWins ? '#f97316' : 'var(--text-primary)',
                }}
              >
                {gv}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {fechaStr}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-bebas)',
                  fontSize: '1.6rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.1,
                }}
              >
                {horaStr}
              </span>
            </div>
          )}
          {partido.marcador_penales && (
            <span
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(234,88,12,0.1)', color: '#f97316' }}
            >
              Pen: {partido.marcador_penales}
            </span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <Bandera emoji={partido.bandera_visitante ?? ''} nombre={partido.equipo_visitante} size="lg" />
          <span
            className="text-xs font-bold text-center leading-tight w-full truncate"
            style={{
              fontFamily: 'var(--font-rajdhani)',
              color: visitWins ? '#f97316' : 'var(--text-primary)',
            }}
          >
            {partido.equipo_visitante}
          </span>
        </div>
      </div>

      {/* ── Clasificado (J5+ o Leagues Cup) ── */}
      {(partido.jornada >= 5 || esLeaguesCup) && partido.estado === 'finalizado' && partido.clasificado && (
        <div
          className="px-4 py-2 flex items-center gap-2 flex-wrap"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(234,88,12,0.03)' }}
        >
          <Bandera
            emoji={partido.equipo_local === partido.clasificado ? (partido.bandera_local ?? '') : (partido.bandera_visitante ?? '')}
            nombre={partido.clasificado}
            size="sm"
          />
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            <strong style={{ color: '#f97316' }}>{partido.clasificado}</strong> clasifica
          </span>
          {partido.como_termino && (
            <span className="text-xs ml-auto" style={{ color: '#64748b' }}>
              {partido.como_termino === 'reglamentario' ? '⏱️ 90 min'
                : partido.como_termino === 'tiempo_extra' ? '⏩ Prórroga'
                : '🥅 Penales'}
            </span>
          )}
        </div>
      )}

      {/* ── Mi predicción ── */}
      {prediccion && (
        <div
          className="px-4 py-3 space-y-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-semibold shrink-0" style={{ color: 'var(--text-secondary)' }}>
                Mi pred:
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-bebas)',
                  fontSize: '1.2rem',
                  color: 'var(--accent-gold)',
                  lineHeight: 1,
                }}
              >
                {prediccion.goles_local_pred} – {prediccion.goles_visitante_pred}
              </span>
              {mostrarTerminacion && prediccion.como_termina_pred && (
                <span className="text-xs" style={{ color: '#64748b' }}>
                  {prediccion.como_termina_pred === 'reglamentario' ? '⏱️'
                    : prediccion.como_termina_pred === 'tiempo_extra' ? '⏩' : '🥅'}
                </span>
              )}
              {mostrarTerminacion && prediccion.clasificado_pred && (
                <div className="flex items-center gap-1">
                  <Bandera emoji={BANDERAS_EQUIPOS[prediccion.clasificado_pred] ?? ''} nombre={prediccion.clasificado_pred} size="sm" />
                </div>
              )}
            </div>
            {partido.estado === 'finalizado' && puntosInfo && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{
                  background: puntosInfo.bg,
                  color: puntosInfo.color,
                  border: `1px solid ${puntosInfo.border}`,
                }}
              >
                {puntosInfo.label}
              </span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {participacionPagada === false && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: 'rgba(234,88,12,0.08)',
                  color: '#f97316',
                  border: '1px solid rgba(234,88,12,0.2)',
                }}
              >
                ⏳ Pago pendiente
              </span>
            )}
            {participacionPagada === true && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  color: '#10b981',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                ✓ Confirmado
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── CTA button ── */}
      {puedePredicir && (
        <div className="px-4 pb-4 pt-1">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onPredicir(partido)}
            className="w-full py-3 rounded-xl font-bold text-sm min-h-[48px] cursor-pointer"
            style={{
              background: prediccion
                ? 'rgba(234,88,12,0.1)'
                : 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
              color: prediccion ? '#f97316' : '#fff',
              border: prediccion ? '1px solid rgba(234,88,12,0.25)' : 'none',
              fontFamily: 'var(--font-rajdhani)',
              letterSpacing: '0.04em',
              fontSize: '0.9rem',
            }}
          >
            {prediccion ? 'Editar predicción' : 'Hacer predicción'}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
