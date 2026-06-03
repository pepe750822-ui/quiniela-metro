'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';
import { formatearDiaCDMX, formatearHoraCDMX } from '@/lib/utils';

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

  // Agrupar por fecha
  const partidosPorFecha = partidos.reduce((acc, partido) => {
    const fecha = formatearDiaCDMX(partido.fecha_hora);
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(partido);
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
    <main className="min-h-screen pb-24 px-4 sm:px-6 relative text-white" style={{ background: 'var(--bg-primary)' }}>
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
          {Object.entries(partidosPorFecha).map(([fecha, lista]) => (
            <div key={fecha} className="space-y-4" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
              <div className="sticky top-0 z-20 backdrop-blur-md bg-[#1a1c23]/80 py-3 px-4 rounded-xl border border-white/5 shadow-lg">
                <h2 className="text-xl font-bold text-orange-400 capitalize" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                  {fecha}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lista.map(partido => (
                  <div key={partido.id} className="relative bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-orange-500/50 transition-all duration-300">
                    
                    {partido.estado === 'en_curso' && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500/20 text-red-500 text-xs font-bold px-2 py-1 rounded-md animate-pulse">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        EN VIVO
                      </div>
                    )}
                    
                    {partido.estado === 'finalizado' && (
                      <div className="absolute top-3 left-3 bg-white/10 text-gray-400 text-xs font-bold px-2 py-1 rounded-md">
                        FINAL
                      </div>
                    )}

                    <div className="text-right text-xs text-gray-400 mb-2 font-semibold tracking-wider">
                      {partido.grupo ? `GRUPO ${partido.grupo}` : `JORNADA ${partido.jornada}`}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col items-center gap-2 w-1/3">
                        <Bandera emoji={partido.bandera_local} nombre={partido.equipo_local} size="md" />
                        <span className="text-sm font-bold text-center">{partido.equipo_local}</span>
                      </div>

                      <div className="flex flex-col items-center justify-center w-1/3">
                        {(partido.estado === 'en_curso' || partido.estado === 'finalizado') ? (
                          <div className="text-3xl font-black text-white flex gap-3">
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
                        <span className="text-sm font-bold text-center">{partido.equipo_visitante}</span>
                      </div>
                    </div>
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
