'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Prediccion } from '@/types';

interface ParticipanteVista {
  user_id: string;
  nombre: string;
  publicado: boolean;
  predicciones: Record<string, Prediccion>;
}

function Inicial({ nombre }: { nombre: string }) {
  const parts = nombre.trim().split(' ');
  const ini = parts.length >= 2 ? parts[0][0] + parts[1][0] : nombre.slice(0, 2);
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: 'rgba(234,88,12,0.2)', color: 'var(--accent-gold)' }}
    >
      {ini.toUpperCase()}
    </div>
  );
}

export default function JornadaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const jornada = Number(id);
  const [partidos, setPartidos]           = useState<Partido[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteVista[]>([]);
  const [userId, setUserId]               = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
    });
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const cargar = async () => {
      const { data: pData } = await supabase
        .from('quiniela_partidos')
        .select('*')
        .eq('jornada', jornada)
        .order('fecha_hora');
      const listaPartidos = (pData as Partido[]) ?? [];
      setPartidos(listaPartidos);

      const { data: partcData } = await supabase
        .from('quiniela_participaciones')
        .select('user_id, publicado')
        .eq('jornada', jornada);

      if (!partcData?.length) { setLoading(false); return; }

      const userIds = partcData.map((p: { user_id: string }) => p.user_id);
      const { data: jugData } = await supabase
        .from('quiniela_jugadores')
        .select('id, nombre')
        .in('id', userIds);
      const jugMap: Record<string, string> = {};
      (jugData ?? []).forEach((j: { id: string; nombre: string }) => { jugMap[j.id] = j.nombre; });

      const partidoIds = listaPartidos.map(p => p.id);
      const predsByUser: Record<string, Record<string, Prediccion>> = {};
      if (partidoIds.length) {
        const { data: predsData } = await supabase
          .from('quiniela_predicciones')
          .select('*')
          .in('partido_id', partidoIds);
        (predsData as Prediccion[] ?? []).forEach(pred => {
          if (!predsByUser[pred.user_id]) predsByUser[pred.user_id] = {};
          predsByUser[pred.user_id][pred.partido_id] = pred;
        });
      }

      const lista: ParticipanteVista[] = partcData.map((p: { user_id: string; publicado: boolean }) => ({
        user_id: p.user_id,
        nombre: jugMap[p.user_id] ?? 'Jugador',
        publicado: p.publicado ?? false,
        predicciones: predsByUser[p.user_id] ?? {},
      }));

      lista.sort((a, b) => {
        if (a.user_id === userId) return -1;
        if (b.user_id === userId) return 1;
        return (b.publicado ? 1 : 0) - (a.publicado ? 1 : 0);
      });

      setParticipantes(lista);
      setLoading(false);
    };

    cargar();
  }, [userId, jornada]);

  return (
    <main
      className="max-w-lg mx-auto px-4 pb-24 space-y-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--accent-gold)', lineHeight: 1, letterSpacing: '0.05em' }}>
          JORNADA {jornada}
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Predicciones de los participantes
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
        </div>
      ) : participantes.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Aún no hay participantes en esta jornada.
        </p>
      ) : (
        <div className="space-y-3" style={{ animation: 'fadeInUp 0.4s ease-out 0.1s both' }}>
          {participantes.map((p, i) => {
            const esYo = p.user_id === userId;
            const tienePreds = Object.keys(p.predicciones).length > 0;
            return (
              <div
                key={p.user_id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${esYo ? 'rgba(234,88,12,0.4)' : 'var(--border)'}`,
                  animation: `fadeInUp 0.4s ease-out ${i * 60}ms both`,
                }}
              >
                {/* Header del participante */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: tienePreds || !p.publicado ? '1px solid var(--border)' : undefined }}
                >
                  <div className="flex items-center gap-2">
                    <Inicial nombre={p.nombre} />
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-1.5"
                        style={{ color: esYo ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                        {p.nombre.split(' ')[0]}
                        {esYo && (
                          <span className="text-[9px] bg-orange-600 text-black px-1.5 py-0.5 rounded-full font-black">TÚ</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {p.publicado ? (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                    >
                      ✅ Publicado
                    </span>
                  ) : (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c' }}
                    >
                      🔒 Sin publicar
                    </span>
                  )}
                </div>

                {/* Predicciones o mensaje bloqueado */}
                {!p.publicado ? (
                  <div className="px-4 py-3">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      🔒 {esYo ? 'Tus predicciones aún no están publicadas' : `${p.nombre.split(' ')[0]} aún no ha publicado sus predicciones`}
                    </p>
                  </div>
                ) : (
                  <div>
                    {partidos.map((partido, pi) => {
                      const pred = p.predicciones[partido.id];
                      return (
                        <div
                          key={partido.id}
                          className="px-4 py-2 flex items-center justify-between"
                          style={{
                            borderTop: pi > 0 ? '1px solid var(--border)' : undefined,
                          }}
                        >
                          <span className="text-xs flex-1 pr-3 truncate" style={{ color: 'var(--text-secondary)' }}>
                            {partido.equipo_local} vs {partido.equipo_visitante}
                          </span>
                          {pred ? (
                            <span
                              className="shrink-0 font-bold"
                              style={{ fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: 'var(--text-primary)' }}
                            >
                              {pred.goles_local_pred} – {pred.goles_visitante_pred}
                            </span>
                          ) : (
                            <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>–</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
