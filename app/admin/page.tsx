'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Jugador, Pozo, Participacion } from '@/types';
import { emailCorto, mostrarNombre } from '@/lib/utils';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';

interface ParticipacionConNombre extends Participacion {
  jugadorNombre: string;
  jugadorEmail: string;
  jugadorApodo: string | null;
}

const mostrarNombreParticipante = (p: ParticipacionConNombre) =>
  p.jugadorApodo || p.jugadorNombre.split(' ')[0] || 'Sin nombre';

export default function AdminPage() {
  const router = useRouter();
  const [partidos, setPartidos]   = useState<Partido[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [adminId, setAdminId]     = useState<string | null>(null);
  const [editando, setEditando]   = useState<Record<string, { local: string; visita: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  // Apodos
  const [jugadores, setJugadores] = useState<Jugador[]>([]);

  // Pozos
  const [pozos, setPozos]                   = useState<Pozo[]>([]);
  const [participaciones, setParticipaciones] = useState<ParticipacionConNombre[]>([]);
  const [confirmando, setConfirmando]       = useState<string | null>(null);
  const [declarando, setDeclarando]         = useState<number | null>(null);

  // ── Loaders ──────────────────────────────────────────

  const cargarPozos = async () => {
    // Query 1: pozos y participaciones (sin join para evitar fallos silenciosos de RLS)
    const [{ data: pz }, { data: pt, error: ptError }] = await Promise.all([
      supabase.from('quiniela_pozo').select('*').order('jornada'),
      supabase.from('quiniela_participaciones').select('id, user_id, jornada, pagado, monto, publicado, created_at').order('created_at'),
    ]);

    if (ptError) console.error('Error cargando participaciones:', ptError);
    setPozos((pz as Pozo[]) ?? []);

    const lista = (pt ?? []) as Participacion[];
    if (!lista.length) { setParticipaciones([]); return; }

    // Query 2: nombres por user_id (query separada, más robusta que join)
    const userIds = [...new Set(lista.map(p => p.user_id))];
    const { data: jugs, error: jugsError } = await supabase
      .from('quiniela_jugadores')
      .select('id, nombre, email, apodo')
      .in('id', userIds);

    if (jugsError) console.error('Error cargando jugadores para pozos:', jugsError);

    const jugMap: Record<string, { nombre: string; email: string; apodo: string | null }> = {};
    (jugs ?? []).forEach((j: { id: string; nombre: string; email: string; apodo: string | null }) => {
      jugMap[j.id] = { nombre: j.nombre, email: j.email, apodo: j.apodo };
    });

    const enriquecidas: ParticipacionConNombre[] = lista.map(p => ({
      ...p,
      jugadorNombre: jugMap[p.user_id]?.nombre ?? p.user_id.slice(0, 8),
      jugadorEmail:  jugMap[p.user_id]?.email  ?? '',
      jugadorApodo:  jugMap[p.user_id]?.apodo  ?? null,
    }));
    setParticipaciones(enriquecidas);
  };

  useEffect(() => {
    const verificar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      setAdminId(user.id);
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('rol')
        .eq('id', user.id)
        .maybeSingle();

      if (jugador?.rol !== 'admin') {
        router.push('/');
        return;
      }

      setIsAdmin(true);

      const [{ data: ps }, { data: js }] = await Promise.all([
        supabase.from('quiniela_partidos').select('*').order('fecha_hora'),
        supabase.from('quiniela_jugadores').select('*').order('created_at', { ascending: true }),
      ]);
      setPartidos((ps as Partido[]) ?? []);
      setJugadores((js as Jugador[]) ?? []);

      await cargarPozos();
      setLoading(false);
    };

    verificar();
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
      toast.success(`✅ Pago de ${mostrarNombreParticipante(p)} confirmado (+$50 al pozo J${p.jornada})`);
      cargarPozos();
    }
  };

  const handleEliminarParticipacion = async (p: ParticipacionConNombre) => {
    if (!confirm(`¿Eliminar participación de ${mostrarNombreParticipante(p)} en Jornada ${p.jornada}?`)) return;

    const { data: partidos } = await supabase
      .from('quiniela_partidos')
      .select('id')
      .eq('jornada', p.jornada);

    const partidoIds = partidos?.map(pt => pt.id) ?? [];
    if (partidoIds.length) {
      await supabase
        .from('quiniela_predicciones')
        .delete()
        .eq('user_id', p.user_id)
        .in('partido_id', partidoIds);
    }

    await supabase
      .from('quiniela_participaciones')
      .delete()
      .eq('id', p.id);

    if (p.pagado) {
      const pozo = pozos.find(pz => pz.jornada === p.jornada);
      if (pozo) {
        await supabase
          .from('quiniela_pozo')
          .update({
            total_mxn:     Math.max(0, (pozo.total_mxn ?? 0) - 50),
            participantes: Math.max(0, (pozo.participantes ?? 0) - 1),
          })
          .eq('jornada', p.jornada);
      }
    }

    toast.success(`🗑️ Participación de ${mostrarNombreParticipante(p)} eliminada`);
    cargarPozos();
  };

  const handleDeclararGanador = async (jornada: number) => {
    setDeclarando(jornada);

    const { data, error } = await supabase
      .from('quiniela_ranking')
      .select('*, jugador:quiniela_jugadores(nombre, apodo)')
      .eq('jornada', jornada)
      .order('puntos_total', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      toast.error('No hay datos de ranking para esta jornada');
      setDeclarando(null);
      return;
    }

    const jugGanador = (data as { jugador?: { nombre: string; apodo: string | null } }).jugador;
    const ganadorNombre = mostrarNombre({ nombre: jugGanador?.nombre ?? 'Desconocido', apodo: jugGanador?.apodo ?? null });

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
                              {mostrarNombreParticipante(p)}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: 'rgba(234,88,12,0.2)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.4)' }}>
                              ⏳ Pendiente de pago
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{p.jugadorEmail ? emailCorto(p.jugadorEmail) : ''}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleConfirmarPago(p)}
                            disabled={confirmando === p.id}
                            className="text-xs px-3 py-2 rounded-xl font-bold disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                            style={{ background: '#10b981', color: '#000' }}>
                            {confirmando === p.id ? '…' : '✅ Confirmar pago'}
                          </button>
                          <button
                            onClick={() => handleEliminarParticipacion(p)}
                            className="text-xs px-2 py-2 rounded-xl font-bold transition-all active:scale-95"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                            🗑️
                          </button>
                        </div>
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
                      <div key={p.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {mostrarNombreParticipante(p)}
                          </p>
                          {p.jugadorEmail && (
                            <p className="text-xs text-slate-500">{emailCorto(p.jugadorEmail)}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleEliminarParticipacion(p)}
                          className="text-xs px-2 py-1 rounded-lg transition-all active:scale-95"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                          🗑️
                        </button>
                      </div>
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

      {/* ── APODOS ── */}
      <section className="space-y-4">
        <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', color: 'var(--accent-gold)', letterSpacing: '0.05em' }}>
          👤 APODOS
        </h2>
        <div className="space-y-3">
          {jugadores.map(jugador => (
            <div key={jugador.id}
              className="flex items-center gap-4 rounded-xl px-4 py-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)' }}>
                  {mostrarNombre(jugador)}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{emailCorto(jugador.email)}</p>
              </div>
              <input
                type="text"
                placeholder="Apodo (ej: El Suavecito)"
                defaultValue={jugador.apodo ?? ''}
                onBlur={async (e) => {
                  const val = e.target.value.trim();
                  await supabase
                    .from('quiniela_jugadores')
                    .update({ apodo: val || null })
                    .eq('id', jugador.id);
                  toast.success(val ? `Apodo: ${val}` : 'Apodo eliminado');
                }}
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', maxWidth: '160px' }}
              />
            </div>
          ))}
        </div>
      </section>

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
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <input type="number" min="0" max="20" placeholder="0" value={vals?.local ?? ''}
                      onChange={e => setEditando(prev => ({ ...prev, [partido.id]: { local: e.target.value, visita: prev[partido.id]?.visita ?? '' } }))}
                      className="w-14 h-12 text-center text-xl font-bold rounded-xl outline-none"
                      style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-bebas)' }} />
                    <span className="text-xl font-bold" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-bebas)' }}>–</span>
                    <input type="number" min="0" max="20" placeholder="0" value={vals?.visita ?? ''}
                      onChange={e => setEditando(prev => ({ ...prev, [partido.id]: { local: prev[partido.id]?.local ?? '', visita: e.target.value } }))}
                      className="w-14 h-12 text-center text-xl font-bold rounded-xl outline-none"
                      style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-bebas)' }} />
                    <button onClick={() => handleGuardar(partido)}
                      disabled={!vals?.local || !vals?.visita || guardando === partido.id}
                      className="h-12 px-4 rounded-xl font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
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
    </main>
  );
}
