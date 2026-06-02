'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Prediccion, Pozo } from '@/types';
import PartidoCard from '@/components/PartidoCard';
import PrediccionForm from '@/components/PrediccionForm';

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
    });

    supabase
      .from('quiniela_partidos')
      .select('jornada')
      .order('jornada')
      .then(({ data }) => {
        const unicas = [...new Set((data ?? []).map((p: { jornada: number }) => p.jornada))];
        setJornadas(unicas);
      });
  }, [router]);

  const cargarPozoYParticipacion = useCallback(async (uid: string, j: number) => {
    const [{ data: pz }, { data: part }] = await Promise.all([
      supabase.from('quiniela_pozo').select('*').eq('jornada', j).single(),
      supabase.from('quiniela_participaciones')
        .select('pagado')
        .eq('user_id', uid)
        .eq('jornada', j)
        .single(),
    ]);
    setPozo(pz as Pozo ?? null);
    setParticipando(part?.pagado ?? null);
  }, []);

  const cargarPartidos = useCallback(async () => {
    const { data } = await supabase
      .from('quiniela_partidos')
      .select('*')
      .eq('jornada', jornada)
      .order('fecha_hora');
    setPartidos((data as Partido[]) ?? []);
  }, [jornada]);

  const cargarPredicciones = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('quiniela_predicciones')
      .select('*')
      .eq('user_id', userId);
    const map: Record<string, Prediccion> = {};
    (data as Prediccion[] ?? []).forEach(p => { map[p.partido_id] = p; });
    setPredicciones(map);
    setLoading(false);
  }, [userId]);

  useEffect(() => { cargarPartidos(); }, [cargarPartidos]);
  useEffect(() => {
    if (userId) {
      cargarPredicciones();
      cargarPozoYParticipacion(userId, jornada);
    }
  }, [userId, jornada, cargarPredicciones, cargarPozoYParticipacion]);

  const handleGuardado = () => {
    setPartidoActivo(null);
    cargarPredicciones();
    if (userId) cargarPozoYParticipacion(userId, jornada);
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
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.4)', animation: 'fadeInUp 0.4s ease-out 0.05s both' }}
        >
          <p className="font-bold" style={{ fontFamily: 'var(--font-rajdhani)', color: '#ea580c', fontSize: '1rem' }}>
            ⚠️ Tienes predicciones sin pagar en esta jornada
          </p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            Para que tu participación sea válida y entres al pozo, transfiere <strong style={{ color: '#e2e8f0' }}>$50 MXN</strong> y envía tu comprobante por WhatsApp al <strong style={{ color: '#e2e8f0' }}>55 2326 9241</strong>
          </p>
          <p className="text-sm font-mono" style={{ color: '#cbd5e1' }}>
            💳 CLABE: 014180565546539842
          </p>
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
                ? `✅ ¡Jornada ${jornada} completa!`
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
          {jornadaCompleta && (
            <p className="text-xs" style={{ color: '#10b981' }}>
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
          prediccionExistente={predicciones[partidoActivo.id] ?? null}
          onGuardado={handleGuardado}
          onCancelar={() => setPartidoActivo(null)}
        />
      )}
    </main>
  );
}
