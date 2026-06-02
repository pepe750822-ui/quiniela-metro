'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Jugador, Pago, Pozo, Participacion } from '@/types';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';

interface PagoConNombre extends Pago {
  jugadorNombre?: string;
  adminNombre?: string;
}

interface ParticipacionConNombre extends Participacion {
  jugadorNombre: string;
  jugadorEmail: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [partidos, setPartidos]   = useState<Partido[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [adminId, setAdminId]     = useState<string | null>(null);
  const [editando, setEditando]   = useState<Record<string, { local: string; visita: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  // Créditos
  const [jugadores, setJugadores]       = useState<Jugador[]>([]);
  const [cantidades, setCantidades]     = useState<Record<string, string>>({});
  const [agregando, setAgregando]       = useState<string | null>(null);
  const [pagos, setPagos]               = useState<PagoConNombre[]>([]);
  const [loadingCreditos, setLoadingCreditos] = useState(false);

  // Pozos
  const [pozos, setPozos]                   = useState<Pozo[]>([]);
  const [participaciones, setParticipaciones] = useState<ParticipacionConNombre[]>([]);
  const [confirmando, setConfirmando]       = useState<string | null>(null);
  const [declarando, setDeclarando]         = useState<number | null>(null);

  // ── Loaders ──────────────────────────────────────────

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

  const cargarPozos = async (jugadoresList?: Jugador[]) => {
    const jList = jugadoresList ?? jugadores;
    const [{ data: pz }, { data: pt }] = await Promise.all([
      supabase.from('quiniela_pozo').select('*').order('jornada'),
      supabase.from('quiniela_participaciones').select('*').order('created_at'),
    ]);
    setPozos((pz as Pozo[]) ?? []);

    const nombresMap: Record<string, { nombre: string; email: string }> = {};
    jList.forEach(j => { nombresMap[j.id] = { nombre: j.nombre, email: j.email }; });

    const enriquecidas: ParticipacionConNombre[] = ((pt as Participacion[]) ?? []).map(p => ({
      ...p,
      jugadorNombre: nombresMap[p.user_id]?.nombre ?? p.user_id.slice(0, 8),
      jugadorEmail:  nombresMap[p.user_id]?.email  ?? '',
    }));
    setParticipaciones(enriquecidas);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setAdminId(data.user.id);
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('rol')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (!jugador || jugador.rol !== 'admin') {
        router.push('/');
        return;
      }

      if (jugador.rol === 'admin') {
        setIsAdmin(true);
        const [{ data: ps }, { data: js }] = await Promise.all([
          supabase.from('quiniela_partidos').select('*').order('fecha_hora'),
          supabase.from('quiniela_jugadores').select('*').order('nombre'),
        ]);
        setPartidos((ps as Partido[]) ?? []);
        const jugadoresList = (js as Jugador[]) ?? [];
        setJugadores(jugadoresList);

        const nombresMap: Record<string, string> = {};
        jugadoresList.forEach(j => { nombresMap[j.id] = j.nombre; });

        const { data: pagosData } = await supabase
          .from('quiniela_pagos').select('*').order('created_at', { ascending: false }).limit(50);
        const pagosEnriquecidos: PagoConNombre[] = ((pagosData as Pago[]) ?? []).map(p => ({
          ...p,
          jugadorNombre: nombresMap[p.user_id] ?? p.user_id.slice(0, 8),
          adminNombre:   p.activado_por ? (nombresMap[p.activado_por] ?? p.activado_por.slice(0, 8)) : '—',
        }));
        setPagos(pagosEnriquecidos);

        await cargarPozos(jugadoresList);
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers resultados ───────────────────────────────

  const handleGuardar = async (partido: Partido) => {
    const vals = editando[partido.id];
    if (!vals) return;
    setGuardando(partido.id);
    const { error } = await supabase
      .from('quiniela_partidos')
      .update({ goles_local: parseInt(vals.local), goles_visitante: parseInt(vals.visita), estado: 'finalizado' })
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

  // ── Handlers créditos ────────────────────────────────

  const handleAgregarCreditos = async (jugador: Jugador) => {
    const cant = parseInt(cantidades[jugador.id] ?? '');
    if (!cant || cant < 1 || cant > 10 || !adminId) return;
    setAgregando(jugador.id);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('quiniela_jugadores').update({ creditos: (jugador.creditos ?? 0) + cant }).eq('id', jugador.id),
      supabase.from('quiniela_pagos').insert({ user_id: jugador.id, creditos: cant, monto: cant * 50, concepto: 'Pago manual', activado_por: adminId }),
    ]);
    setAgregando(null);
    if (e1 || e2) {
      toast.error('Error al agregar créditos');
    } else {
      toast.success(`+${cant} crédito${cant !== 1 ? 's' : ''} a ${jugador.nombre.split(' ')[0]}`);
      setCantidades(prev => ({ ...prev, [jugador.id]: '' }));
      cargarJugadoresYPagos();
    }
  };

  // ── Handlers pozos ───────────────────────────────────

  const handleConfirmarPago = async (p: ParticipacionConNombre) => {
    setConfirmando(p.id);

    // Marcar como pagado
    const { error: e1 } = await supabase
      .from('quiniela_participaciones')
      .update({ pagado: true })
      .eq('id', p.id);

    if (e1) { toast.error('Error al confirmar pago'); setConfirmando(null); return; }

    // Incrementar pozo
    const pozo = pozos.find(pz => pz.jornada === p.jornada);
    const { error: e2 } = await supabase
      .from('quiniela_pozo')
      .update({
        total_mxn:     (pozo?.total_mxn ?? 0) + 50,
        participantes: (pozo?.participantes ?? 0) + 1,
      })
      .eq('jornada', p.jornada);

    setConfirmando(null);
    if (e2) {
      toast.error('Participación confirmada pero error al actualizar pozo');
    } else {
      toast.success(`✅ Pago de ${p.jugadorNombre.split(' ')[0]} confirmado (+$50 al pozo J${p.jornada})`);
      cargarPozos();
    }
  };

  const handleDeclararGanador = async (jornada: number) => {
    setDeclarando(jornada);

    const { data, error } = await supabase
      .from('quiniela_ranking')
      .select('*, jugador:quiniela_jugadores(nombre)')
      .eq('jornada', jornada)
      .order('puntos_total', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      toast.error('No hay datos de ranking para esta jornada');
      setDeclarando(null);
      return;
    }

    const ganadorNombre = (data as { jugador?: { nombre: string } }).jugador?.nombre ?? 'Desconocido';

    const { error: e2 } = await supabase
      .from('quiniela_pozo')
      .update({ ganador_id: data.user_id, ganador_nombre: ganadorNombre, estado: 'cerrado' })
      .eq('jornada', jornada);

    setDeclarando(null);
    if (e2) {
      toast.error('Error al declarar ganador');
    } else {
      toast.success(`🏆 Ganador Jornada ${jornada}: ${ganadorNombre}`);
      cargarPozos();
    }
  };

  // ── Guards ───────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────

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
              <div key={partido.id} className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Grupo {partido.grupo} · J{partido.jornada}</span>
                  <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px]"
                    style={{
                      background: partido.estado === 'finalizado' ? 'rgba(100,116,139,0.15)' : 'rgba(234,88,12,0.15)',
                      color:      partido.estado === 'finalizado' ? '#64748b' : 'var(--accent-gold)',
                    }}>
                    {partido.estado}
                  </span>
                </div>
                <p className="text-sm font-bold text-center flex items-center justify-center gap-1.5 flex-wrap" style={{ color: 'var(--text-primary)' }}>
                  <Bandera emoji={partido.bandera_local} nombre={partido.equipo_local} size="sm" />
                  {partido.equipo_local} vs {partido.equipo_visitante}
                  <Bandera emoji={partido.bandera_visitante} nombre={partido.equipo_visitante} size="sm" />
                </p>
                {partido.estado !== 'finalizado' && (
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" placeholder="0" value={vals?.local ?? ''}
                      onChange={e => setEditando(prev => ({ ...prev, [partido.id]: { local: e.target.value, visita: prev[partido.id]?.visita ?? '' } }))}
                      className="flex-1 rounded-xl px-3 py-2 text-center text-lg font-bold"
                      style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    <span style={{ color: 'var(--border)', fontWeight: 'bold' }}>–</span>
                    <input type="number" min="0" placeholder="0" value={vals?.visita ?? ''}
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

      {/* ── POZOS ── */}
      <section className="space-y-4">
        <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', color: 'var(--accent-gold)', letterSpacing: '0.05em' }}>
          🏆 POZOS POR JORNADA
        </h2>

        {/* Cards de pozos */}
        <div className="space-y-3">
          {pozos.map(pozo => {
            const pendientes = participaciones.filter(p => p.jornada === pozo.jornada && !p.pagado);
            const confirmadas = participaciones.filter(p => p.jornada === pozo.jornada && p.pagado);
            return (
              <div key={pozo.id} className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {/* Header del pozo */}
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)' }}>
                      Jornada {pozo.jornada}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      👥 {pozo.participantes} · ${pozo.total_mxn} MXN
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                      style={{
                        background: pozo.estado === 'abierto'
                          ? 'rgba(234,88,12,0.15)' : pozo.estado === 'cerrado'
                          ? 'rgba(100,116,139,0.15)' : 'rgba(16,185,129,0.15)',
                        color: pozo.estado === 'abierto'
                          ? 'var(--accent-gold)' : pozo.estado === 'cerrado'
                          ? '#64748b' : '#10b981',
                      }}>
                      {pozo.estado}
                    </span>
                    {pozo.estado === 'abierto' && (
                      <button
                        onClick={() => handleDeclararGanador(pozo.jornada)}
                        disabled={declarando === pozo.jornada}
                        className="text-xs px-2 py-1 rounded-lg font-bold disabled:opacity-50 transition-all active:scale-95"
                        style={{ background: 'rgba(234,88,12,0.2)', color: 'var(--accent-gold)', border: '1px solid rgba(234,88,12,0.3)' }}>
                        {declarando === pozo.jornada ? '…' : '🏆 Declarar ganador'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Ganador si existe */}
                {pozo.ganador_nombre && (
                  <div className="px-4 py-2 text-sm" style={{ background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                    <span className="font-bold" style={{ color: '#10b981' }}>🥇 Ganador: {pozo.ganador_nombre}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>· ${pozo.total_mxn} MXN</span>
                  </div>
                )}

                {/* Pagos pendientes */}
                {pendientes.length > 0 && (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#ea580c' }}>
                      ⏳ Pendientes de pago ({pendientes.length})
                    </p>
                    {pendientes.map(p => (
                      <div key={p.id}
                        className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                        style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.3)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {p.jugadorNombre}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: 'rgba(234,88,12,0.2)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.4)' }}>
                              ⏳ Pendiente de pago
                            </span>
                          </div>
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{p.jugadorEmail}</p>
                        </div>
                        <button
                          onClick={() => handleConfirmarPago(p)}
                          disabled={confirmando === p.id}
                          className="text-xs px-3 py-2 rounded-xl font-bold disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                          style={{ background: '#10b981', color: '#000' }}>
                          {confirmando === p.id ? '…' : '✅ Confirmar pago'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirmados */}
                {confirmadas.length > 0 && (
                  <div className="px-4 py-3 space-y-1" style={{ borderTop: pendientes.length > 0 ? '1px solid var(--border)' : 'none' }}>
                    <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#10b981' }}>
                      ✅ Confirmados ({confirmadas.length})
                    </p>
                    {confirmadas.map(p => (
                      <p key={p.id} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {p.jugadorNombre}
                      </p>
                    ))}
                  </div>
                )}

                {pendientes.length === 0 && confirmadas.length === 0 && (
                  <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Sin participaciones registradas.
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
              <div key={jugador.id} className="rounded-2xl px-4 py-3 space-y-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{jugador.nombre}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{jugador.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
                    style={{
                      background: (jugador.creditos ?? 0) > 0 ? 'rgba(234,88,12,0.12)' : 'rgba(100,116,139,0.12)',
                      border: `1px solid ${(jugador.creditos ?? 0) > 0 ? 'rgba(234,88,12,0.3)' : 'var(--border)'}`,
                    }}>
                    <span className="text-xs">💳</span>
                    <span className="text-sm font-bold"
                      style={{ color: (jugador.creditos ?? 0) > 0 ? 'var(--accent-gold)' : 'var(--text-secondary)', fontFamily: 'var(--font-bebas)' }}>
                      {jugador.creditos ?? 0}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="number" min="1" max="10" placeholder="1–10"
                    value={cantidades[jugador.id] ?? ''}
                    onChange={e => setCantidades(prev => ({ ...prev, [jugador.id]: e.target.value }))}
                    className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-center"
                    style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  <button onClick={() => handleAgregarCreditos(jugador)}
                    disabled={!cantidades[jugador.id] || agregando === jugador.id}
                    className="px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap"
                    style={{ background: 'var(--accent-gold)', color: '#000', fontFamily: 'var(--font-rajdhani)' }}>
                    {agregando === jugador.id ? '…' : '➕ Agregar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagos.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold pt-2" style={{ color: 'var(--text-secondary)' }}>
              Historial de pagos activados
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {pagos.map((pago, i) => (
                <div key={pago.id} className="flex items-center gap-3 px-4 py-2.5 text-xs"
                  style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-card-hover)', borderBottom: i < pagos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{pago.jugadorNombre}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {new Date(pago.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-center shrink-0">
                    <p className="font-bold" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-bebas)', fontSize: '1.1rem' }}>+{pago.creditos}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>${pago.monto}</p>
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
