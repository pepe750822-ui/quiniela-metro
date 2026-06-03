'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://quiniela-metro.vercel.app/auth/callback',
        queryParams: { prompt: 'select_account', access_type: 'offline' },
      },
    });
    setLoading(false);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Patrón hexagonal SVG de fondo */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
            <polygon points="28,2 54,16 54,44 28,58 2,44 2,16" fill="none" stroke="#ea580c" strokeWidth="1"/>
            <polygon points="28,52 54,66 54,94 28,108 2,94 2,66" fill="none" stroke="#ea580c" strokeWidth="1"/>
            <polygon points="0,27 0,71 28,85 56,71 56,27 28,13" fill="none" stroke="#ea580c" strokeWidth="0.5" transform="translate(28,0)"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)"/>
      </svg>

      {/* Glow ambiental */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-sm space-y-10 text-center">
        <div style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          <img
            src="/icons/icon-192.png"
            alt="Quiniela Metro"
            className="w-24 h-24 rounded-2xl mx-auto mb-4 shadow-lg shadow-orange-500/30"
          />
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '3.5rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}>
            QUINIELA METRO
          </h1>
          <p className="mt-1 font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
            Mundial 2026 🏆
          </p>
        </div>

        <div style={{ animation: 'fadeInUp 0.6s ease-out 0.15s both' }}>
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-semibold text-base transition-all active:scale-95 disabled:opacity-60 min-h-[56px]"
            style={{ background: '#fff', color: '#111', fontFamily: 'var(--font-rajdhani)' }}
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Redirigiendo…' : 'Entrar con Google'}
          </button>
          <p className="mt-4 text-sm font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
            ¡Predice, compite y gana! 🏆
          </p>
        </div>
      </div>
    </main>
  );
}
