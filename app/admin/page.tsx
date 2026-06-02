'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Partido, Jugador, Pago } from '@/types';
import { toast } from 'sonner';

interface PagoConNombre extends Pago {
  jugadorNombre?: string;
  adminNombre?: string;
}

export default function AdminPage() {
  const [partidos, setPartidos]     = useState<Partido[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [adminId, setAdminId]       = useState<string | null>(null);
  const [editando, setEditando]     = useState<Record<string, { local: string; visita: string }>>({});
  const [guardando, setGuardando]   = useState<string | null>(null);

  // Créditos
  const [jugadores, setJugadores]         = useState<Jugador[]>([]);
  const [cantidades, setCantidades]       = useState<Record<string, string>>({});
  const [agregando, setAgregando]         = useState<string | null>(null);
  const [pagos, setPagos]                 = useState<PagoConNombre[]>([]);
  const [loadingCreditos, setLoadingCreditos] = useState(false);

  const cargarJugadoresYPagos = async () => {
    setLoadingCreditos(true);
    const [{ data: js }, { data: ps }] = await Promise.all([
      supabase.from('quiniela_jugadores').select('*').order('nombre'),
      supabase.from('quiniela_pagos').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    const jugadoresList = (js as Jugador[]) ?? [];
    setJugadores(jugadoresList);

    const nombresMap: Record<string, string> = {};
    jugadoresList.forEach(j => { nombresMap[j.id] = j.nombre; });

    const pagosEnriquecidos: PagoConNombre[] = ((ps as Pago[]) ?? []).map(p => ({
      ...p,
      jugadorNombre: nombresMap[p.user_id] ?? p.user_id.slice(0, 8),
      adminNombre:   p.activado_por ? (nombresMap[p.activado_por] ?? p.activado_por.slice(0, 8)) : '—',
    }));
    setPagos(pagosEnriquecidos);
    setLoadingCreditos(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setAdminId(data.user.id);
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('rol')
        .eq('id', data.user.id)
        .single();
      if (jugador?.rol === 'admin') {
        setIsAdmin(true);
        const { data: ps } = await supabase
          .from('quiniela_partidos')
          .select('*')
          .order('fecha_hora');
        setPartidos((ps as Partido[]) ?? []);
        cargarJugadoresYPagos();
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuardar = async (partido: Partido) => {
    const vals = editando[partido.id];
    if (!vals) return;
    setGuardando(partido.id);
    const { error } = await supabase
      .from('quiniela_partidos')
      .update({
        goles_local:     parseInt(vals.local),
        goles_visitante: parseInt(vals.visita),
        estado:          'finalizado',
      })
      .eq('id', partido.id);
    setGuardando(null);
    if (error) {
      toast.error('Error al guardar resultado');
    } else {
      toast.success('Resultado guardado y puntos calculados');
      setEditando(prev => { const n = { ...prev }; delete n[partido.id]; return n; });
      setPartidos(prev => prev.map(p =>
        p.id === partido.id
          ? { ...p, goles_local: parseInt(vals.local), goles_visitante: parseInt(vals.visita), estado: 'finalizado' }
          : p
      ));
    }
  };

  const handleAgregarCreditos = async (jugador: Jugador) => {
    const cantStr = cantidades[jugador.id];
    const cant = parseInt(cantStr);
    if (!cant || cant < 1 || cant > 10 || !adminId) return;

    setAgregando(jugador.id);

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('quiniela_jugadores')
        .update({ creditos: (jugador.creditos ?? 0) + cant })
        .eq('id', jugador.id),
      supabase.from('quiniela_pagos').insert({
        user_id:      jugador.id,
        creditos:     cant,
        monto:        cant * 50,
        concepto:     'Pago manual',
        activado_por: adminId,
      }),
    ]);

    setAgregando(null);
    if (e1 || e2) {
      toast.error('Error al agregar créditos');
    } else {
      toast.success(`+${cant} crédito${cant !== 1 ? 's' : ''} agregado${cant !== 1 ? 's' : ''} a ${jugador.nombre.split(' ')[0]}`);
      setCantidades(prev => ({ ...prev, [jugador.id]: '' }));
      cargarJugadoresYPagos();
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!isAdmin) return (
    <main className="max-w-lg mx-auto px-4 pt-20 text-center space-y-2">
      <p className="text-4xl">🔒</p>
      <p style={{ color: 'var(--text-secondary)' }}>Solo administradores pueden acceder aquí.</p>
    </main>
  );

  return (
    <main className="max-w-lg mx-auto px-4 pb-24 space-y-8"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>

      {/* ── RESULTADOS ── */}
      <section className="space-y-4">
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', color: 'var(--accent-gold)', letterSpacing: '0.05em' }}>
          🛠️ RESULTADOS
        </h1>
        <div className="space-y-3">
          {partidos.map(partido => {
            const vals = editando[partido.id];
            return (
              <div key={partido.id}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Grupo {partido.grupo} · J{partido.jornada}</span>
                  <span
                    className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px]"
                    style={{
                      background: partido.estado === 'finalizado' ? 'rgba(100,116,139,0.15)' : 'rgba(245,158,11,0.15)',
                      color:      partido.estado === 'finalizado' ? '#64748b' : 'var(--accent-gold)',
                    }}>
                    {partido.estado}
                  </span>
                </div>
                <p className="text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>
                  {partido.bandera_local} {partido.equipo_local} vs {partido.equipo_visitante} {partido.bandera_visitante}
                </p>
                {partido.estado !== 'finalizado' && (
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" placeholder="0"
                      value={vals?.local ?? ''}
                      onChange={e => setEditando(prev => ({ ...prev, [partido.id]: { local: e.target.value, visita: prev[partido.id]?.visita ?? '' } }))}
                      className="flex-1 rounded-xl px-3 py-2 text-center text-lg font-bold"
                      style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    <span style={{ color: 'var(--border)', fontWeight: 'bold' }}>–</span>
                    <input type="number" min="0" placeholder="0"
                      value={vals?.visita ?? ''}
                      onChange={e => setEditando(prev => ({ ...prev, [partido.id]: { local: prev[partido.id]?.local ?? '', visita: e.target.value } }))}
                      className="flex-1 rounded-xl px-3 py-2 text-center text-lg font-bold"
                      style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    <button onClick={() => handleGuardar(partido)}
                      disabled={!vals?.local || !vals?.visita || guardando === partido.id}
                      className="px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
                      style={{ background: '#10b981', color: '#000' }}>
                      {guardando === partido.id ? '…' : '✓'}
                    </button>
                  </div>
                )}
                {partido.estado === 'finalizado' && (
                  <p className="text-center font-bold text-lg" style={{ fontFamily: 'var(--font-bebas)', color: 'var(--accent-gold)' }}>
                    {partido.goles_local} – {partido.goles_visitante}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CRÉDITOS ── */}
      <section className="space-y-4">
        <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', color: 'var(--accent-gold)', letterSpacing: '0.05em' }}>
          💳 GESTIÓN DE CRÉDITOS
        </h2>

        {loadingCreditos ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="space-y-2">
            {jugadores.map(jugador => (
              <div key={jugador.id}
                className="rounded-2xl px-4 py-3 space-y-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {jugador.nombre}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{jugador.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
                    style={{
                      background: (jugador.creditos ?? 0) > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)',
                      border: `1px solid ${(jugador.creditos ?? 0) > 0 ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                    }}>
                    <span className="text-xs">💳</span>
                    <span className="text-sm font-bold"
                      style={{ color: (jugador.creditos ?? 0) > 0 ? 'var(--accent-gold)' : 'var(--text-secondary)', fontFamily: 'var(--font-bebas)' }}>
                      {jugador.creditos ?? 0}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number" min="1" max="10" placeholder="1–10"
                    value={cantidades[jugador.id] ?? ''}
                    onChange={e => setCantidades(prev => ({ ...prev, [jugador.id]: e.target.value }))}
                    className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-center"
                    style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={() => handleAgregarCreditos(jugador)}
                    disabled={!cantidades[jugador.id] || agregando === jugador.id}
                    className="flex-2 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap"
                    style={{ background: 'var(--accent-gold)', color: '#000', fontFamily: 'var(--font-rajdhani)' }}>
                    {agregando === jugador.id ? '…' : '➕ Agregar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Historial de pagos */}
        {pagos.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold pt-2" style={{ color: 'var(--text-secondary)' }}>
              Historial de pagos activados
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {pagos.map((pago, i) => (
                <div key={pago.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs"
                  style={{
                    background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-card-hover)',
                    borderBottom: i < pagos.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {pago.jugadorNombre}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {new Date(pago.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-center shrink-0">
                    <p className="font-bold" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-bebas)', fontSize: '1.1rem' }}>
                      +{pago.creditos}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>${pago.monto}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p style={{ color: 'var(--text-secondary)' }}>por {pago.adminNombre}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
