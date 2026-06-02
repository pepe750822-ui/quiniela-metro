'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido } from '@/types';
import PartidoCard from '@/components/PartidoCard';

export default function JornadaPage() {
  const { id } = useParams<{ id: string }>();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from('quiniela_partidos')
      .select('*')
      .eq('jornada', Number(id))
      .order('fecha_hora')
      .then(({ data }) => {
        setPartidos((data as Partido[]) ?? []);
        setLoading(false);
      });
  }, [id]);

  return (
    <main className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-xl font-black">📅 Jornada {id}</h1>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {partidos.map(p => <PartidoCard key={p.id} partido={p} />)}
        </div>
      )}
    </main>
  );
}
