'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function PerfilPage() {
  const router = useRouter();
  const [userId, setUserId]           = useState<string | null>(null);
  const [apodoActual, setApodoActual] = useState('');
  const [apodoTemp, setApodoTemp]     = useState('');
  const [editando, setEditando]       = useState(false);
  const [guardando, setGuardando]     = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [participaciones, setParticipaciones] = useState<any[]>([]);

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

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('quiniela_participaciones')
      .select('*, quiniela:quiniela_extra(nombre)')
      .eq('user_id', userId)
      .order('jornada')
      .then(({ data }) => setParticipaciones(data || []));
  }, [userId]);

  const guardarApodo = async () => {
    if (!userId) return;
    setGuardando(true);
    const { error } = await supabase
      .from('quiniela_jugadores')
      .update({ apodo: apodoTemp.trim() || null })
      .eq('id', userId);
    if (error) {
      console.error('Error guardando apodo:', error);
      toast.error('Error al guardar: ' + error.message);
    } else {
      setApodoActual(apodoTemp.trim());
      setEditando(false);
      toast.success('¡Apodo actualizado! 🏷️');
    }
    setGuardando(false);
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
          <div>
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
                placeholder="Ej: Capibara, El Panda, Suavecito..."
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
          </div>
        )}

        <p className="text-xs mt-2" style={{ color: '#64748b' }}>
          Máximo 20 caracteres. Aparece en ranking y jornadas.
        </p>
      </div>

      {/* Historial de pagos */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#12121a', border: '1px solid #1e1e2e', animation: 'fadeInUp 0.4s ease-out 0.2s both' }}
      >
        <h3 className="text-xl mb-3" style={{ fontFamily: 'var(--font-bebas)', color: '#ea580c' }}>
          💳 MIS PAGOS
        </h3>

        {participaciones.length === 0 ? (
          <p className="text-sm" style={{ color: '#64748b' }}>
            No tienes participaciones registradas aún.
          </p>
        ) : (
          <div className="space-y-3">
            {participaciones.map(part => (
              <div key={part.id}
                className="rounded-xl p-4"
                style={{ background: '#0a0a0a', border: '1px solid #1e1e2e' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                      Jornada {part.jornada}
                      {part.quiniela?.nombre && (
                        <span className="text-orange-400 ml-2 text-sm">
                          🎫 {part.quiniela.nombre}
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      {part.pagado_at
                        ? new Date(part.pagado_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'Sin fecha de pago'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg" style={{ fontFamily: 'var(--font-bebas)', color: '#ea580c' }}>
                      $50 MXN
                    </p>
                    {part.pagado ? (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                        ✅ Confirmado
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
                        ⏳ Pendiente
                      </span>
                    )}
                  </div>
                </div>
                {part.publicado && (
                  <p className="text-xs mt-2" style={{ color: '#475569' }}>
                    📢 Quiniela publicada
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cerrar sesión */}
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid #1e1e2e' }}>
        <p className="text-xs text-center mb-3" style={{ color: '#475569' }}>
          ¿Quieres entrar con otra cuenta de Google?
        </p>
        <button
          onClick={async () => {
            const confirmado = confirm(
              '¿Cerrar sesión?\n\nSolo hazlo si quieres cambiar de cuenta. La app seguirá funcionando normalmente cuando vuelvas a entrar.'
            );
            if (confirmado) {
              await supabase.auth.signOut();
              window.location.href = '/';
            }
          }}
          className="w-full py-3 rounded-xl text-sm transition-all"
          style={{
            background: '#12121a',
            border: '1px solid #1e1e2e',
            color: '#64748b',
            fontFamily: 'var(--font-rajdhani)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)';
            (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e1e2e';
            (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
          }}
        >
          Cambiar de cuenta
        </button>
      </div>
    </main>
  );
}
