'use client'; // v2 — bandera fallback to BANDERAS_EQUIPOS

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

export default function PartidoCard({ partido, prediccion, participacionPagada, onPredicir }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fechaStr  = mounted ? formatearDiaCDMX(partido.fecha_hora) : '';
  const horaStr   = mounted ? formatearHoraCDMX(partido.fecha_hora) : '--:--';
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
    if (pts >= 3) return { cls: 'pts-3', label: '+3 Exacto' };
    if (pts === 1) return { cls: 'pts-1', label: '+1 Resultado' };
    return { cls: 'pts-0', label: '0 Fallo' };
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
    const totalColor = pts >= 3 ? 'var(--ex)' : pts >= 1 ? 'var(--text-primary)' : 'var(--fl)';
    return { pts, ptsBase, ptsClasif, ptsComo, emojiComo, banderaClasif, totalColor };
  })() : null;

  const etiqueta = partido.grupo
    ? (partido.grupo === 'LC' ? 'Leagues Cup' : `Grupo ${partido.grupo}`)
    : `Liga MX J${partido.jornada}`;

  const ptsTxt = (n: number) => (n >= 3 ? '+3' : n >= 1 ? `+${n}` : '0');
  const ptsCls = (n: number) => (n >= 3 ? 'pts-3' : n >= 1 ? 'pts-1' : 'pts-0');

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="relative overflow-hidden rounded-[20px]"
      style={{
        background: 'var(--bg-card)',
        boxShadow: vivo ? 'inset 0 0 0 2px var(--live)' : '0 1px 0 rgba(21,18,15,0.05)',
      }}
    >
      {/* ── Encabezado: fecha · etiqueta · estado ── */}
      <div className="flex items-center gap-2 px-4 pt-3.5 text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
        <span className="truncate">{fin || vivo ? fechaStr : `${fechaStr} · ${horaStr}`}</span>
        <span
          className="shrink-0 rounded-md px-1.5 py-px text-[12px] font-bold"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        >
          {etiqueta}
        </span>
        <span className="flex-1" />
        {fin && (
          <span className="shrink-0 rounded-md px-2 py-0.5 text-[12px] font-bold tracking-wide" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>
            FINAL
          </span>
        )}
        {vivo && (
          <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-bold" style={{ color: 'var(--ex)' }}>
            <span className="en-vivo-dot inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--live)' }} />
            EN VIVO
          </span>
        )}
        {partido.estado === 'pendiente' && (
          <span className="shrink-0 rounded-md px-2 py-0.5 text-[12px] font-bold" style={{ border: '1px solid var(--text-muted)' }}>
            PENDIENTE
          </span>
        )}
      </div>

      {/* ── Equipos + marcador ── */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 pb-4 pt-3">
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Bandera emoji={partido.bandera_local || BANDERAS_EQUIPOS[partido.equipo_local] || ''} nombre={partido.equipo_local} size="lg" />
          <span className="w-full truncate text-center text-[15px] font-bold leading-tight" style={{ color: 'var(--text-primary)', opacity: visitWins ? 0.6 : 1 }}>
            {partido.equipo_local}
          </span>
        </div>

        <div className="flex min-w-[92px] shrink-0 flex-col items-center gap-1">
          {fin || vivo ? (
            <span className="font-senal text-[46px] font-extrabold leading-none" style={{ color: 'var(--text-primary)' }}>
              {gl}–{gv}
            </span>
          ) : (
            <>
              <span className="font-senal text-[26px] font-bold leading-none" style={{ color: 'var(--text-muted)' }}>VS</span>
              <span className="font-senal text-[18px] font-bold" style={{ color: 'var(--text-primary)' }}>{horaStr}</span>
            </>
          )}
          {partido.marcador_penales && (
            <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              Pen: {partido.marcador_penales}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Bandera emoji={partido.bandera_visitante || BANDERAS_EQUIPOS[partido.equipo_visitante] || ''} nombre={partido.equipo_visitante} size="lg" />
          <span className="w-full truncate text-center text-[15px] font-bold leading-tight" style={{ color: 'var(--text-primary)', opacity: localWins ? 0.6 : 1 }}>
            {partido.equipo_visitante}
          </span>
        </div>
      </div>

      {/* ── Clasificado (J5+ o Leagues Cup) ── */}
      {(partido.jornada >= 5 || esLeaguesCup) && partido.estado === 'finalizado' && partido.clasificado && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <Bandera
            emoji={partido.equipo_local === partido.clasificado ? (partido.bandera_local ?? '') : (partido.bandera_visitante ?? '')}
            nombre={partido.clasificado}
            size="sm"
          />
          <span><strong style={{ color: 'var(--text-primary)' }}>{partido.clasificado}</strong> clasifica</span>
          {partido.como_termino && (
            <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>
              {partido.como_termino === 'reglamentario' ? '90 min'
                : partido.como_termino === 'tiempo_extra' ? 'Prórroga'
                : 'Penales'}
            </span>
          )}
        </div>
      )}

      {/* ── Talón del boleto: perforado con muescas ── */}
      {(prediccion || puedePredicir) && (
        <div className="relative mx-3.5 perforado" aria-hidden="true">
          <span className="absolute -left-[24px] -top-[11px] h-5 w-5 rounded-full" style={{ background: 'var(--bg-base)' }} />
          <span className="absolute -right-[24px] -top-[11px] h-5 w-5 rounded-full" style={{ background: 'var(--bg-base)' }} />
        </div>
      )}

      {/* ── Mi predicción ── */}
      {prediccion && (
        <div className="space-y-2 px-4 py-3">
          <div className="flex min-h-[36px] items-center justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-2.5">
              <span className="shrink-0 text-[13px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                Mi predicción
              </span>
              <span className="font-senal text-[26px] font-extrabold leading-none" style={{ color: 'var(--text-primary)' }}>
                {prediccion.goles_local_pred}–{prediccion.goles_visitante_pred}
              </span>
              {mostrarTerminacion && prediccion.como_termina_pred && (
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  {prediccion.como_termina_pred === 'reglamentario' ? '90 min'
                    : prediccion.como_termina_pred === 'tiempo_extra' ? 'Prórroga' : 'Penales'}
                </span>
              )}
              {mostrarTerminacion && prediccion.clasificado_pred && (
                <Bandera emoji={BANDERAS_EQUIPOS[prediccion.clasificado_pred] ?? ''} nombre={prediccion.clasificado_pred} size="sm" />
              )}
            </div>
            {(vivo || (fin && partido.estado !== 'pendiente')) && !puedePredicir && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" role="img" aria-label="Predicción bloqueada" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            )}
            {vivo && !esLC && (
              <span className="pts-p shrink-0 rounded-lg px-2.5 py-1.5 text-[14px] font-bold">En juego</span>
            )}
            {fin && !esLC && lmxBadge && (
              <span className={`${lmxBadge.cls} shrink-0 rounded-lg px-2.5 py-1.5 text-[14px] font-bold`}>
                {lmxBadge.label}
              </span>
            )}
          </div>

          {/* Desglose LC */}
          {fin && esLC && lcDesglose && (
            <div className="space-y-1.5 rounded-xl px-3 py-2.5 text-[13px]" style={{ background: 'var(--bg-base)' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {lcDesglose.ptsBase >= 3 ? 'Exacto' : lcDesglose.ptsBase >= 1 ? 'Resultado' : 'Fallo'}
                </span>
                <span className={`${ptsCls(lcDesglose.ptsBase)} rounded-md px-2 py-0.5 font-bold`}>{ptsTxt(lcDesglose.ptsBase)}</span>
              </div>
              {partido.clasificado && (
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>{lcDesglose.banderaClasif ?? '?'} Clasificado</span>
                  <span className={`${lcDesglose.ptsClasif ? 'pts-3' : 'pts-0'} rounded-md px-2 py-0.5 font-bold`}>{lcDesglose.ptsClasif ? '+1' : '0'}</span>
                </div>
              )}
              {partido.como_termino && (
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Terminación</span>
                  <span className={`${lcDesglose.ptsComo ? 'pts-3' : 'pts-0'} rounded-md px-2 py-0.5 font-bold`}>{lcDesglose.ptsComo ? '+1' : '0'}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5" style={{ borderTop: '1px solid var(--border-color)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Total</span>
                <span className="font-senal text-[20px] font-extrabold" style={{ color: lcDesglose.totalColor }}>{lcDesglose.pts} pts</span>
              </div>
            </div>
          )}

          {participacionPagada === false && (
            <span className="inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold" style={{ background: 'var(--rs)', color: 'var(--rs-ink)' }}>
              Pago pendiente
            </span>
          )}
          {participacionPagada === true && (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: 'var(--ex)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
              Pago confirmado
            </span>
          )}
        </div>
      )}

      {/* ── CTA ── */}
      {puedePredicir && (
        <div className={prediccion ? 'px-4 pb-4' : 'px-4 py-3'}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onPredicir(partido)}
            className="min-h-[48px] w-full cursor-pointer rounded-xl text-[16px] font-bold"
            style={prediccion
              ? { background: 'transparent', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)' }
              : { background: 'var(--brand)', color: 'var(--brand-on)' }}
          >
            {prediccion ? 'Editar predicción' : 'Predecir marcador'}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
