export type EstadoPartido = 'pendiente' | 'en_curso' | 'finalizado';
export type RolJugador = 'jugador' | 'admin';

export interface Partido {
  id: string;
  jornada: number;
  grupo: string | null;
  equipo_local: string;
  equipo_visitante: string;
  bandera_local: string | null;
  bandera_visitante: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  fecha_hora: string;
  estado: EstadoPartido;
}

export interface Prediccion {
  id: string;
  user_id: string;
  partido_id: string;
  goles_local_pred: number;
  goles_visitante_pred: number;
  puntos_ganados: number;
  created_at: string;
  updated_at: string;
  partido?: Partido;
}

export interface Jugador {
  id: string;
  nombre: string;
  email: string;
  rol: RolJugador;
  avatar_url: string | null;
  created_at: string;
}

export interface Ranking {
  id: string;
  user_id: string;
  jornada: number | null;
  puntos_total: number;
  exactos: number;
  updated_at: string;
  jugador?: Jugador;
}

export interface PrediccionConPartido extends Prediccion {
  partido: Partido;
}

export interface RankingConJugador extends Ranking {
  jugador: Jugador;
}
