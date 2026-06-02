'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/predicciones` },
    });

    setLoading(false);
    if (!error) {
      if (nombre.trim()) {
        localStorage.setItem('qm_nombre_pending', nombre.trim());
      }
      setEnviado(true);
    }
  };

  if (enviado) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-4">
        <p className="text-5xl">📧</p>
        <h2 className="text-xl font-bold">Revisa tu correo</h2>
        <p className="text-zinc-400 text-sm">
          Te enviamos un link mágico a <span className="text-white font-semibold">{email}</span>.<br />
          Haz clic en el link para entrar.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1 mb-6">
          <p className="text-4xl">⚽</p>
          <h1 className="text-2xl font-black">Entrar a la Quiniela</h1>
          <p className="text-zinc-400 text-sm">Mundial 2026 · Metro CDMX</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Tu nombre (ej. Juan de Línea 3)"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <input
            type="email"
            placeholder="Tu correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-base transition-colors disabled:opacity-60">
          {loading ? 'Enviando…' : 'Entrar →'}
        </button>

        <p className="text-xs text-zinc-500 text-center">
          Te enviamos un link al correo. Sin contraseña.
        </p>
      </form>
    </main>
  );
}
