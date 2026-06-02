'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RankingConJugador } from '@/types';
import RankingTable from '@/components/RankingTable';
import Link from 'next/link';

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingConJugador[]>([]);
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));

    supabase
      .from('quiniela_ranking')
      .select('*, jugador:quiniela_jugadores(*)')
      .is('jornada', null)
      .order('puntos_total', { ascending: false })
      .then(({ data }) => {
        setRanking((data as RankingConJugador[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <main className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-6">
      <div className="text-center space-y-1">
        <p className="text-3xl">🏆</p>
        <h1 className="text-2xl font-black uppercase tracking-tight">Quiniela Metro</h1>
        <p className="text-zinc-400 text-sm">Mundial 2026 · STC Metro CDMX</p>
      </div>

      {!userId && (
        <Link href="/login"
          className="block w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-center text-sm transition-colors">
          Entrar a jugar →
        </Link>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <RankingTable ranking={ranking} userId={userId} />
      )}
    </main>
  );
}
