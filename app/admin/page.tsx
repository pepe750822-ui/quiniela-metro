'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Partido } from '@/types';
import { toast } from 'sonner';

export default function AdminPage() {
  const [partidos, setPartidos]    = useState<Partido[]>([]);
  const [loading, setLoading]      = useState(true);
  const [isAdmin, setIsAdmin]      = useState(false);
  const [editando, setEditando]    = useState<Record<string, { local: string; visita: string }>>({});
  const [guardando, setGuardando]  = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
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
      }
      setLoading(false);
    });
  }, []);

  const handleGuardar = async (partido: Partido) => {
    const vals = editando[partido.id];
    if (!vals) return;
    setGuardando(partido.id);
    const { error } = await supabase
      .from('quiniela_partidos')
      .update({
        goles_local:      parseInt(vals.local),
        goles_visitante:  parseInt(vals.visita),
        estado:           'finalizado',
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

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin) return (
    <main className="max-w-lg mx-auto px-4 pt-20 text-center space-y-2">
      <p className="text-4xl">🔒</p>
      <p className="text-zinc-400">Solo administradores pueden acceder aquí.</p>
    </main>
  );

  return (
    <main className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-xl font-black">🛠️ Panel Admin — Resultados</h1>
      <div className="space-y-3">
        {partidos.map(partido => {
          const vals = editando[partido.id];
          return (
            <div key={partido.id} className="bg-zinc-800 rounded-2xl p-4 space-y-3 border border-zinc-700">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Grupo {partido.grupo} · J{partido.jornada}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase
                  ${partido.estado === 'finalizado' ? 'bg-zinc-600 text-zinc-300' : 'bg-amber-500/20 text-amber-400'}`}>
                  {partido.estado}
                </span>
              </div>
              <p className="text-sm font-bold text-white text-center">
                {partido.bandera_local} {partido.equipo_local} vs {partido.equipo_visitante} {partido.bandera_visitante}
              </p>
              {partido.estado !== 'finalizado' && (
                <div className="flex items-center gap-2">
                  <input type="number" min="0" placeholder="0"
                    value={vals?.local ?? ''}
                    onChange={e => setEditando(prev => ({ ...prev, [partido.id]: { local: e.target.value, visita: prev[partido.id]?.visita ?? '' } }))}
                    className="flex-1 bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2 text-white text-center text-lg font-bold" />
                  <span className="text-zinc-500 font-bold">–</span>
                  <input type="number" min="0" placeholder="0"
                    value={vals?.visita ?? ''}
                    onChange={e => setEditando(prev => ({ ...prev, [partido.id]: { local: prev[partido.id]?.local ?? '', visita: e.target.value } }))}
                    className="flex-1 bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2 text-white text-center text-lg font-bold" />
                  <button onClick={() => handleGuardar(partido)}
                    disabled={!vals?.local || !vals?.visita || guardando === partido.id}
                    className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-sm disabled:opacity-40">
                    {guardando === partido.id ? '…' : '✓'}
                  </button>
                </div>
              )}
              {partido.estado === 'finalizado' && (
                <p className="text-center text-amber-400 font-bold text-lg">
                  {partido.goles_local} – {partido.goles_visitante}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
