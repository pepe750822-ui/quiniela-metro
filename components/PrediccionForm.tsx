'use client';

import { useState } from 'react';
import { Partido } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';

interface Props {
  partido: Partido;
  userId: string;
  prediccionExistente?: { goles_local_pred: number; goles_visitante_pred: number } | null;
  onGuardado: () => void;
  onCancelar: () => void;
}

function Contador({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-10 h-10 rounded-full font-bold text-xl transition-all active:scale-90 min-h-[44px] min-w-[44px]"
        style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        −
      </button>
      <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', color: 'var(--text-primary)', lineHeight: 1, minWidth: '2rem', textAlign: 'center' }}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-10 h-10 rounded-full font-bold text-xl transition-all active:scale-90 min-h-[44px] min-w-[44px]"
        style={{ background: 'var(--accent-gold)', color: '#000' }}
      >
        +
      </button>
    </div>
  );
}

export default function PrediccionForm({ partido, userId, prediccionExistente, onGuardado, onCancelar }: Props) {
  const [local,   setLocal]   = useState(prediccionExistente?.goles_local_pred ?? 0);
  const [visita,  setVisita]  = useState(prediccionExistente?.goles_visitante_pred ?? 0);
  const [loading, setLoading] = useState(false);

  const handleGuardar = async () => {
    setLoading(true);

    // Pago de $50 MXN es UNA VEZ por jornada completa (no por partido)
    // Siempre verificar si ya existe participación para esta jornada
    const { data: participacion } = await supabase
      .from('quiniela_participaciones')
      .select('pagado')
      .eq('user_id', userId)
      .eq('jornada', partido.jornada)
      .single();

    // Si no tiene participación → crear una pendiente (solo la primera vez en la jornada)
    if (!participacion) {
      await supabase.from('quiniela_participaciones').insert({
        user_id: userId,
        jornada: partido.jornada,
        pagado:  false,
        monto:   50,
      });
    }

    // Guardar predicción
    const { error } = await supabase.from('quiniela_predicciones').upsert({
      user_id:              userId,
      partido_id:           partido.id,
      goles_local_pred:     local,
      goles_visitante_pred: visita,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'user_id,partido_id' });

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

    const { count: totalPredichas } = await supabase
      .from('quiniela_predicciones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('partido_id', idsJornada);

    const completo = idsJornada.length > 0 && !!totalPredichas && totalPredichas >= idsJornada.length;

    if (completo) {
      await supabase
        .from('quiniela_participaciones')
        .update({ predicciones_completas: true })
        .eq('user_id', userId)
        .eq('jornada', partido.jornada);
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
        className="w-full max-w-sm rounded-2xl px-4 pt-6 pb-8 space-y-6"
        style={{ background: '#12121a', border: '1px solid rgba(234,88,12,0.3)', animation: 'fadeIn 0.2s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--border)' }} />

        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Tu predicción
          </p>
          <p className="font-semibold flex items-center justify-center gap-1.5 flex-wrap" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
            <Bandera emoji={partido.bandera_local ?? ''} nombre={partido.equipo_local} size="sm" />
            {partido.equipo_local} vs {partido.equipo_visitante}
            <Bandera emoji={partido.bandera_visitante ?? ''} nombre={partido.equipo_visitante} size="sm" />
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Grupo {partido.grupo} · Jornada {partido.jornada}
          </p>
        </div>

        <div className="flex items-center justify-around py-2">
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{partido.equipo_local}</span>
            <Contador value={local} onChange={setLocal} />
          </div>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--border)' }}>–</span>
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{partido.equipo_visitante}</span>
            <Contador value={visita} onChange={setVisita} />
          </div>
        </div>

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
  );
}
