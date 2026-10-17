import { supabase } from './supabase';
import { TEMPORADA_ACTIVA } from './utils';

// Desempate del pozo de la jornada anterior: se resuelve con los puntos de la
// jornada 11 (nombre visible 'J12 + Champions J3').
export const JORNADA_DESEMPATE = 11;
export const JUGADORES_DESEMPATE = ['TOKEN', 'J. Manuel', 'ALV', 'JLG'] as const;

export interface DesempateRow {
  key: string;
  nombre: string;
  clave: string;
  puntos: number;
  exactos: number;
}

const normNombre = (s?: string | null) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Coincide por apodo o por nombre: completo, primera palabra o dos primeras.
// También ignora separadores para variantes tipo 'JMANUEL'.
export const claveDesempate = (nombre?: string | null, apodo?: string | null): string | null => {
  for (const raw of [apodo, nombre]) {
    const completo = normNombre(raw);
    if (!completo) continue;
    const partes = completo.split(' ');
    for (const cand of [completo, partes[0], partes.slice(0, 2).join(' ')]) {
      const hit = JUGADORES_DESEMPATE.find(j => {
        const objetivo = normNombre(j);
        return objetivo === cand || objetivo.replace(/\s+/g, '') === cand.replace(/\s+/g, '');
      });
      if (hit) return hit;
    }
  }
  return null;
};

export const ordenDesempate = (clave: string | null) =>
  (JUGADORES_DESEMPATE as readonly string[]).indexOf(clave ?? '');

// Puntos de los 4 jugadores en la jornada del desempate (quiniela principal,
// partidos finalizados). Devuelve siempre las 4 filas, con 0 pts si aún no hay
// resultados, ordenadas por puntos.
export const cargarDesempateJ11 = async (): Promise<DesempateRow[]> => {
  // 1. Localizar a los 4 jugadores por apodo o nombre
  const { data: jugadores } = await supabase
    .from('quiniela_jugadores')
    .select('id, nombre, apodo');

  const porClave = new Map<string, { id: string; nombre: string; apodo: string | null; clave: string }>();
  ((jugadores ?? []) as { id: string; nombre: string; apodo: string | null }[]).forEach(j => {
    const clave = claveDesempate(j.nombre, j.apodo);
    if (clave && !porClave.has(clave)) porClave.set(clave, { ...j, clave });
  });

  const ids = [...porClave.values()].map(j => j.id);
  if (ids.length === 0) return [];

  // 2. Puntos de la jornada del desempate en la quiniela principal
  const { data: preds } = await supabase
    .from('quiniela_predicciones')
    .select(`
      user_id,
      puntos_ganados,
      partido:quiniela_partidos!inner(estado, jornada, temporada)
    `)
    .is('quiniela_extra_id', null)
    .eq('partido.estado', 'finalizado')
    .eq('partido.jornada', JORNADA_DESEMPATE)
    .eq('partido.temporada', TEMPORADA_ACTIVA)
    .in('user_id', ids);

  const puntajes: Record<string, { puntos: number; exactos: number }> = {};
  (preds ?? []).forEach((p: { user_id: string; puntos_ganados: number | null }) => {
    if (!puntajes[p.user_id]) puntajes[p.user_id] = { puntos: 0, exactos: 0 };
    puntajes[p.user_id].puntos += p.puntos_ganados || 0;
    if (p.puntos_ganados === 3) puntajes[p.user_id].exactos++;
  });

  return [...porClave.values()]
    .map(j => ({
      key:     j.clave,
      nombre:  j.apodo || j.nombre.split(' ')[0] || 'Jugador',
      clave:   j.clave,
      puntos:  puntajes[j.id]?.puntos  ?? 0,
      exactos: puntajes[j.id]?.exactos ?? 0,
    }))
    .sort((a, b) => b.puntos - a.puntos || ordenDesempate(a.clave) - ordenDesempate(b.clave));
};
