'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function Spinner() {
  return <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border focus:ring-2 focus:ring-orange-500/40';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends the token in the URL hash; wait for the session to be set
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError('No se pudo actualizar la contraseña. El link puede haber expirado.');
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/'), 2500);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border-color)',
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Patrón hexagonal */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
            <polygon points="28,2 54,16 54,44 28,58 2,44 2,16" fill="none" stroke="#ea580c" strokeWidth="1"/>
            <polygon points="28,52 54,66 54,94 28,108 2,94 2,66" fill="none" stroke="#ea580c" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)"/>
      </svg>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <img src="/icons/icon-192.png" alt="Quiniela Metro" className="w-20 h-20 rounded-2xl mx-auto mb-3 shadow-lg shadow-orange-500/30" />
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}>
            NUEVA CONTRASEÑA
          </h1>
          <p className="mt-1 text-sm font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
            Elige una contraseña segura 🔑
          </p>
        </div>

        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {success ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-4xl">✅</p>
              <p className="font-bold text-base" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
                ¡Contraseña actualizada!
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Redirigiendo…
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center space-y-3 py-6">
              <Spinner />
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                Verificando link…
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Si esto tarda mucho, el link puede haber expirado.{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="underline"
                  style={{ color: 'var(--accent-gold)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Volver al login
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Nueva contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={INPUT_CLASS}
                  style={{ ...inputStyle, paddingRight: '2.75rem' }}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  tabIndex={-1}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirmar contraseña"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={INPUT_CLASS}
                  style={{ ...inputStyle, paddingRight: '2.75rem' }}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  tabIndex={-1}
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>

              {error && (
                <p className="text-xs font-semibold px-1" style={{ color: 'var(--accent-red)' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}
              >
                {loading ? <Spinner /> : null}
                {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
