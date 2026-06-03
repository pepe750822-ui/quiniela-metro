'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function PerfilPage() {
  const router = useRouter();
  const [userId, setUserId]       = useState<string | null>(null);
  const [apodoActual, setApodoActual] = useState('');
  const [apodoTemp, setApodoTemp] = useState('');
  const [editando, setEditando]   = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('apodo, nombre')
        .eq('id', data.user.id)
        .single();
      const apodo = jugador?.apodo || '';
      setApodoActual(apodo);
      setApodoTemp(apodo);
      // Sin apodo → abrir edición directo
      if (!apodo) setEditando(true);
    });
  }, [router]);

  const guardarApodo = async () => {
    if (!userId) return;
    setGuardando(true);
    const { error } = await supabase
      .from('quiniela_jugadores')
      .update({ apodo: apodoTemp.trim() || null })
      .eq('id', userId);
    setGuardando(false);
    if (error) {
      console.error('Error guardando apodo:', error);
      toast.error('Error al guardar');
    } else {
      setApodoActual(apodoTemp.trim());
      setEditando(false);
      toast.success('¡Apodo actualizado!');
    }
  };

  return (
    <main
      className="max-w-lg mx-auto px-4 pb-24 space-y-6"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}>
          PERFIL
        </h1>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: '#12121a', border: '1px solid #1e1e2e', animation: 'fadeInUp 0.4s ease-out 0.1s both' }}
      >
        <h3 className="text-xl mb-3" style={{ fontFamily: 'var(--font-bebas)', color: '#ea580c' }}>
          👤 Tu apodo en el ranking
        </h3>

        {!editando && apodoActual ? (
          <div className="flex items-center gap-3">
            <span className="font-bold text-xl" style={{ color: '#ea580c', fontFamily: 'var(--font-rajdhani)' }}>
              🏷️ {apodoActual}
            </span>
            <button
              onClick={() => { setEditando(true); setApodoTemp(apodoActual); }}
              className="text-xs transition-colors"
              style={{ color: '#64748b' }}
            >
              ✏️ Cambiar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              id="apodo"
              name="apodo"
              type="text"
              value={apodoTemp}
              onChange={e => setApodoTemp(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') guardarApodo();
                if (e.key === 'Escape' && apodoActual) setEditando(false);
              }}
              placeholder="Ej: El Suavecito, Mago, Toro..."
              maxLength={20}
              autoFocus={editando}
              className="flex-1 rounded-lg px-3 py-2 text-white text-sm outline-none"
              style={{ background: '#0a0a0a', border: '1px solid #ea580c' }}
            />
            <button
              onClick={guardarApodo}
              disabled={guardando}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: '#ea580c', color: '#fff', fontFamily: 'var(--font-rajdhani)' }}
            >
              {guardando ? '...' : 'Guardar'}
            </button>
            {apodoActual && (
              <button
                onClick={() => setEditando(false)}
                className="px-2 text-sm transition-colors"
                style={{ color: '#64748b' }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        <p className="text-xs mt-2" style={{ color: '#64748b' }}>
          Máximo 20 caracteres. Aparece en ranking y jornadas.
        </p>
      </div>
    </main>
  );
}
