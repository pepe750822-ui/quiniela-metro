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

      {/* Banner pozo / participación */}
      {pozo && (
        <div
          className="rounded-2xl px-4 py-3 space-y-1"
          style={{
            background: participando
              ? 'rgba(16,185,129,0.08)'
              : 'rgba(245,158,11,0.08)',
            border: `1px solid ${participando ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.25)'}`,
            animation: 'fadeInUp 0.4s ease-out 0.1s both',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold" style={{ color: participando ? '#10b981' : 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                {participando === true
                  ? `✅ Participando en Jornada ${jornada}`
                  : participando === false
                    ? `⏳ Pago pendiente — Jornada ${jornada}`
                    : `⚽ Participa en Jornada ${jornada} · $50 MXN`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                👥 {pozo.participantes} participante{pozo.participantes !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: 'var(--accent-gold)', lineHeight: 1 }}>
                ${pozo.total_mxn}
              </p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>pozo</p>
            </div>
          </div>
          {pozo.estado !== 'abierto' && pozo.ganador_nombre && (
            <p className="text-xs font-bold mt-1" style={{ color: '#10b981' }}>
              🥇 Ganador: {pozo.ganador_nombre}
            </p>
          )}
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
