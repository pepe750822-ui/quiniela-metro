'use client';

import { Partido } from '@/types';

interface Props {
  partido: Partido;
  prediccion?: { goles_local_pred: number; goles_visitante_pred: number; puntos_ganados: number } | null;
  onPredicir?: (partido: Partido) => void;
}

const estadoColor: Record<string, string> = {
  pendiente:  'bg-zinc-700 text-zinc-300',
  en_curso:   'bg-green-600 text-white animate-pulse',
  finalizado: 'bg-zinc-600 text-zinc-300',
};

export default function PartidoCard({ partido, prediccion, onPredicir }: Props) {
  const fechaHora = new Date(partido.fecha_hora);
  const fechaStr  = fechaHora.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  const horaStr   = fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const puedePredicir = partido.estado === 'pendiente' && !!onPredicir;

  return (
    <div className="bg-zinc-800 rounded-2xl p-4 space-y-3 border border-zinc-700">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Grupo {partido.grupo} · J{partido.jornada}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${estadoColor[partido.estado]}`}>
          {partido.estado}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-center">
          <p className="text-2xl">{partido.bandera_local}</p>
          <p className="text-sm font-bold text-white mt-1 leading-tight">{partido.equipo_local}</p>
        </div>

        <div className="text-center px-3">
          {partido.estado === 'finalizado' || partido.estado === 'en_curso' ? (
            <p className="text-2xl font-black text-amber-400">
              {partido.goles_local ?? '-'} – {partido.goles_visitante ?? '-'}
            </p>
          ) : (
            <div>
              <p className="text-xs text-zinc-400">{fechaStr}</p>
              <p className="text-base font-bold text-white">{horaStr}</p>
            </div>
          )}
        </div>

        <div className="flex-1 text-center">
          <p className="text-2xl">{partido.bandera_visitante}</p>
          <p className="text-sm font-bold text-white mt-1 leading-tight">{partido.equipo_visitante}</p>
        </div>
      </div>

      {prediccion && (
        <div className="border-t border-zinc-700 pt-2 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            Tu pred: {prediccion.goles_local_pred} – {prediccion.goles_visitante_pred}
          </span>
          {partido.estado === 'finalizado' && (
            <span className={`font-bold ${prediccion.puntos_ganados === 3 ? 'text-green-400' : prediccion.puntos_ganados === 1 ? 'text-amber-400' : 'text-red-400'}`}>
              {prediccion.puntos_ganados === 3 ? '✅ +3 pts' : prediccion.puntos_ganados === 1 ? '〰️ +1 pt' : '❌ 0 pts'}
            </span>
          )}
        </div>
      )}

      {puedePredicir && (
        <button
          onClick={() => onPredicir(partido)}
          className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors"
        >
          {prediccion ? '✏️ Editar predicción' : '⚽ Hacer predicción'}
        </button>
      )}
    </div>
  );
}
