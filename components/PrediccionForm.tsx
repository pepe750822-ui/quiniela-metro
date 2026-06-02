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

function Contador({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-12 h-12 rounded-full font-bold text-xl transition-all active:scale-90 min-h-[48px]"
        style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        −
      </button>
      <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '3.5rem', color: 'var(--text-primary)', lineHeight: 1, minWidth: '2.5rem', textAlign: 'center' }}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-12 h-12 rounded-full font-bold text-xl transition-all active:scale-90 min-h-[48px]"
        style={{ background: 'var(--accent-gold)', color: '#000' }}
      >
        +
      </button>
    </div>
  );
}

const OPCIONES_CREDITOS = [
  { cantidad: 1, precio: 50 },
  { cantidad: 2, precio: 100 },
  { cantidad: 3, precio: 150 },
];

function ModalPago({ onCerrar }: { onCerrar: () => void }) {
  const [seleccionado, setSeleccionado] = useState(1);
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-3xl mb-2">🔒</p>
        <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', color: 'var(--accent-gold)', lineHeight: 1 }}>
          Necesitas créditos
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Cada predicción cuesta <strong style={{ color: 'var(--text-primary)' }}>$50 MXN</strong>
        </p>
      </div>

      {/* Selector de cantidad */}
      <div className="flex gap-2">
        {OPCIONES_CREDITOS.map(op => (
          <button
            key={op.cantidad}
            type="button"
            onClick={() => setSeleccionado(op.cantidad)}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: seleccionado === op.cantidad ? 'var(--accent-gold)' : 'var(--bg-card-hover)',
              color: seleccionado === op.cantidad ? '#000' : 'var(--text-secondary)',
              border: `1px solid ${seleccionado === op.cantidad ? 'var(--accent-gold)' : 'var(--border)'}`,
              fontFamily: 'var(--font-rajdhani)',
            }}
          >
            {op.cantidad} pred.<br />
            <span style={{ fontSize: '0.9rem' }}>${op.precio}</span>
          </button>
        ))}
      </div>

      {/* Datos de pago */}
      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-gold)' }}>
          💳 Transferencia SPEI / CoDi
        </p>
        {[
          ['Banco',   'Santander'],
          ['Nombre',  'JOSE LUIS GONZALEZ PEREZ'],
          ['CLABE',   '014180565546539842'],
          ['Cuenta',  '56554653984'],
          ['Tarjeta', '5579 1004 9245 3954'],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between items-center gap-2">
            <span className="text-[11px] shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span
              className="text-[11px] font-mono font-bold text-right"
              style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}
            >
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* Instrucción */}
      <div className="rounded-2xl p-3 text-center text-xs space-y-1" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Envía tu comprobante por WhatsApp al:</p>
        <p className="font-bold text-base" style={{ color: 'var(--accent-gold)' }}>📱 55 2326 9241</p>
        <p style={{ color: 'var(--text-secondary)' }}>
          Tu predicción quedará activa en cuanto<br />confirmemos tu pago ✅
        </p>
      </div>

      <button
        type="button"
        onClick={onCerrar}
        className="w-full py-3 rounded-2xl font-bold min-h-[48px] transition-all active:scale-95"
        style={{ background: 'var(--accent-gold)', color: '#000', fontFamily: 'var(--font-rajdhani)' }}
      >
        Entendido
      </button>
    </div>
  );
}

export default function PrediccionForm({ partido, userId, prediccionExistente, onGuardado, onCancelar }: Props) {
  const [local,          setLocal]          = useState(prediccionExistente?.goles_local_pred ?? 0);
  const [visita,         setVisita]         = useState(prediccionExistente?.goles_visitante_pred ?? 0);
  const [loading,        setLoading]        = useState(false);
  const [showModalPago,  setShowModalPago]  = useState(false);

  const handleGuardar = async () => {
    setLoading(true);

    // Solo cobrar crédito en predicciones nuevas
    if (!prediccionExistente) {
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('creditos')
        .eq('id', userId)
        .single();

      if (!jugador || jugador.creditos <= 0) {
        setLoading(false);
        setShowModalPago(true);
        return;
      }

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

      await supabase.from('quiniela_jugadores')
        .update({ creditos: jugador.creditos - 1 })
        .eq('id', userId);

      setLoading(false);
      toast.success('¡Predicción guardada! ⚽');
      onGuardado();
    } else {
      // Editar predicción existente — sin costo
      const { error } = await supabase.from('quiniela_predicciones').upsert({
        user_id:              userId,
        partido_id:           partido.id,
        goles_local_pred:     local,
        goles_visitante_pred: visita,
        updated_at:           new Date().toISOString(),
      }, { onConflict: 'user_id,partido_id' });

      setLoading(false);
      if (error) toast.error('Error al guardar predicción');
      else { toast.success('¡Predicción actualizada! ⚽'); onGuardado(); }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={showModalPago ? undefined : onCancelar}
    >
      <div
        className="w-full rounded-t-3xl px-6 pt-6 pb-8 space-y-6"
        style={{ background: 'rgba(10,10,15,0.98)', borderTop: '1px solid var(--border)', animation: 'slideUp 0.3s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--border)' }} />

        {showModalPago ? (
          <ModalPago onCerrar={onCancelar} />
        ) : (
          <>
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>Tu predicción</p>
              <p className="font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
                {partido.bandera_local} {partido.equipo_local} vs {partido.equipo_visitante} {partido.bandera_visitante}
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
          </>
        )}
      </div>
    </div>
  );
}
