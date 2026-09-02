export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Tables {
  quiniela_jugadores: {
    Row: {
      id: string;
      nombre: string;
      apodo: string | null;
      email: string | null;
      referencia_admin: string | null;
      rol: 'admin' | 'user';
      created_at: string;
    };
    Insert: Omit<Tables['quiniela_jugadores']['Row'], 'created_at'>;
    Update: Partial<Tables['quiniela_jugadores']['Insert']>;
  };
  quiniela_participaciones: {
    Row: {
      id: string;
      user_id: string;
      jornada: number;
      pagado: boolean;
      publicado: boolean;
      monto: number | null;
      quiniela_extra_id: string | null;
      temporada: string;
      created_at: string;
      pagado_at: string | null;
    };
    Insert: Omit<Tables['quiniela_participaciones']['Row'], 'id' | 'created_at' | 'pagado_at'>;
    Update: Partial<Tables['quiniela_participaciones']['Insert']>;
  };
  quiniela_partidos: {
    Row: {
      id: string;
      temporada: string;
      jornada: number;
      equipo_local: string;
      equipo_visitante: string;
      bandera_local: string | null;
      bandera_visitante: string | null;
      goles_local: number | null;
      goles_visitante: number | null;
      estado: 'pendiente' | 'en_curso' | 'finalizado';
      grupo: string | null;
      fecha_hora: string;
      clasificado: string | null;
      como_termino: 'reglamentario' | 'tiempo_extra' | 'penales' | null;
    };
    Insert: Omit<Tables['quiniela_partidos']['Row'], 'id'>;
    Update: Partial<Tables['quiniela_partidos']['Insert']>;
  };
  quiniela_predicciones: {
    Row: {
      id: string;
      user_id: string;
      partido_id: string;
      quiniela_extra_id: string | null;
      goles_local_pred: number;
      goles_visitante_pred: number;
      clasificado_pred: string | null;
      como_termina_pred: 'reglamentario' | 'tiempo_extra' | 'penales' | null;
      puntos_ganados: number | null;
      publicado: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables['quiniela_predicciones']['Row'], 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Tables['quiniela_predicciones']['Insert']>;
  };
  quiniela_prediccion_campeon: {
    Row: {
      id: string;
      user_id: string;
      quiniela_extra_id: string | null;
      equipo: string;
      jornada: number;
      temporada: string;
      created_at: string;
    };
    Insert: Omit<Tables['quiniela_prediccion_campeon']['Row'], 'id' | 'created_at'>;
    Update: Partial<Tables['quiniela_prediccion_campeon']['Insert']>;
  };
  quiniela_prediccion_campeon_lc: {
    Row: {
      id: string;
      user_id: string;
      equipo: string;
      temporada: string;
      created_at: string;
    };
    Insert: Omit<Tables['quiniela_prediccion_campeon_lc']['Row'], 'id' | 'created_at'>;
    Update: Partial<Tables['quiniela_prediccion_campeon_lc']['Insert']>;
  };
  quiniela_picks_clasificacion: {
    Row: {
      id: string;
      user_id: string;
      liga: 'ligamx' | 'mls';
      equipos: string[];
      temporada: string;
      created_at: string;
    };
    Insert: Omit<Tables['quiniela_picks_clasificacion']['Row'], 'id' | 'created_at'>;
    Update: Partial<Tables['quiniela_picks_clasificacion']['Insert']>;
  };
  quiniela_clasificados_lc: {
    Row: {
      id: string;
      liga: 'ligamx' | 'mls';
      equipos: string[];
      temporada: string;
      created_at: string;
    };
    Insert: Omit<Tables['quiniela_clasificados_lc']['Row'], 'id' | 'created_at'>;
    Update: Partial<Tables['quiniela_clasificados_lc']['Insert']>;
  };
  quiniela_pozo: {
    Row: {
      id: string;
      jornada: number;
      temporada: string;
      participantes: number;
      campeon_j6: string | null;
      monto_total: number;
      created_at: string;
    };
    Insert: Omit<Tables['quiniela_pozo']['Row'], 'id' | 'created_at'>;
    Update: Partial<Tables['quiniela_pozo']['Insert']>;
  };
  quiniela_extra: {
    Row: {
      id: string;
      user_id: string;
      nombre: string;
      temporada: string;
      created_at: string;
    };
    Insert: Omit<Tables['quiniela_extra']['Row'], 'id' | 'created_at'>;
    Update: Partial<Tables['quiniela_extra']['Insert']>;
  };
  quiniela_bono_campeon: {
    Row: {
      id: string;
      user_id: string;
      quiniela_extra_id: string | null;
      jornada: number;
      puntos: number;
      created_at: string;
    };
    Insert: Omit<Tables['quiniela_bono_campeon']['Row'], 'id' | 'created_at'>;
    Update: Partial<Tables['quiniela_bono_campeon']['Insert']>;
  };
  quiniela_grupos: {
    Row: {
      id: string;
      equipo: string;
      temporada: string;
    };
    Insert: Omit<Tables['quiniela_grupos']['Row'], 'id'>;
    Update: Partial<Tables['quiniela_grupos']['Insert']>;
  };
}

export type TableName = keyof Tables;

export type Row<T extends TableName> = Tables[T]['Row'];
export type Insert<T extends TableName> = Tables[T]['Insert'];
export type Update<T extends TableName> = Tables[T]['Update'];