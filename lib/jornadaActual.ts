import { supabase } from './supabase';
import { TEMPORADA_ACTIVA } from './utils';

type PartidoEstado = { jornada: number; estado: string | null };

// Jornada actual: la más baja con al menos un partido que no esté 'finalizado'.
// Si todas están finalizadas, la más alta. Con `permitidas` solo se consideran
// esas jornadas (p. ej. las que tienen pozo); si la elegida no está entre ellas,
// se usa la más alta de las permitidas. Devuelve null si no hay jornadas.
export function calcularJornadaActual(
  partidos: PartidoEstado[],
  permitidas?: number[],
): number | null {
  const todas = [...new Set(partidos.map(p => p.jornada))].sort((a, b) => a - b);
  if (todas.length === 0) return null;

  const pendientes = new Set(
    partidos.filter(p => p.estado !== 'finalizado').map(p => p.jornada),
  );
  const actual = todas.find(j => pendientes.has(j)) ?? todas[todas.length - 1];

  if (!permitidas) return actual;
  if (permitidas.length === 0) return null;
  return permitidas.includes(actual) ? actual : Math.max(...permitidas);
}

// Consulta quiniela_partidos de la temporada activa y calcula la jornada actual.
// Devuelve null si la consulta falla o no hay partidos, para que el llamador
// use su propio respaldo.
export async function cargarJornadaActual(permitidas?: number[]): Promise<number | null> {
  const { data, error } = await supabase
    .from('quiniela_partidos')
    .select('jornada, estado')
    .eq('temporada', TEMPORADA_ACTIVA);
  if (error || !data) return null;
  return calcularJornadaActual(data as PartidoEstado[], permitidas);
}
