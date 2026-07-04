'use client';

import { useState } from 'react';
import { Partido } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';
import { getMontoJornada } from '@/lib/utils';

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
}

function Contador({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-9 h-9 rounded-full font-bold text-lg transition-all active:scale-90 min-h-[40px] min-w-[40px]"
        style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        −
      </button>
      <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: 'var(--text-primary)', lineHeight: 1, minWidth: '1.75rem', textAlign: 'center' }}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 rounded-full font-bold text-lg transition-all active:scale-90 min-h-[40px] min-w-[40px]"
        style={{ background: 'var(--accent-gold)', color: '#000' }}
      >
        +
      </button>
    </div>
  );
}

export default function PrediccionForm({ partido, userId, quinielaExtraId, prediccionExistente, onGuardado, onCancelar }: Props) {
  const [local,           setLocal]           = useState(prediccionExistente?.goles_local_pred ?? 0);
  const [visita,          setVisita]          = useState(prediccionExistente?.goles_visitante_pred ?? 0);
  const [clasificadoPred, setClasificadoPred] = useState<string | null>(prediccionExistente?.clasificado_pred ?? null);
  const [comoTerminaPred, setComoTerminaPred] = useState<string | null>(prediccionExistente?.como_termina_pred ?? null);
  const [loading,         setLoading]         = useState(false);

  const handleGuardar = async () => {
    if (partido.jornada >= 5 && (!clasificadoPred || !comoTerminaPred)) {
      toast.error('Debes seleccionar quién clasifica y cómo termina el partido');
      return;
    }
    setLoading(true);

    // Verificar si ya existe participación para esta jornada + quiniela
    const basePartQuery = supabase
      .from('quiniela_participaciones')
      .select('pagado')
      .eq('user_id', userId)
      .eq('jornada', partido.jornada);

    const { data: participacion } = await (quinielaExtraId === null
      ? basePartQuery.is('quiniela_extra_id', null).maybeSingle()
      : basePartQuery.eq('quiniela_extra_id', quinielaExtraId).maybeSingle());

    // Si no tiene participación → crear una pendiente (solo la primera vez en la jornada)
    if (!participacion) {
      await supabase.from('quiniela_participaciones').insert({
        user_id:           userId,
        jornada:           partido.jornada,
        pagado:            false,
        monto:             getMontoJornada(partido.jornada),
        quiniela_extra_id: quinielaExtraId,
      });
    }

    // Guardar predicción — SELECT + UPDATE/INSERT para evitar el problema
    // de onConflict con quiniela_extra_id nullable en el índice predicciones_unique_idx
    const predPayload = {
      goles_local_pred:     local,
      goles_visitante_pred: visita,
      clasificado_pred:     partido.jornada >= 5 ? clasificadoPred : null,
      como_termina_pred:    partido.jornada >= 5 ? comoTerminaPred : null,
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
      ? await supabase
          .from('quiniela_predicciones')
          .update(predPayload)
          .eq('id', existing.id)
      : await supabase
          .from('quiniela_predicciones')
          .insert({
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

    // Verificar si completó todos los partidos de la jornada
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
      toast.success('🎉 ¡Completaste tus predicciones! Ya puedes publicarlas desde la pantalla principal.');
    } else {
      toast.success(prediccionExistente ? '¡Predicción actualizada! ⚽' : '¡Predicción guardada! ⚽');
    }
    onGuardado();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-y-auto"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid rgba(234,88,12,0.3)',
          animation: 'fadeIn 0.2s ease-out',
          maxHeight: '90vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-3 pt-4 space-y-3" style={{ paddingBottom: '80px' }}>
          <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--border)' }} />

          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Tu predicción
            </p>
            <p className="text-sm font-semibold flex items-center justify-center gap-1.5 flex-wrap" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
              <Bandera emoji={partido.bandera_local ?? ''} nombre={partido.equipo_local} size="sm" />
              {partido.equipo_local} vs {partido.equipo_visitante}
              <Bandera emoji={partido.bandera_visitante ?? ''} nombre={partido.equipo_visitante} size="sm" />
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Grupo {partido.grupo} · Jornada {partido.jornada}
            </p>
          </div>

          {partido.jornada >= 5 && (
            <p className="text-xs text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>
              ⏱️ Marcador a 90 minutos (tiempo reglamentario)
            </p>
          )}

          <div className="flex items-center justify-around py-1">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{partido.equipo_local}</span>
              <Contador value={local} onChange={setLocal} />
            </div>
            <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--border)' }}>–</span>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{partido.equipo_visitante}</span>
              <Contador value={visita} onChange={setVisita} />
            </div>
          </div>

          {partido.jornada >= 5 && (
            <p className="text-[11px] text-center leading-relaxed" style={{ color: '#64748b' }}>
              Empate a 90 min y predijiste empate = 1pt, aunque continúe a prórroga o penales.
            </p>
          )}

          {partido.jornada >= 5 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs text-center uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  ¿Quién clasifica?
                </p>
                <p className="text-[11px] text-center" style={{ color: '#64748b' }}>
                  Independiente del marcador a 90 min
                </p>
                <div className="flex gap-2">
                  {[partido.equipo_local, partido.equipo_visitante]
                    .filter(e => e && e !== 'A definir')
                    .map(equipo => (
                    <button
                      key={equipo}
                      type="button"
                      onClick={() => setClasificadoPred(equipo)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: clasificadoPred === equipo ? 'var(--accent-gold)' : 'var(--bg-card-hover)',
                        color: clasificadoPred === equipo ? '#000' : 'var(--text-secondary)',
                        border: `1px solid ${clasificadoPred === equipo ? 'var(--accent-gold)' : 'var(--border)'}`,
                      }}
                    >
                      {equipo}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-center uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  ¿Cómo termina?
                </p>
                <div className="flex gap-1.5">
                  {(['reglamentario', 'tiempo_extra', 'penales'] as const).map(opcion => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setComoTerminaPred(opcion)}
                      className="flex-1 py-2 rounded-xl font-semibold transition-all active:scale-95"
                      style={{
                        fontSize: '0.65rem',
                        background: comoTerminaPred === opcion ? 'var(--accent-gold)' : 'var(--bg-card-hover)',
                        color: comoTerminaPred === opcion ? '#000' : 'var(--text-secondary)',
                        border: `1px solid ${comoTerminaPred === opcion ? 'var(--accent-gold)' : 'var(--border)'}`,
                      }}
                    >
                      {opcion === 'reglamentario' ? '⏱️ 90 min' : opcion === 'tiempo_extra' ? '⏩ Prórroga' : '🥅 Penales'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 py-3 rounded-2xl font-semibold min-h-[48px] transition-all active:scale-95"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl font-bold min-h-[48px] transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--accent-gold)', color: '#000', fontFamily: 'var(--font-rajdhani)' }}
            >
              {loading ? 'Guardando…' : prediccionExistente ? 'Actualizar' : 'Guardar predicción'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
