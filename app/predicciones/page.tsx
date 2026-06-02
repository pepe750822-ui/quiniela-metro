'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Prediccion } from '@/types';
import PartidoCard from '@/components/PartidoCard';
import PrediccionForm from '@/components/PrediccionForm';

export default function PrediccionesPage() {
  const router = useRouter();
  const [userId, setUserId]           = useState<string | null>(null);
  const [partidos, setPartidos]       = useState<Partido[]>([]);
  const [predicciones, setPredicciones] = useState<Record<string, Prediccion>>({});
  const [partidoActivo, setPartidoActivo] = useState<Partido | null>(null);
  const [loading, setLoading]         = useState(true);
  const [jornada, setJornada]         = useState(1);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
    });
  }, [router]);

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
  useEffect(() => { if (userId) cargarPredicciones(); }, [userId, cargarPredicciones]);

  return (
    <main className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-xl font-black">⚽ Predicciones</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2].map(j => (
          <button key={j} onClick={() => setJornada(j)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors
              ${jornada === j ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
            Jornada {j}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
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
          onGuardado={() => { setPartidoActivo(null); cargarPredicciones(); }}
          onCancelar={() => setPartidoActivo(null)}
        />
      )}
    </main>
  );
}
