'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';
import { formatearFechaCDMX, formatearDiaCDMX, formatearHoraCDMX, getFechaCDMX } from '@/lib/utils';

interface Partido {
  id: string;
  jornada: number;
  grupo: string | null;
  equipo_local: string;
  equipo_visitante: string;
  bandera_local: string;
  bandera_visitante: string;
  goles_local: number | null;
  goles_visitante: number | null;
  fecha_hora: string;
  estado: 'pendiente' | 'en_curso' | 'finalizado';
  estadio?: string | null;
  ciudad?: string | null;
  pais_sede?: string | null;
  tv_abierta?: string | null;
  tv_paga?: string | null;
  streaming?: string | null;
}

export default function CalendarioPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartidos = async () => {
    const { data, error } = await supabase
      .from('quiniela_partidos')
      .select('*')
      .order('fecha_hora', { ascending: true });
    
    if (error) {
      toast.error('Error al cargar el calendario');
      console.error(error);
    } else {
      setPartidos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPartidos();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('partidos-cambios')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'quiniela_partidos' },
        (payload) => {
          const updatedPartido = payload.new as Partido;
          setPartidos(prev => prev.map(p => p.id === updatedPartido.id ? updatedPartido : p));
          
          if (updatedPartido.estado === 'en_curso') {
            toast.info(`¡Gol en el partido ${updatedPartido.equipo_local} vs ${updatedPartido.equipo_visitante}!`);
          } else if (updatedPartido.estado === 'finalizado') {
            toast.success(`Partido finalizado: ${updatedPartido.equipo_local} ${updatedPartido.goles_local} - ${updatedPartido.goles_visitante} ${updatedPartido.equipo_visitante}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (partidos.length === 0) return;
    const primerPendiente = partidos.find(p => p.estado === 'pendiente' || p.estado === 'en_curso');
    if (primerPendiente) {
      setTimeout(() => {
        const el = document.getElementById(`partido-${primerPendiente.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 600);
    }
  }, [partidos]);

  // Agrupar por fecha CDMX: definidos primero, "A definir" al final
  const definidos = partidos.filter(p => p.equipo_local && p.equipo_local !== 'A definir');
  const porDefinir = partidos.filter(p => !p.equipo_local || p.equipo_local === 'A definir');
  const partidosPorFecha = [...definidos, ...porDefinir].reduce((acc, partido) => {
    const key = getFechaCDMX(partido.fecha_hora);
    if (!acc[key]) acc[key] = [];
    acc[key].push(partido);
    return acc;
  }, {} as Record<string, Partido[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-24 px-4 sm:px-6 relative text-slate-900 dark:text-white" style={{ background: 'var(--bg-primary)' }}>
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto pt-10">
        <h1 className="text-4xl md:text-5xl mb-2 text-center" style={{ fontFamily: 'var(--font-bebas)', color: 'var(--accent-gold)' }}>
          CALENDARIO OFICIAL
        </h1>
        <p className="text-center text-gray-400 mb-10 font-semibold" style={{ fontFamily: 'var(--font-rajdhani)' }}>
          En Vivo y en Tiempo Real 📡
        </p>

        <div className="space-y-12">
          {Object.entries(partidosPorFecha).map(([key, lista]) => (
            <div key={key} className="space-y-4" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
              <div className="sticky top-0 z-20 backdrop-blur-md bg-[#1a1c23]/80 py-3 px-4 rounded-xl border border-white/5 shadow-lg">
                <h2 className="text-xl font-bold text-orange-400 capitalize" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                  {formatearDiaCDMX(lista[0].fecha_hora)}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lista.map(partido => partido.equipo_local === 'A definir' || !partido.equipo_local ? (
                  <div key={partido.id} id={`partido-${partido.id}`} className="opacity-40 text-slate-500 text-xs rounded-2xl p-3 border border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <span>Por definir</span>
                    <span>{formatearFechaCDMX(partido.fecha_hora)}</span>
                  </div>
                ) : (
                  <div key={partido.id} id={`partido-${partido.id}`} className="relative bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-orange-500/50 transition-all duration-300">
                    
                    {partido.estado === 'en_curso' && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500/20 text-red-500 text-xs font-bold px-2 py-1 rounded-md animate-pulse">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        EN VIVO
                      </div>
                    )}
                    
                    {partido.estado === 'finalizado' && (
                      <div className="absolute top-3 left-3 bg-green-600/20 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-md">
                        FINAL
                      </div>
                    )}

                    <div className="text-right text-xs text-gray-400 mb-2 font-semibold tracking-wider">
                      {partido.grupo ? `GRUPO ${partido.grupo}` : `JORNADA ${partido.jornada}`}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col items-center gap-2 w-1/3">
                        <Bandera emoji={partido.bandera_local} nombre={partido.equipo_local} size="md" />
                        <span className="text-sm font-bold text-center text-slate-900 dark:text-white">{partido.equipo_local}</span>
                      </div>

                      <div className="flex flex-col items-center justify-center w-1/3">
                        {(partido.estado === 'en_curso' || partido.estado === 'finalizado') ? (
                          <div className="text-3xl font-black text-slate-900 dark:text-white flex gap-3">
                            <span className={partido.estado === 'en_curso' ? 'text-orange-400' : ''}>{partido.goles_local}</span>
                            <span className="text-gray-600">-</span>
                            <span className={partido.estado === 'en_curso' ? 'text-orange-400' : ''}>{partido.goles_visitante}</span>
                          </div>
                        ) : (
                          <div className="text-sm font-semibold text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            {formatearHoraCDMX(partido.fecha_hora)}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-2 w-1/3">
                        <Bandera emoji={partido.bandera_visitante} nombre={partido.equipo_visitante} size="md" />
                        <span className="text-sm font-bold text-center text-slate-900 dark:text-white">{partido.equipo_visitante}</span>
                      </div>
                    </div>

                    {partido.estadio && (
                      <div className="mt-2 text-xs text-slate-500 text-center space-y-0.5">
                        <p>🏟️ {partido.estadio} · {partido.ciudad}</p>
                        <p>{partido.pais_sede}</p>
                        {partido.tv_abierta && (
                          <p className="text-green-400">📺 {partido.tv_abierta}</p>
                        )}
                        {partido.tv_paga && (
                          <p className="text-blue-400">📡 {partido.tv_paga}</p>
                        )}
                        {partido.streaming && (
                          <p className="text-purple-400">📱 {partido.streaming}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
