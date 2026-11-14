'use client';
import Link from 'next/link';
import TrenMetro from '@/components/ui/TrenMetro';

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
  'w-full px-4 min-h-[48px] rounded-[12px] text-[16px] font-medium outline-none transition-all border focus:ring-2 focus:ring-orange-500/40';

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
      className="min-h-screen flex flex-col items-center px-4 pb-10 relative overflow-hidden"
      style={{ background: 'var(--bg)', paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 16px))' }}
    >
      {/* Patrón hexagonal */}
      <motion.div
        className="relative z-10 w-full max-w-md space-y-5"
        initial="hidden"
        animate="visible"
        variants={loginStagger}
      >
        {/* Header */}
        <motion.div variants={loginItem}>
          <Link href="/" aria-label="Volver" className="inline-flex items-center justify-center w-11 h-11 -ml-2 mb-2" style={{ color: 'var(--ink)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 mb-3" style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
            <span className="rounded-full" style={{ width: 10, height: 10, border: '3px solid var(--br)', background: 'var(--bg)' }} />
            <span className="senal" style={{ fontSize: 11 }}>Andén de acceso</span>
          </span>
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display" style={{ fontSize: 40, lineHeight: 0.95, color: 'var(--ink)' }}>
              Entra a la quiniela
            </h1>
            <TrenMetro size={64} className="shrink-0" />
          </div>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--ink2)' }}>
            Usa tu cuenta de Google y listo. Es lo más rápido.
          </p>
        </motion.div>

        {/* Google */}
        <motion.button
          variants={loginItem}
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-6 rounded-[12px] font-bold text-[16px] disabled:opacity-60"
          style={{ minHeight: 56, background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-sans)' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {googleLoading ? <Spinner /> : <GoogleIcon />}
          {googleLoading ? 'Redirigiendo…' : 'Continuar con Google'}
        </motion.button>

        {/* Divider */}
        <motion.div className="flex items-center gap-3" variants={loginItem}>
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>o con tu correo</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
        </motion.div>

        {/* Email + Password card */}
        <motion.div className="rounded-[16px] p-4 space-y-4" style={cardStyle} variants={loginItem}>
          {/* Tab toggle */}
          <div className="flex rounded-[12px] p-1 gap-1" style={{ background: 'var(--sf2)' }}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 min-h-[40px] rounded-[9px] text-[14px] font-bold transition-all"
                style={{
                  fontFamily: 'var(--font-sans)',
                  background: mode === m ? 'var(--sf)' : 'transparent',
                  color: mode === m ? 'var(--ink)' : 'var(--mut)',
                  boxShadow: mode === m ? '0 1px 2px rgba(0,0,0,.12)' : 'none',
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
              <p role="alert" className="text-[14px] font-semibold rounded-[12px] px-3 py-2.5" style={{ color: 'var(--fl)', background: 'var(--flS)' }}>{pwdError}</p>
            )}
            {pwdSuccess && (
              <p className="text-xs font-semibold px-1" style={{ color: 'var(--accent-green)' }}>{pwdSuccess}</p>
            )}

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-[12px] font-bold text-[17px] transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'var(--br)', color: 'var(--brI)', fontFamily: 'var(--font-sans)' }}
            >
              {pwdLoading ? <Spinner /> : null}
              {pwdLoading ? 'Un momento…' : mode === 'login' ? 'Entrar con contraseña' : 'Crear cuenta'}
            </button>

            {mode === 'login' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowReset(v => !v); setResetSent(false); setResetError(''); setResetEmail(''); }}
                  className="text-[14px] font-semibold underline underline-offset-2 min-h-[44px]"
                  style={{ fontFamily: 'var(--font-sans)', color: 'var(--br)', background: 'none', border: 'none', cursor: 'pointer' }}
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
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
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
                    className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-[12px] font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'transparent', border: '1.5px solid var(--ink)', color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}
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
        <motion.div className="rounded-[16px] overflow-hidden" style={cardStyle} variants={loginItem}>
          <button
            onClick={() => setShowMagic(v => !v)}
            className="w-full flex items-center justify-between px-4 min-h-[52px] text-[15px] font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}
          >
            <span>Enviar link de acceso por correo</span>
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
                    className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-[12px] font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'var(--sf2)', color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}
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
