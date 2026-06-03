'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Prediccion, Pozo } from '@/types';
import PartidoCard from '@/components/PartidoCard';
import PrediccionForm from '@/components/PrediccionForm';
import { toast } from 'sonner';

export default function PrediccionesPage() {
  const router = useRouter();
  const [userId, setUserId]               = useState<string | null>(null);
  const [partidos, setPartidos]           = useState<Partido[]>([]);
  const [predicciones, setPredicciones]   = useState<Record<string, Prediccion>>({});
  const [partidoActivo, setPartidoActivo] = useState<Partido | null>(null);
  const [loading, setLoading]             = useState(true);
  const [jornada, setJornada]             = useState(1);
  const [jornadas, setJornadas]           = useState<number[]>([]);
  const [pozo, setPozo]                   = useState<Pozo | null>(null);
  const [participando, setParticipando]   = useState<boolean | null>(null);
  const [publicado, setPublicado]         = useState<boolean>(false);
  const [publicando, setPublicando]       = useState<boolean>(false);

  // Múltiples quinielas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quinielasExtra, setQuinielasExtra]             = useState<any[]>([]);
  const [quinielaSeleccionada, setQuinielaSeleccionada] = useState<string | null>(null);
  const [showNuevaQuiniela, setShowNuevaQuiniela]       = useState(false);
  const [nombreNuevaQuiniela, setNombreNuevaQuiniela]   = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
    });

    supabase
      .from('quiniela_partidos')
      .select('jornada')
      .lte('jornada', 3)
      .order('jornada')
      .then(({ data }) => {
        const unicas = [...new Set((data ?? []).map((p: { jornada: number }) => p.jornada))];
        setJornadas(unicas);
      });
  }, [router]);

  const cargarQuinielas = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('quiniela_extra')
      .select('*')
      .eq('user_id', uid)
      .eq('activa', true)
      .order('created_at');
    setQuinielasExtra(data || []);
  }, []);

  const cargarPozoYParticipacion = useCallback(async (uid: string, j: number) => {
    const basePartQuery = supabase
      .from('quiniela_participaciones')
      .select('pagado, publicado')
      .eq('user_id', uid)
      .eq('jornada', j);

    const partPromise = quinielaSeleccionada === null
      ? basePartQuery.is('quiniela_extra_id', null).maybeSingle()
      : basePartQuery.eq('quiniela_extra_id', quinielaSeleccionada).maybeSingle();

    const [{ data: pz }, { data: part }] = await Promise.all([
      supabase.from('quiniela_pozo').select('*').eq('jornada', j).single(),
      partPromise,
    ]);
    setPozo(pz as Pozo ?? null);
    setParticipando(part?.pagado ?? null);
    setPublicado(part?.publicado ?? false);
  }, [quinielaSeleccionada]);

  const cargarPartidos = useCallback(async () => {
    const { data } = await supabase
      .from('quiniela_partidos')
      .select('*')
      .eq('jornada', jornada)
      .lte('jornada', 3)
      .order('fecha_hora');
    setPartidos((data as Partido[]) ?? []);
  }, [jornada]);

  const cargarPredicciones = useCallback(async () => {
    if (!userId) return;
    const baseQuery = supabase
      .from('quiniela_predicciones')
      .select('*')
      .eq('user_id', userId);

    const { data } = await (quinielaSeleccionada === null
      ? baseQuery.is('quiniela_extra_id', null)
      : baseQuery.eq('quiniela_extra_id', quinielaSeleccionada));

    const map: Record<string, Prediccion> = {};
    (data as Prediccion[] ?? []).forEach(p => { map[p.partido_id] = p; });
    setPredicciones(map);
    setLoading(false);
  }, [userId, quinielaSeleccionada]);

  useEffect(() => { cargarPartidos(); }, [cargarPartidos]);
  useEffect(() => {
    if (userId) {
      cargarQuinielas(userId);
      cargarPredicciones();
      cargarPozoYParticipacion(userId, jornada);
    }
  }, [userId, jornada, cargarQuinielas, cargarPredicciones, cargarPozoYParticipacion]);

  const handleGuardado = () => {
    setPartidoActivo(null);
    cargarPredicciones();
    if (userId) cargarPozoYParticipacion(userId, jornada);
  };

  const handlePublicar = async () => {
    if (!userId) return;
    setPublicando(true);

    const baseUpdate = supabase
      .from('quiniela_participaciones')
      .update({ publicado: true })
      .eq('user_id', userId)
      .eq('jornada', jornada);

    const { error } = await (quinielaSeleccionada === null
      ? baseUpdate.is('quiniela_extra_id', null)
      : baseUpdate.eq('quiniela_extra_id', quinielaSeleccionada));

    setPublicando(false);
    if (error) {
      console.error('Error publicando:', error);
      toast.error('Error al publicar predicciones');
    } else {
      setPublicado(true);
      toast.success('📢 ¡Jornada publicada exitosamente!');
    }
  };

  const crearQuiniela = async () => {
    if (!nombreNuevaQuiniela.trim() || !userId) return;
    const { data, error } = await supabase
      .from('quiniela_extra')
      .insert({ user_id: userId, nombre: nombreNuevaQuiniela.trim() })
      .select()
      .single();
    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setQuinielasExtra((prev: any[]) => [...prev, data]);
      setQuinielaSeleccionada(data.id);
      setNombreNuevaQuiniela('');
      setShowNuevaQuiniela(false);
      toast.success(`🎫 Quiniela "${data.nombre}" creada`);
    }
  };

  // Progreso de predicciones en la jornada actual
  const predichasEnJornada = partidos.filter(p => predicciones[p.id]).length;
  const totalEnJornada = partidos.length;
  const porcentaje = totalEnJornada > 0 ? Math.round((predichasEnJornada / totalEnJornada) * 100) : 0;
  const jornadaCompleta = predichasEnJornada >= totalEnJornada && totalEnJornada > 0;

  return (
    <main
      className="max-w-lg mx-auto px-4 pb-24 space-y-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      {/* Header */}
      <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}>
          PREDICCIONES
        </h1>
      </div>

      {/* Banner: pago pendiente */}
      {participando === false && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.4)', animation: 'fadeInUp 0.4s ease-out 0.05s both' }}
        >
          <p className="font-bold" style={{ fontFamily: 'var(--font-rajdhani)', color: '#ea580c', fontSize: '1rem' }}>
            ⚠️ Tienes predicciones sin pagar en esta jornada
          </p>

          <p className="text-sm font-mono" style={{ color: '#cbd5e1' }}>
            💳 CLABE: <strong>014180565546539842</strong>
            <br />
            <span style={{ color: '#94a3b8' }}>Monto: </span><strong style={{ color: '#e2e8f0' }}>$50 MXN</strong>
          </p>

          <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)' }}>
            <p className="font-bold text-sm" style={{ fontFamily: 'var(--font-rajdhani)', color: '#f97316' }}>
              📱 Envía por WhatsApp al 55 2326 9241:
            </p>
            <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: '#cbd5e1' }}>
              <li>Captura del comprobante de pago</li>
              <li>Tu correo de Google con el que entraste</li>
              <li>Tu nombre o apodo para el ranking</li>
            </ol>
            <p className="text-xs" style={{ color: '#64748b', marginTop: '0.5rem' }}>
              Tu participación se activará en cuanto confirmemos tu pago ✅
            </p>
          </div>
        </div>
      )}

      {/* Banner: pozo + estado confirmado */}
      {pozo && (
        <div
          className="rounded-2xl px-4 py-3 space-y-1"
          style={{
            background: participando === true ? 'rgba(16,185,129,0.08)' : 'rgba(234,88,12,0.06)',
            border: `1px solid ${participando === true ? 'rgba(16,185,129,0.3)' : 'rgba(234,88,12,0.2)'}`,
            animation: 'fadeInUp 0.4s ease-out 0.1s both',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: participando === true ? '#10b981' : 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
              {participando === true
                ? `✅ Participando en Jornada ${jornada}`
                : `🏆 Pozo Jornada ${jornada}`}
            </p>
            <div className="text-right">
              <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', color: 'var(--accent-gold)', lineHeight: 1 }}>
                ${pozo.total_mxn} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MXN</span>
              </p>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            👥 {pozo.participantes} participante{pozo.participantes !== 1 ? 's' : ''}
            {pozo.estado !== 'abierto' && pozo.ganador_nombre && ` · 🥇 ${pozo.ganador_nombre}`}
          </p>
        </div>
      )}

      {/* Selector quiniela */}
      <div className="flex gap-2 overflow-x-auto pb-2" style={{ animation: 'fadeInUp 0.4s ease-out 0.12s both' }}>
        <button
          onClick={() => setQuinielaSeleccionada(null)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
          style={{
            fontFamily: 'var(--font-rajdhani)',
            background: quinielaSeleccionada === null ? '#ea580c' : 'var(--bg-card)',
            color: quinielaSeleccionada === null ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${quinielaSeleccionada === null ? '#ea580c' : 'var(--border)'}`,
          }}>
          👤 Mi quiniela
        </button>
        {quinielasExtra.map(q => (
          <button
            key={q.id}
            onClick={() => setQuinielaSeleccionada(q.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              fontFamily: 'var(--font-rajdhani)',
              background: quinielaSeleccionada === q.id ? '#ea580c' : 'var(--bg-card)',
              color: quinielaSeleccionada === q.id ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${quinielaSeleccionada === q.id ? '#ea580c' : 'var(--border)'}`,
            }}>
            🎫 {q.nombre}
          </button>
        ))}
        <button
          onClick={() => setShowNuevaQuiniela(true)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-all"
          style={{
            fontFamily: 'var(--font-rajdhani)',
            background: 'var(--bg-card)',
            border: '1px dashed rgba(234,88,12,0.4)',
            color: '#ea580c',
          }}>
          + Nueva
        </button>
      </div>

      {/* Selector jornada */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ animation: 'fadeInUp 0.4s ease-out 0.15s both' }}>
        {jornadas.map(j => (
          <button key={j} onClick={() => setJornada(j)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 min-h-[36px]"
            style={{
              background: jornada === j ? 'var(--accent-gold)' : 'var(--bg-card)',
              color: jornada === j ? '#000' : 'var(--text-secondary)',
              border: `1px solid ${jornada === j ? 'var(--accent-gold)' : 'var(--border)'}`,
              fontFamily: 'var(--font-rajdhani)',
            }}>
            Jornada {j}
          </button>
        ))}
      </div>

      {/* Barra de progreso */}
      {!loading && totalEnJornada > 0 && (
        <div
          className="rounded-2xl px-4 py-3 space-y-2"
          style={{
            background: jornadaCompleta ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
            border: `1px solid ${jornadaCompleta ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
            animation: 'fadeInUp 0.4s ease-out 0.18s both',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: jornadaCompleta ? '#10b981' : 'var(--text-primary)' }}>
              {jornadaCompleta
                ? (publicado ? `✅ ¡Jornada ${jornada} completa y publicada!` : `✅ ¡Jornada ${jornada} completa!`)
                : `Jornada ${jornada}: ${predichasEnJornada}/${totalEnJornada} partidos predichos`}
            </p>
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-bebas)', color: jornadaCompleta ? '#10b981' : 'var(--accent-gold)' }}>
              {porcentaje}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${porcentaje}%`,
                background: jornadaCompleta
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #ea580c, #f97316)',
              }}
            />
          </div>
          {jornadaCompleta && !publicado && (
            <div className="pt-2">
              <button
                onClick={handlePublicar}
                disabled={publicando}
                className="w-full py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#10b981', color: '#000', fontFamily: 'var(--font-rajdhani)' }}
              >
                {publicando ? 'Publicando...' : '📢 Publicar jornada'}
              </button>
              <p className="text-xs text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
                Tus predicciones no serán visibles para los demás hasta que las publiques.
              </p>
            </div>
          )}
          {jornadaCompleta && publicado && (
            <p className="text-xs mt-1" style={{ color: '#10b981' }}>
              Tus predicciones ya son visibles para todos los participantes
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="space-y-3" style={{ animation: 'fadeInUp 0.4s ease-out 0.2s both' }}>
          {partidos.map(partido => (
            <PartidoCard
              key={partido.id}
              partido={partido}
              prediccion={predicciones[partido.id] ?? null}
              participacionPagada={predicciones[partido.id] ? participando : undefined}
              onPredicir={setPartidoActivo}
            />
          ))}
        </div>
      )}

      {partidoActivo && userId && (
        <PrediccionForm
          partido={partidoActivo}
          userId={userId}
          quinielaExtraId={quinielaSeleccionada}
          prediccionExistente={predicciones[partidoActivo.id] ?? null}
          onGuardado={handleGuardado}
          onCancelar={() => setPartidoActivo(null)}
        />
      )}

      {/* Modal nueva quiniela */}
      {showNuevaQuiniela && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setShowNuevaQuiniela(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm"
            style={{ background: '#12121a', border: '1px solid #1e1e2e' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', color: '#ea580c', marginBottom: '1rem' }}>
              🎫 Nueva Quiniela
            </h3>
            <input
              type="text"
              placeholder="Ej: Esposa, Hija, Compadre..."
              maxLength={20}
              value={nombreNuevaQuiniela}
              onChange={e => setNombreNuevaQuiniela(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') crearQuiniela();
                if (e.key === 'Escape') setShowNuevaQuiniela(false);
              }}
              autoFocus
              className="w-full rounded-lg px-3 py-2 text-white mb-4 outline-none"
              style={{ background: '#0a0a0a', border: '1px solid #1e1e2e' }}
            />
            <div className="flex gap-2">
              <button
                onClick={crearQuiniela}
                disabled={!nombreNuevaQuiniela.trim()}
                className="flex-1 py-2 rounded-lg font-bold disabled:opacity-40"
                style={{ background: '#ea580c', color: '#fff', fontFamily: 'var(--font-rajdhani)' }}>
                Crear
              </button>
              <button
                onClick={() => setShowNuevaQuiniela(false)}
                className="px-4 py-2"
                style={{ color: '#64748b' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
