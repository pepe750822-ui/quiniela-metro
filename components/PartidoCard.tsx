'use client'; // v2 — bandera fallback to BANDERAS_EQUIPOS

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Partido } from '@/types';
import { Bandera } from '@/components/Bandera';
import { ChipPuntos } from '@/components/ui/Puntos';
import { formatearHoraCDMX, BANDERAS_EQUIPOS, TEMPORADA_ACTIVA } from '@/lib/utils';

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

const estadoBadge: Record<string, { bg: string; text: string; label: string; dot: boolean }> = {
  pendiente:  { bg: 'var(--pnS)', text: 'var(--ink2)', label: 'Pendiente', dot: false },
  en_curso:   { bg: 'transparent', text: 'var(--lv)', label: 'En vivo', dot: true },
  finalizado: { bg: 'var(--ink)', text: 'var(--bg)', label: 'Final', dot: false },
};

// «Jue 12 nov» en hora de CDMX
const fmtCorta = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', weekday: 'short', day: 'numeric', month: 'short' });
function fechaCorta(iso: string) {
  const t = fmtCorta.format(new Date(iso)).replace(/\./g, '').replace(',', '').replace(' de ', ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function PartidoCard({ partido, prediccion, participacionPagada, onPredicir }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fechaStr  = mounted ? fechaCorta(partido.fecha_hora) : '';
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
    && fechaPartido < new Date('2026-08-14T06:00:00Z');
  const mostrarTerminacion = partido.jornada >= 5 || esLeaguesCup;

  const esLC = partido.grupo === 'LC';


  const lmxBadge = (!esLC && prediccion && fin) ? (() => {
    const pts = prediccion.puntos_ganados;
    return { pts };
  })() : null;

  const lcDesglose = (esLC && prediccion && fin) ? (() => {
    const pts = prediccion.puntos_ganados;
    const ptsClasif = (partido.clasificado && prediccion.clasificado_pred === partido.clasificado) ? 1 : 0;
    const ptsComo   = (partido.como_termino && prediccion.como_termina_pred === partido.como_termino) ? 1 : 0;
    const ptsBase   = Math.max(0, pts - ptsClasif - ptsComo);
    const emojiComo = partido.como_termino === 'penales' ? '🥅'
      : partido.como_termino === 'tiempo_extra' ? '⏩' : '⏱️';
    const banderaClasif = prediccion.clasificado_pred
      ? (partido.equipo_local === prediccion.clasificado_pred ? (partido.bandera_local ?? '')
        : partido.equipo_visitante === prediccion.clasificado_pred ? (partido.bandera_visitante ?? '')
        : BANDERAS_EQUIPOS[prediccion.clasificado_pred] ?? prediccion.clasificado_pred)
      : null;
    const totalColor = pts >= 4 ? 'var(--rs)' : pts === 3 ? 'var(--ex)' : pts === 2 ? '#60a5fa' : pts === 1 ? 'var(--rs)' : 'var(--fl)';
    return { pts, ptsBase, ptsClasif, ptsComo, emojiComo, banderaClasif, totalColor };
  })() : null;

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="rounded-[16px] overflow-hidden"
      style={{
        background: 'var(--sf)',
        border: `${vivo ? 2 : 1}px solid ${vivo ? 'var(--lv)' : 'var(--ln)'}`,
      }}
    >
      {/* ── Header bar ── */}
      <div
        className="px-4 pt-3 pb-1 flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium truncate" style={{ color: 'var(--mut)' }}>
            {fechaStr}{fechaStr ? ' · ' : ''}{horaStr}
          </span>
          <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded-[6px] shrink-0" style={{ border: '1px solid var(--ln)', color: 'var(--ink2)' }}>
            {partido.grupo ? `${partido.grupo} · ` : ''}J{partido.jornada}
          </span>
        </span>

        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] shrink-0"
          style={{ background: badge.bg }}
        >
          {badge.dot && (
            <motion.span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: badge.text }}
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <span
            className="text-[12px] font-bold uppercase tracking-wider"
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
          <Bandera emoji={partido.bandera_local || BANDERAS_EQUIPOS[partido.equipo_local] || ''} nombre={partido.equipo_local} size="lg" />
          <span
            className="text-[14px] font-semibold text-center leading-tight w-full truncate"
            style={{
              color: 'var(--ink)',
              opacity: fin && !localWins && gl !== gv ? 0.7 : 1,
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
                  fontFamily: 'var(--font-display)',
                  fontSize: 46,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--ink)',
                }}
              >
                {gl}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.75rem',
                  lineHeight: 1,
                  color: 'var(--mut)',
                }}
              >
                –
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 46,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--ink)',
                }}
              >
                {gv}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="font-display" style={{ fontSize: 28, color: 'var(--mut)', lineHeight: 1 }}>
                VS
              </span>
              <span className="text-[14px] font-bold mt-1" style={{ color: 'var(--ink)' }}>
                {horaStr}
              </span>
            </div>
          )}
          {partido.marcador_penales && (
            <span
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--br) 10%, transparent)', color: 'var(--br)' }}
            >
              Pen: {partido.marcador_penales}
            </span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <Bandera emoji={partido.bandera_visitante || BANDERAS_EQUIPOS[partido.equipo_visitante] || ''} nombre={partido.equipo_visitante} size="lg" />
          <span
            className="text-[14px] font-semibold text-center leading-tight w-full truncate"
            style={{
              color: 'var(--ink)',
              opacity: fin && !visitWins && gl !== gv ? 0.7 : 1,
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
          style={{ borderTop: '1px solid color-mix(in srgb, var(--ink) 4%, transparent)', background: 'color-mix(in srgb, var(--br) 3%, transparent)' }}
        >
          <Bandera
            emoji={partido.equipo_local === partido.clasificado ? (partido.bandera_local ?? '') : (partido.bandera_visitante ?? '')}
            nombre={partido.clasificado}
            size="sm"
          />
          <span className="text-xs" style={{ color: 'var(--mut)' }}>
            <strong style={{ color: 'var(--br)' }}>{partido.clasificado}</strong> clasifica
          </span>
          {partido.como_termino && (
            <span className="text-xs ml-auto" style={{ color: 'var(--mut)' }}>
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
          style={{ borderTop: '2px dashed var(--ln)', background: 'color-mix(in srgb, var(--sf2) 45%, var(--sf))' }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-medium shrink-0" style={{ color: 'var(--mut)' }}>
                Mi predicción
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 24,
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {prediccion.goles_local_pred}–{prediccion.goles_visitante_pred}
              </span>
              {!puedePredicir && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-label="Bloqueada" style={{ color: 'var(--mut)' }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              )}
              {mostrarTerminacion && prediccion.como_termina_pred && (
                <span className="text-xs" style={{ color: 'var(--mut)' }}>
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
            {fin && !esLC && lmxBadge && (
              <ChipPuntos pts={lmxBadge.pts} className="shrink-0" />
            )}
          </div>

          {/* Desglose LC */}
          {fin && esLC && lcDesglose && (
            <div
              className="rounded-xl px-3 py-2 space-y-1"
              style={{ background: 'color-mix(in srgb, var(--ink) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 6%, transparent)', fontSize: 11 }}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--mut)' }}>
                  {lcDesglose.ptsBase >= 3 ? '⚽⚽⚽ Exacto' : lcDesglose.ptsBase >= 1 ? '⚽ Resultado' : '✗ Fallo'}
                </span>
                <span style={{ color: lcDesglose.ptsBase >= 3 ? 'var(--ex)' : lcDesglose.ptsBase >= 1 ? 'var(--rs)' : 'var(--fl)', fontWeight: 700 }}>
                  {lcDesglose.ptsBase >= 3 ? '+3pts' : lcDesglose.ptsBase >= 1 ? '+1pt' : '0pts'}
                </span>
              </div>
              {partido.clasificado && (
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--mut)' }}>
                    {lcDesglose.banderaClasif ?? '?'} Clasificado
                  </span>
                  <span style={{ color: lcDesglose.ptsClasif ? 'var(--ex)' : 'var(--fl)', fontWeight: 700 }}>
                    {lcDesglose.ptsClasif ? '+1pt' : '+0'}
                  </span>
                </div>
              )}
              {partido.como_termino && (
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--mut)' }}>
                    {lcDesglose.emojiComo} Terminación
                  </span>
                  <span style={{ color: lcDesglose.ptsComo ? 'var(--ex)' : 'var(--fl)', fontWeight: 700 }}>
                    {lcDesglose.ptsComo ? '+1pt' : '+0'}
                  </span>
                </div>
              )}
              <div
                className="flex items-center justify-between"
                style={{ borderTop: '1px solid color-mix(in srgb, var(--mut) 15%, transparent)', paddingTop: 4, marginTop: 2 }}
              >
                <span style={{ color: 'var(--mut)', fontWeight: 600 }}>Total</span>
                <span style={{ color: lcDesglose.totalColor, fontWeight: 700, fontSize: 13 }}>
                  {lcDesglose.pts}pts
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {participacionPagada === false && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--br) 8%, transparent)',
                  color: 'var(--br)',
                  border: '1px solid color-mix(in srgb, var(--br) 20%, transparent)',
                }}
              >
                ⏳ Pago pendiente
              </span>
            )}
            {participacionPagada === true && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--ex) 8%, transparent)',
                  color: 'var(--ex)',
                  border: '1px solid color-mix(in srgb, var(--ex) 20%, transparent)',
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
            className="w-full rounded-[12px] font-bold text-[16px] min-h-[48px] cursor-pointer"
            style={{
              background: prediccion ? 'transparent' : 'var(--br)',
              color: prediccion ? 'var(--ink)' : 'var(--brI)',
              border: prediccion ? '1.5px solid var(--ink)' : 'none',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {prediccion ? 'Editar predicción' : 'Hacer predicción'}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
