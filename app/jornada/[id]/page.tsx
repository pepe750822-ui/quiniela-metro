'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Prediccion } from '@/types';
import { emailCorto } from '@/lib/utils';

interface ParticipanteVista {
  key: string;
  user_id: string;
  quiniela_extra_id: string | null;
  jugador: { nombre: string; email: string; apodo: string | null } | null;
  quiniela: { nombre: string } | null;
  publicado: boolean;
  pagado: boolean;
  predicciones: Record<string, Prediccion>;
}

const mostrarNombre = (j: { nombre: string; apodo: string | null } | null) =>
  j?.apodo ?? j?.nombre?.split(' ')[0] ?? 'Jugador';

const iniciales = (j: { nombre: string; apodo: string | null } | null) =>
  (j?.apodo ?? j?.nombre ?? 'J').slice(0, 2).toUpperCase();

function Inicial({ p }: { p: ParticipanteVista }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: 'rgba(234,88,12,0.2)', color: 'var(--accent-gold)' }}
    >
      {iniciales(p.jugador)}
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
  const [expandido, setExpandido]         = useState<string | null>(null);

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

      const { data: partcData, error: errorPart } = await supabase
        .from('quiniela_participaciones')
        .select('id, user_id, pagado, publicado, quiniela_extra_id')
        .eq('jornada', jornada);
      console.log('Participaciones jornada:', partcData, errorPart);

      if (!partcData?.length) { setLoading(false); return; }

      const userIds = [...new Set(partcData.map((p: { user_id: string }) => p.user_id))];
      const { data: jugData } = await supabase
        .from('quiniela_jugadores')
        .select('id, nombre, email, apodo')
        .in('id', userIds);

      const quinielaIds = [...new Set(
        partcData
          .map((p: { quiniela_extra_id: string | null }) => p.quiniela_extra_id)
          .filter(Boolean) as string[]
      )];
      const { data: quinielasData } = quinielaIds.length
        ? await supabase.from('quiniela_extra').select('id, nombre').in('id', quinielaIds)
        : { data: [] };

      const partidoIds = listaPartidos.map(p => p.id);
      const predsByKey: Record<string, Record<string, Prediccion>> = {};
      if (partidoIds.length) {
        const { data: predsData, error: errorPred } = await supabase
          .from('quiniela_predicciones')
          .select('*')
          .in('partido_id', partidoIds);
        console.log('Predicciones:', predsData, errorPred);
        (predsData as Prediccion[] ?? []).forEach(pred => {
          const key = `${pred.user_id}__${pred.quiniela_extra_id ?? ''}`;
          if (!predsByKey[key]) predsByKey[key] = {};
          predsByKey[key][pred.partido_id] = pred;
        });
      }

      const lista: ParticipanteVista[] = partcData.map((p: {
        user_id: string; publicado: boolean; pagado: boolean; quiniela_extra_id: string | null;
      }) => {
        const key = `${p.user_id}__${p.quiniela_extra_id ?? ''}`;
        return {
          key,
          user_id:           p.user_id,
          quiniela_extra_id: p.quiniela_extra_id ?? null,
          jugador:           (jugData ?? []).find((j: { id: string }) => j.id === p.user_id) ?? null,
          quiniela:          p.quiniela_extra_id
            ? ((quinielasData ?? []) as { id: string; nombre: string }[]).find(q => q.id === p.quiniela_extra_id) ?? null
            : null,
          publicado:         p.publicado ?? false,
          pagado:            p.pagado ?? false,
          predicciones:      predsByKey[key] ?? {},
        };
      });

      lista.sort((a, b) => {
        if (a.user_id === userId && !a.quiniela_extra_id) return -1;
        if (b.user_id === userId && !b.quiniela_extra_id) return 1;
        if (a.user_id === userId) return -1;
        if (b.user_id === userId) return 1;
        const score = (x: ParticipanteVista) => (x.publicado && x.pagado ? 2 : x.publicado ? 1 : 0);
        return score(b) - score(a);
      });

      setParticipantes(lista);
      setExpandido(`${userId}__`);
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
        <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          ✅ <strong style={{ color: '#10b981' }}>Válido</strong> = publicado y pago confirmado · ⏳ <strong style={{ color: '#f59e0b' }}>Pago pendiente</strong> = publicado, esperando confirmación
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
            const esYo    = p.user_id === userId;
            const abierto = expandido === p.key;
            const toggle  = () => setExpandido(abierto ? null : p.key);
            return (
              <div
                key={p.key}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${esYo ? 'rgba(234,88,12,0.4)' : 'var(--border)'}`,
                  animation: `fadeInUp 0.4s ease-out ${i * 60}ms both`,
                }}
              >
                {/* Header — siempre visible, clickeable */}
                <div
                  className="px-4 py-3 flex items-center justify-between cursor-pointer select-none active:opacity-70 transition-opacity"
                  style={{ borderBottom: abierto ? '1px solid var(--border)' : undefined }}
                  onClick={toggle}
                >
                  <div className="flex items-center gap-2">
                    <Inicial p={p} />
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-1.5 flex-wrap"
                        style={{ color: esYo ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                        {mostrarNombre(p.jugador)}
                        {esYo && (
                          <span className="text-[9px] bg-orange-600 text-black px-1.5 py-0.5 rounded-full font-black">TÚ</span>
                        )}
                      </p>
                      {p.quiniela?.nombre && (
                        <span className="text-xs block" style={{ color: '#ea580c' }}>
                          🎫 {p.quiniela.nombre}
                        </span>
                      )}
                      {p.jugador?.email && (
                        <p className="text-xs text-slate-500">{emailCorto(p.jugador.email)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!p.publicado ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(100,116,139,0.15)', color: '#64748b' }}>
                        🔒 Sin publicar
                      </span>
                    ) : p.pagado ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        ✅ Válido
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(234,170,12,0.15)', color: '#f59e0b' }}>
                        ⏳ Pago pendiente
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {abierto ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Contenido — solo visible si expandido */}
                {abierto && (
                  !p.publicado ? (
                    <div className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>
                      🔒 Aún no ha publicado sus predicciones
                    </div>
                  ) : (
                    <div>
                      {partidos.map((partido, pi) => {
                        const pred = p.predicciones[partido.id];
                        return (
                          <div
                            key={partido.id}
                            className="px-4 py-2 flex items-center justify-between"
                            style={{ borderTop: pi > 0 ? '1px solid var(--border)' : undefined }}
                          >
                            <span className="text-xs flex-1 pr-3 truncate" style={{ color: 'var(--text-secondary)' }}>
                              {partido.equipo_local} vs {partido.equipo_visitante}
                            </span>
                            {pred ? (
                              <span className="shrink-0 font-bold"
                                style={{ fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                {pred.goles_local_pred} – {pred.goles_visitante_pred}
                              </span>
                            ) : (
                              <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>–</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
