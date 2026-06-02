'use client';

import { useState } from 'react';
import { Partido } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
  partido: Partido;
  userId: string;
  prediccionExistente?: { goles_local_pred: number; goles_visitante_pred: number } | null;
  onGuardado: () => void;
  onCancelar: () => void;
}

export default function PrediccionForm({ partido, userId, prediccionExistente, onGuardado, onCancelar }: Props) {
  const [local, setLocal]    = useState(prediccionExistente?.goles_local_pred ?? 0);
  const [visita, setVisita]  = useState(prediccionExistente?.goles_visitante_pred ?? 0);
  const [loading, setLoading] = useState(false);

  const handleGuardar = async () => {
    setLoading(true);
    const { error } = await supabase.from('quiniela_predicciones').upsert({
      user_id:              userId,
      partido_id:           partido.id,
      goles_local_pred:     local,
      goles_visitante_pred: visita,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'user_id,partido_id' });

    setLoading(false);
    if (error) {
      toast.error('Error al guardar predicción');
    } else {
      toast.success('¡Predicción guardada!');
      onGuardado();
    }
  };

  const Contador = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(Math.max(0, value - 1))}
        className="w-10 h-10 rounded-full bg-zinc-700 text-white font-bold text-lg hover:bg-zinc-600">−</button>
      <span className="text-3xl font-black text-white w-8 text-center">{value}</span>
      <button onClick={() => onChange(value + 1)}
        className="w-10 h-10 rounded-full bg-amber-500 text-black font-bold text-lg hover:bg-amber-400">+</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={onCancelar}>
      <div className="w-full bg-zinc-900 rounded-t-3xl p-6 space-y-6" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-1">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Tu predicción</p>
          <p className="text-lg font-bold text-white">
            {partido.bandera_local} {partido.equipo_local} vs {partido.equipo_visitante} {partido.bandera_visitante}
          </p>
        </div>

        <div className="flex items-center justify-around">
          <div className="text-center space-y-2">
            <p className="text-sm text-zinc-400">{partido.equipo_local}</p>
            <Contador value={local} onChange={setLocal} />
          </div>
          <span className="text-2xl font-black text-zinc-500">–</span>
          <div className="text-center space-y-2">
            <p className="text-sm text-zinc-400">{partido.equipo_visitante}</p>
            <Contador value={visita} onChange={setVisita} />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancelar}
            className="flex-1 py-3 rounded-2xl border border-zinc-600 text-zinc-400 font-semibold">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-60">
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
