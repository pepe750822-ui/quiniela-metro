'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Prediccion } from '@/types';
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
  const [creditos, setCreditos]           = useState<number | null>(null);

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

  const cargarCreditos = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('quiniela_jugadores')
      .select('creditos')
      .eq('id', uid)
      .single();
    if (data) setCreditos(data.creditos);
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
      cargarCreditos(userId);
    }
  }, [userId, cargarPredicciones, cargarCreditos]);

  const handleGuardado = () => {
    setPartidoActivo(null);
    cargarPredicciones();
    if (userId) cargarCreditos(userId);
  };

  return (
    <main
      className="max-w-lg mx-auto px-4 pb-24 space-y-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}>
          PREDICCIONES
        </h1>
        {creditos !== null && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: creditos > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${creditos > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            <span className="text-sm">💳</span>
            <span
              className={`text-sm font-bold ${creditos <= 0 ? 'animate-pulse' : ''}`}
              style={{ color: creditos > 0 ? 'var(--accent-gold)' : '#ef4444', fontFamily: 'var(--font-rajdhani)' }}
            >
              {creditos} crédito{creditos !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Banner créditos */}
      {creditos !== null && (
        <div
          className="rounded-2xl px-4 py-3 text-sm font-semibold"
          style={{
            background: creditos > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${creditos > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: creditos > 0 ? 'var(--accent-gold)' : '#ef4444',
            fontFamily: 'var(--font-rajdhani)',
            animation: 'fadeInUp 0.4s ease-out 0.1s both',
          }}
        >
          {creditos > 0
            ? `💳 Tienes ${creditos} crédito${creditos !== 1 ? 's' : ''} disponible${creditos !== 1 ? 's' : ''}`
            : '⚠️ Sin créditos — cada predicción cuesta $50 MXN'}
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
