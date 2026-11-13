'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';
import { getMontoJornada } from '@/lib/utils';
import Encabezado from '@/components/ui/Encabezado';
import ThemeToggle from '@/components/ThemeToggle';

export default function PerfilPage() {
  const router = useRouter();
  const [userId, setUserId]           = useState<string | null>(null);
  const [apodoActual, setApodoActual] = useState('');
  const [apodoTemp, setApodoTemp]     = useState('');
  const [editando, setEditando]       = useState(false);
  const [guardando, setGuardando]     = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [participaciones, setParticipaciones] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [email, setEmail]   = useState('');
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('apodo, nombre, rol')
        .eq('id', data.user.id)
        .single();
      setEmail(data.user.email ?? '');
      setNombre(jugador?.nombre || data.user.email?.split('@')[0] || '');
      setEsAdmin(jugador?.rol === 'admin');
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

  const iniciales = (apodoActual || nombre || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

  return (
    <main
      className="max-w-lg mx-auto px-4 pb-24 space-y-4"
      style={{ paddingTop: 'max(20px, calc(env(safe-area-inset-top) + 12px))' }}
    >
      <Encabezado titulo="Perfil" />

      {/* Identidad + apodo */}
      <section className="rounded-[16px] p-4" style={{ background: 'var(--sf)', border: '1px solid var(--ln)' }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center rounded-full font-display shrink-0"
            style={{ width: 52, height: 52, background: 'var(--br)', color: 'var(--brI)', fontSize: 22 }}>
            {iniciales}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-[17px] truncate" style={{ color: 'var(--ink)' }}>{nombre || 'Jugador'}</p>
            <p className="text-[13px] truncate" style={{ color: 'var(--mut)' }}>{email}</p>
            {esAdmin && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wider"
                style={{ background: 'var(--ink)', color: 'var(--bg)' }}>ADMIN</span>
            )}
          </div>
        </div>

        <label htmlFor="apodo" className="block text-[14px] font-medium mb-2" style={{ color: 'var(--ink2)' }}>
          Tu apodo (así sales en el ranking)
        </label>
        {!editando && apodoActual ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-[12px] px-4 flex items-center font-semibold"
              style={{ minHeight: 48, background: 'var(--sf2)', color: 'var(--ink)' }}>
              {apodoActual}
            </div>
            <button
              onClick={() => { setEditando(true); setApodoTemp(apodoActual); }}
              className="px-4 rounded-[12px] text-[14px] font-semibold"
              style={{ minHeight: 48, border: '1px solid var(--ln)', color: 'var(--ink)' }}
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
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
              className="w-full rounded-[12px] px-4 text-[16px] outline-none focus:ring-2"
              style={{ minHeight: 48, background: 'var(--sf2)', border: '1px solid var(--ln)', color: 'var(--ink)', ['--tw-ring-color' as string]: 'var(--br)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={guardarApodo}
                disabled={guardando}
                className="flex-1 rounded-[12px] text-[16px] font-bold transition-transform active:scale-[0.98] disabled:opacity-50"
                style={{ minHeight: 48, background: 'var(--ink)', color: 'var(--bg)' }}
              >
                {guardando ? 'Guardando…' : 'Guardar apodo'}
              </button>
              {apodoActual && (
                <button
                  onClick={() => setEditando(false)}
                  className="px-4 rounded-[12px] text-[14px] font-semibold"
                  style={{ minHeight: 48, border: '1px solid var(--ln)', color: 'var(--mut)' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
        <p className="text-[13px] mt-2" style={{ color: 'var(--mut)' }}>
          Máximo 20 caracteres. Aparece en ranking y jornadas.
        </p>
      </section>

      {/* Panel de administrador (solo admin) */}
      {esAdmin && (
        <Link href="/admin" className="flex items-center gap-3 rounded-[16px] p-4"
          style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
          <span className="flex items-center justify-center rounded-[10px] shrink-0" style={{ width: 40, height: 40, background: 'var(--br)', color: 'var(--brI)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6Z" /><path d="M9 12l2 2 4-4" /></svg>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-[17px]">Panel de administrador</span>
            <span className="block text-[13px] opacity-75">Resultados, pagos y pozos</span>
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
        </Link>
      )}

      {/* Historial de pagos */}
      <section className="rounded-[16px] p-4" style={{ background: 'var(--sf)', border: '1px solid var(--ln)' }}>
        <h2 className="font-display text-[20px] mb-3" style={{ color: 'var(--ink)' }}>Historial de pagos</h2>

        {participaciones.length === 0 ? (
          <p className="text-[14px]" style={{ color: 'var(--mut)' }}>
            No tienes participaciones registradas aún.
          </p>
        ) : (
          <ul>
            {participaciones.filter(part => part.jornada <= 6).map((part, i) => (
              <li key={part.id} className="flex items-center gap-3 py-3"
                style={{ borderTop: i ? '1px solid var(--ln)' : 'none' }}>
                <span className="flex items-center justify-center rounded-[8px] font-display shrink-0"
                  style={{ width: 40, height: 32, background: 'var(--sf2)', color: 'var(--ink)', fontSize: 16 }}>
                  J{part.jornada}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px]" style={{ color: 'var(--ink)' }}>
                    ${getMontoJornada(part.jornada)}
                    {part.quiniela?.nombre && (
                      <span className="ml-2 text-[13px] font-semibold" style={{ color: 'var(--br)' }}>{part.quiniela.nombre}</span>
                    )}
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--mut)' }}>
                    {part.pagado_at
                      ? 'Pagado el ' + new Date(part.pagado_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                      : part.publicado ? 'Quiniela publicada' : 'Sin fecha de pago'}
                  </p>
                </div>
                {part.pagado ? (
                  <span className="text-[13px] font-semibold px-2.5 py-1 rounded-[8px]" style={{ color: 'var(--ex)', background: 'color-mix(in srgb, var(--ex) 14%, transparent)' }}>
                    Pagado
                  </span>
                ) : (
                  <span className="text-[13px] font-semibold px-2.5 py-1 rounded-[8px]" style={{ color: '#3a2a00', background: 'var(--rs)' }}>
                    Pendiente
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ajustes */}
      <section className="rounded-[16px]" style={{ background: 'var(--sf)', border: '1px solid var(--ln)' }}>
        <Link href="/instrucciones" className="flex items-center justify-between px-4" style={{ minHeight: 56, color: 'var(--ink)' }}>
          <span className="font-semibold text-[15px]">Cómo jugar</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--mut)' }}><path d="m9 6 6 6-6 6" /></svg>
        </Link>
        <div className="flex items-center justify-between px-4" style={{ minHeight: 56, borderTop: '1px solid var(--ln)' }}>
          <span className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>Tema claro / oscuro</span>
          <ThemeToggle />
        </div>
      </section>

      {/* Cerrar sesión */}
      <div className="pt-2">
        <p className="text-[13px] text-center mb-3" style={{ color: 'var(--mut)' }}>
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
          className="w-full rounded-[12px] text-[15px] font-semibold"
          style={{ minHeight: 48, background: 'transparent', border: '1px solid var(--ln)', color: 'var(--fl)' }}
        >
          Cambiar de cuenta
        </button>
      </div>
    </main>
  );
}
