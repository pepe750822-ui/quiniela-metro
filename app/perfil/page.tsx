'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function PerfilPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [apodo, setApodo]   = useState('');
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
      setApodo(jugador?.apodo || jugador?.nombre?.split(' ')[0] || '');
    });
  }, [router]);

  const guardarApodo = async () => {
    if (!userId) return;
    setGuardando(true);
    const { error } = await supabase
      .from('quiniela_jugadores')
      .update({ apodo: apodo.trim() || null })
      .eq('id', userId);
    setGuardando(false);
    if (error) {
      toast.error('Error al guardar apodo');
    } else {
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
        <h3
          className="text-xl mb-3"
          style={{ fontFamily: 'var(--font-bebas)', color: '#ea580c' }}
        >
          👤 Tu apodo en el ranking
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={apodo}
            onChange={(e) => setApodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && guardarApodo()}
            placeholder="Ej: El Suavecito, Mago, Toro..."
            maxLength={20}
            className="flex-1 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
            style={{ background: '#0a0a0a', border: '1px solid #1e1e2e' }}
            onFocus={(e) => (e.target.style.borderColor = '#ea580c')}
            onBlur={(e) => (e.target.style.borderColor = '#1e1e2e')}
          />
          <button
            onClick={guardarApodo}
            disabled={guardando}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#ea580c', color: '#fff', fontFamily: 'var(--font-rajdhani)' }}
          >
            {guardando ? '...' : 'Guardar'}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: '#64748b' }}>
          Máximo 20 caracteres. Aparece en ranking y jornadas.
        </p>
      </div>
    </main>
  );
}
