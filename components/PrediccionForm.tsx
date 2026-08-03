'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DraftPrediccion, Partido } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';
import { getMontoJornada, TEMPORADA_ACTIVA } from '@/lib/utils';

interface Props {
  partido: Partido;
  userId: string;
  quinielaExtraId: string | null;
  prediccionExistente?: {
    goles_local_pred: number;
    goles_visitante_pred: number;
    clasificado_pred?: string | null;
    como_termina_pred?: string | null;
  } | null;
  onGuardado: () => void;
  onCancelar: () => void;
  onGuardadoBorrador?: (partidoId: string, data: DraftPrediccion) => void;
}

function Contador({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.82 }}
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="rounded-full font-bold text-xl flex items-center justify-center cursor-pointer"
          style={{
            width: 44,
            height: 44,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-primary)',
          }}
        >
          −
        </motion.button>

        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ opacity: 0, scale: 0.6, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: '4rem',
              color: 'var(--text-primary)',
              lineHeight: 1,
              minWidth: '3rem',
              textAlign: 'center',
              display: 'inline-block',
            }}
          >
            {value}
          </motion.span>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.82 }}
          type="button"
          onClick={() => onChange(value + 1)}
          className="rounded-full font-bold text-xl flex items-center justify-center cursor-pointer"
          style={{
            width: 44,
            height: 44,
            background: 'linear-gradient(135deg, #ea580c, #f97316)',
            color: '#fff',
          }}
        >
          +
        </motion.button>
      </div>
    </div>
  );
}

export default function PrediccionForm({
  partido,
  userId,
  quinielaExtraId,
  prediccionExistente,
  onGuardado,
  onCancelar,
  onGuardadoBorrador,
}: Props) {
  const [local,           setLocal]           = useState(prediccionExistente?.goles_local_pred ?? 0);
  const [visita,          setVisita]          = useState(prediccionExistente?.goles_visitante_pred ?? 0);
  const [clasificadoPred, setClasificadoPred] = useState<string | null>(prediccionExistente?.clasificado_pred ?? null);
  const [comoTerminaPred, setComoTerminaPred] = useState<string | null>(prediccionExistente?.como_termina_pred ?? null);
  const [loading,         setLoading]         = useState(false);

  const fechaPartido = new Date(partido.fecha_hora);
  const esLeaguesCup = fechaPartido >= new Date('2026-08-04T00:00:00Z') && fechaPartido < new Date('2026-08-14T00:00:00Z');
  const necesitaTerminacion = TEMPORADA_ACTIVA === 'ligamx2026' ? esLeaguesCup : partido.jornada >= 5;

  const handleGuardar = async () => {
    if (necesitaTerminacion && (!esLeaguesCup && !clasificadoPred || !comoTerminaPred)) {
      toast.error('Debes seleccionar cómo termina el partido');
      return;
    }
    setLoading(true);

    if (onGuardadoBorrador) {
      onGuardadoBorrador(partido.id, {
        goles_local_pred: local,
        goles_visitante_pred: visita,
        clasificado_pred: clasificadoPred,
        como_termina_pred: comoTerminaPred,
        puntos_ganados: 0,
      });
      setLoading(false);
      toast.success('¡Predicción guardada en borrador! ⚽');
      onGuardado();
      return;
    }

    const basePartQuery = supabase
      .from('quiniela_participaciones')
      .select('pagado')
      .eq('user_id', userId)
      .eq('jornada', partido.jornada);

    const { data: participacion } = await (quinielaExtraId === null
      ? basePartQuery.is('quiniela_extra_id', null).maybeSingle()
      : basePartQuery.eq('quiniela_extra_id', quinielaExtraId).maybeSingle());

    if (!participacion) {
      await supabase.from('quiniela_participaciones').insert({
        user_id:           userId,
        jornada:           partido.jornada,
        pagado:            false,
        monto:             getMontoJornada(partido.jornada),
        quiniela_extra_id: quinielaExtraId,
      });
    }

    const predPayload = {
      goles_local_pred:     local,
      goles_visitante_pred: visita,
      clasificado_pred:     necesitaTerminacion ? clasificadoPred : null,
      como_termina_pred:    necesitaTerminacion ? comoTerminaPred : null,
      updated_at:           new Date().toISOString(),
    };

    const baseExistingQuery = supabase
      .from('quiniela_predicciones')
      .select('id')
      .eq('user_id', userId)
      .eq('partido_id', partido.id);

    const { data: existing } = await (quinielaExtraId === null
      ? baseExistingQuery.is('quiniela_extra_id', null).maybeSingle()
      : baseExistingQuery.eq('quiniela_extra_id', quinielaExtraId).maybeSingle());

    const { error } = existing
      ? await supabase.from('quiniela_predicciones').update(predPayload).eq('id', existing.id)
      : await supabase.from('quiniela_predicciones').insert({
          user_id:           userId,
          partido_id:        partido.id,
          quiniela_extra_id: quinielaExtraId || null,
          ...predPayload,
        });

    if (error) {
      setLoading(false);
      toast.error('Error al guardar predicción');
      return;
    }

    const { data: partidosJornada } = await supabase
      .from('quiniela_partidos')
      .select('id')
      .eq('jornada', partido.jornada);

    const idsJornada = (partidosJornada ?? []).map((p: { id: string }) => p.id);

    const baseCountQuery = supabase
      .from('quiniela_predicciones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('partido_id', idsJornada);

    const { count: totalPredichas } = await (quinielaExtraId === null
      ? baseCountQuery.is('quiniela_extra_id', null)
      : baseCountQuery.eq('quiniela_extra_id', quinielaExtraId));

    const completo = idsJornada.length > 0 && !!totalPredichas && totalPredichas >= idsJornada.length;

    if (completo) {
      const baseCompleteQuery = supabase
        .from('quiniela_participaciones')
        .update({ predicciones_completas: true })
        .eq('user_id', userId)
        .eq('jornada', partido.jornada);

      await (quinielaExtraId === null
        ? baseCompleteQuery.is('quiniela_extra_id', null)
        : baseCompleteQuery.eq('quiniela_extra_id', quinielaExtraId));
    }

    setLoading(false);

    if (completo) {
      toast.success('🎉 ¡Completaste tus predicciones! Ya puedes publicarlas.');
    } else {
      toast.success(prediccionExistente ? '¡Predicción actualizada! ⚽' : '¡Predicción guardada! ⚽');
    }
    onGuardado();
  };

  const equiposParaClasificar = [partido.equipo_local, partido.equipo_visitante].filter(
    (e) => e && e !== 'A definir',
  );

  const terminaciones = esLeaguesCup
    ? [
        { key: 'reglamentario', label: '⏱️ Reglamentario' },
        { key: 'penales',       label: '🥅 Penales' },
      ] as const
    : [
        { key: 'reglamentario', label: '⏱️ 90 min' },
        { key: 'tiempo_extra',  label: '⏩ Prórroga' },
        { key: 'penales',       label: '🥅 Penales' },
      ] as const;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onCancelar}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="w-full max-w-sm flex flex-col rounded-t-3xl sm:rounded-3xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid rgba(234,88,12,0.2)',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(234,88,12,0.1)',
          maxHeight: '85dvh',
        }}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
      >
          {/* ── Scrollable content ── */}
          <div className="px-5 pt-5 pb-24 space-y-5 overflow-y-auto flex-1">
            {/* Handle */}
            <div
              className="w-10 h-1 rounded-full mx-auto"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            />

            {/* Title */}
            <div className="text-center space-y-1.5">
              <p
                className="text-[10px] uppercase tracking-widest font-bold"
                style={{ color: 'var(--text-secondary)' }}
              >
                Tu predicción
              </p>
              <p
                className="text-sm font-semibold flex items-center justify-center gap-2 flex-wrap"
                style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}
              >
                <Bandera emoji={partido.bandera_local ?? ''} nombre={partido.equipo_local} size="sm" />
                {partido.equipo_local}
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>vs</span>
                {partido.equipo_visitante}
                <Bandera emoji={partido.bandera_visitante ?? ''} nombre={partido.equipo_visitante} size="sm" />
              </p>
              {necesitaTerminacion && (
                <p className="text-[11px]" style={{ color: '#64748b' }}>
                  ⏱️ Marcador a 90 minutos (tiempo reglamentario)
                </p>
              )}
            </div>

            {/* Score counters */}
            <div
              className="flex items-center justify-around py-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <Contador value={local}  onChange={setLocal}  label={partido.equipo_local}     />
              <span
                style={{
                  fontFamily: 'var(--font-bebas)',
                  fontSize: '2.5rem',
                  color: 'rgba(255,255,255,0.1)',
                  lineHeight: 1,
                  marginTop: '1.5rem',
                }}
              >
                –
              </span>
              <Contador value={visita} onChange={setVisita} label={partido.equipo_visitante} />
            </div>

            {necesitaTerminacion && (
              <p className="text-[10px] text-center leading-relaxed" style={{ color: '#475569' }}>
                Empate a 90 min y predijiste empate = 1pt, aunque continúe a penales.
              </p>
            )}

            {/* Clasificado + Cómo termina */}
            {necesitaTerminacion && (
              <div className="space-y-4">
                {/* Clasificado — oculto en Leagues Cup */}
                {!esLeaguesCup && (
                <div className="space-y-2">
                  <p
                    className="text-[10px] text-center uppercase tracking-widest font-bold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    ¿Quién clasifica?
                  </p>
                  <p className="text-[10px] text-center" style={{ color: '#475569' }}>
                    Independiente del marcador a 90 min
                  </p>
                  <div className="flex gap-2">
                    {equiposParaClasificar.map((equipo) => (
                      <motion.button
                        key={equipo}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => setClasificadoPred(equipo)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                        style={{
                          background: clasificadoPred === equipo
                            ? 'linear-gradient(135deg, #ea580c, #f97316)'
                            : 'rgba(255,255,255,0.04)',
                          color: clasificadoPred === equipo ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${clasificadoPred === equipo ? 'transparent' : 'rgba(255,255,255,0.07)'}`,
                          fontFamily: 'var(--font-rajdhani)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {equipo}
                      </motion.button>
                    ))}
                  </div>
                </div>
                )}

                {/* Cómo termina */}
                <div className="space-y-2">
                  <p
                    className="text-[10px] text-center uppercase tracking-widest font-bold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    ¿Cómo termina?
                  </p>
                  <div className="flex gap-2">
                    {terminaciones.map(({ key, label }) => (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => setComoTerminaPred(key)}
                        className="flex-1 py-2.5 rounded-xl font-bold cursor-pointer"
                        style={{
                          fontSize: '0.62rem',
                          background: comoTerminaPred === key
                            ? 'linear-gradient(135deg, #ea580c, #f97316)'
                            : 'rgba(255,255,255,0.04)',
                          color: comoTerminaPred === key ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${comoTerminaPred === key ? 'transparent' : 'rgba(255,255,255,0.07)'}`,
                          fontFamily: 'var(--font-rajdhani)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky action bar ── */}
          <div
            className="px-5 pt-3 pb-24 flex gap-3 shrink-0"
            style={{
              background: 'var(--bg-surface)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={onCancelar}
              className="flex-1 py-3.5 rounded-2xl font-semibold text-sm min-h-[52px] cursor-pointer"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-secondary)',
                background: 'transparent',
                fontFamily: 'var(--font-rajdhani)',
              }}
            >
              Cancelar
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleGuardar}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm min-h-[52px] cursor-pointer"
              style={{
                background: loading
                  ? 'rgba(234,88,12,0.4)'
                  : 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                color: '#fff',
                fontFamily: 'var(--font-rajdhani)',
                letterSpacing: '0.03em',
                opacity: loading ? 0.7 : 1,
                boxShadow: loading ? 'none' : '0 4px 20px rgba(234,88,12,0.3)',
              }}
            >
              {loading
                ? 'Guardando…'
                : prediccionExistente
                ? 'Actualizar'
                : 'Guardar predicción'}
            </motion.button>
          </div>
      </motion.div>
    </motion.div>
  );
}
