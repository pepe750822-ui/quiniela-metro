'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const loginStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const loginItem = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

type Mode = 'login' | 'register';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function Spinner() {
  return <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border focus:ring-2 focus:ring-orange-500/40';

export default function LoginPage() {
  const router = useRouter();

  // Google OAuth
  const [googleLoading, setGoogleLoading] = useState(false);

  // Email+password
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError]   = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Reset password
  const [showReset, setShowReset]     = useState(false);
  const [resetEmail, setResetEmail]   = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent]     = useState(false);
  const [resetError, setResetError]   = useState('');

  // Magic Link
  const [showMagic, setShowMagic]     = useState(false);
  const [magicEmail, setMagicEmail]   = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent]     = useState(false);
  const [magicError, setMagicError]   = useState('');

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        queryParams: { prompt: 'select_account', access_type: 'offline' },
      },
    });
    setGoogleLoading(false);
  };

  // ── Email + Password ─────────────────────────────────────────────────────
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!email || !password) { setPwdError('Completa todos los campos.'); return; }

    if (mode === 'register') {
      if (password.length < 6) { setPwdError('La contraseña debe tener al menos 6 caracteres.'); return; }
      if (password !== confirm) { setPwdError('Las contraseñas no coinciden.'); return; }
    }

    setPwdLoading(true);

    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setPwdError('Correo o contraseña incorrectos.');
      } else if (data.user) {
        await supabase.from('quiniela_jugadores').upsert({
          id: data.user.id,
          nombre: data.user.user_metadata?.full_name || email.split('@')[0],
          email: data.user.email!,
          rol: 'jugador',
          last_seen: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false });
        router.push('/');
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists')) {
          setPwdError('El correo ya está registrado. Intenta iniciar sesión.');
        } else {
          setPwdError('Error al crear la cuenta. Intenta de nuevo.');
        }
      } else if (data.user && !data.user.confirmed_at && !data.session) {
        // Email confirmation required
        setPwdSuccess('¡Cuenta creada! Revisa tu correo para confirmar tu cuenta.');
      } else if (data.user) {
        await supabase.from('quiniela_jugadores').upsert({
          id: data.user.id,
          nombre: email.split('@')[0],
          email: data.user.email!,
          rol: 'jugador',
          last_seen: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false });
        router.push('/');
      }
    }

    setPwdLoading(false);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setPwdError('');
    setPwdSuccess('');
    setPassword('');
    setConfirm('');
    setShowPwd(false);
    setShowConfirm(false);
  };

  // ── Reset Password ───────────────────────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail) { setResetError('Ingresa tu correo.'); return; }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://quinielamundial2026metro.vercel.app/reset-password',
    });
    if (error) {
      setResetError('No se pudo enviar el correo. Intenta de nuevo.');
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  };

  // ── Magic Link ───────────────────────────────────────────────────────────
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicError('');
    if (!magicEmail) { setMagicError('Ingresa tu correo.'); return; }
    setMagicLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    });
    if (error) {
      setMagicError('No se pudo enviar el link. Intenta de nuevo.');
    } else {
      setMagicSent(true);
    }
    setMagicLoading(false);
  };

  // ── Styles ───────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
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

      <motion.div
        className="relative z-10 w-full max-w-sm space-y-6"
        initial="hidden"
        animate="visible"
        variants={loginStagger}
      >
        {/* Header */}
        <motion.div className="text-center" variants={loginItem}>
          <img src="/icons/icon-192.png" alt="Quiniela Metro" className="w-20 h-20 rounded-2xl mx-auto mb-3 shadow-lg shadow-orange-500/30" />
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}>
            QUINIELA METRO
          </h1>
          <p className="mt-1 text-sm font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
            Mundial 2026 🏆
          </p>
        </motion.div>

        {/* Google */}
        <motion.button
          variants={loginItem}
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-semibold text-sm disabled:opacity-60"
          style={{ background: '#fff', color: '#111', fontFamily: 'var(--font-rajdhani)' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {googleLoading ? <Spinner /> : <GoogleIcon />}
          {googleLoading ? 'Redirigiendo…' : 'Continuar con Google'}
        </motion.button>

        {/* Divider */}
        <motion.div className="flex items-center gap-3" variants={loginItem}>
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>o</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
        </motion.div>

        {/* Email + Password card */}
        <motion.div className="rounded-2xl p-5 space-y-4" style={cardStyle} variants={loginItem}>
          {/* Tab toggle */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2 text-sm font-bold transition-all"
                style={{
                  fontFamily: 'var(--font-rajdhani)',
                  background: mode === m ? 'var(--accent-gold)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={handlePassword} className="space-y-3">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={INPUT_CLASS}
              style={inputStyle}
              autoComplete="email"
              required
            />
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={INPUT_CLASS}
                style={{ ...inputStyle, paddingRight: '2.75rem' }}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
            {mode === 'register' && (
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
            )}

            {/* Error / success */}
            {pwdError && (
              <p className="text-xs font-semibold px-1" style={{ color: 'var(--accent-red)' }}>{pwdError}</p>
            )}
            {pwdSuccess && (
              <p className="text-xs font-semibold px-1" style={{ color: 'var(--accent-green)' }}>{pwdSuccess}</p>
            )}

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}
            >
              {pwdLoading ? <Spinner /> : null}
              {pwdLoading ? 'Un momento…' : mode === 'login' ? 'Entrar con contraseña' : 'Crear cuenta'}
            </button>

            {mode === 'login' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowReset(v => !v); setResetSent(false); setResetError(''); setResetEmail(''); }}
                  className="text-xs font-semibold transition-colors hover:underline"
                  style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
          </form>

          {mode === 'login' && showReset && (
            <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
              {resetSent ? (
                <p className="text-xs font-semibold text-center" style={{ color: 'var(--accent-green)' }}>
                  ✅ Te enviamos un correo para restablecer tu contraseña.
                </p>
              ) : (
                <form onSubmit={handleReset} className="space-y-3">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                    Ingresa tu correo y te enviaremos un link para restablecer tu contraseña.
                  </p>
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className={INPUT_CLASS}
                    style={inputStyle}
                    required
                  />
                  {resetError && (
                    <p className="text-xs font-semibold px-1" style={{ color: 'var(--accent-red)' }}>{resetError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: '#475569', fontFamily: 'var(--font-rajdhani)' }}
                  >
                    {resetLoading ? <Spinner /> : '🔑'}
                    {resetLoading ? 'Enviando…' : 'Enviar correo de recuperación'}
                  </button>
                </form>
              )}
            </div>
          )}
        </motion.div>

        {/* Magic Link — colapsable */}
        <motion.div className="rounded-2xl overflow-hidden" style={cardStyle} variants={loginItem}>
          <button
            onClick={() => setShowMagic(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}
          >
            <span>📧 O entra con link por correo</span>
            <span style={{ fontSize: '0.65rem' }}>{showMagic ? '▲' : '▼'}</span>
          </button>

          {showMagic && (
            <div className="px-5 pb-5">
              {magicSent ? (
                <p className="text-sm font-semibold text-center py-2" style={{ color: 'var(--accent-green)' }}>
                  ✅ ¡Link enviado! Revisa tu correo.
                </p>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    value={magicEmail}
                    onChange={e => setMagicEmail(e.target.value)}
                    className={INPUT_CLASS}
                    style={inputStyle}
                    required
                  />
                  {magicError && (
                    <p className="text-xs font-semibold px-1" style={{ color: 'var(--accent-red)' }}>{magicError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={magicLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: '#1e40af', fontFamily: 'var(--font-rajdhani)' }}
                  >
                    {magicLoading ? <Spinner /> : '✉️'}
                    {magicLoading ? 'Enviando…' : 'Enviar link de acceso'}
                  </button>
                </form>
              )}
            </div>
          )}
        </motion.div>

        <motion.p className="text-center text-xs" style={{ color: 'var(--text-muted)' }} variants={loginItem}>
          ¡Predice, compite y gana! 🏆
        </motion.p>
      </motion.div>
    </main>
  );
}
