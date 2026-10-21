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
  detalle?: string;
}

type JugadorDesempate = { id: string; nombre: string; apodo: string | null; clave: string };
type Puntaje = { puntos: number; exactos: number };

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

const buildFilas = (
  porClave: Map<string, JugadorDesempate>,
  puntajes: Record<string, Puntaje>,
): DesempateRow[] =>
  [...porClave.values()]
    .map(j => ({
      key:     j.clave,
      nombre:  j.apodo || j.nombre.split(' ')[0] || 'Jugador',
      clave:   j.clave,
      puntos:  puntajes[j.id]?.puntos  ?? 0,
      exactos: puntajes[j.id]?.exactos ?? 0,
    }))
    .sort((a, b) => b.puntos - a.puntos || ordenDesempate(a.clave) - ordenDesempate(b.clave));

// Puntos de los 4 jugadores en la jornada 11 usando EXACTAMENTE la misma fuente
// que el ranking de /tabla (calcTotal): partidos finalizados de la jornada y
// predicciones servidas por /api/predicciones-tabla con service_role, para no
// depender de RLS. Suma solo la quiniela principal (quiniela_extra_id IS NULL).
export const cargarDesempateJ11 = async (): Promise<DesempateRow[]> => {
  // 1. Localizar a los 4 jugadores por apodo o nombre
  const { data: jugadores } = await supabase
    .from('quiniela_jugadores')
    .select('id, nombre, apodo');

  const porClave = new Map<string, JugadorDesempate>();
  ((jugadores ?? []) as { id: string; nombre: string; apodo: string | null }[]).forEach(j => {
    const clave = claveDesempate(j.nombre, j.apodo);
    if (clave && !porClave.has(clave)) porClave.set(clave, { ...j, clave });
  });

  if (porClave.size === 0) return [];

  // 2. Partidos de la jornada del desempate en la temporada activa
  const { data: partidos } = await supabase
    .from('quiniela_partidos')
    .select('id, estado')
    .eq('temporada', TEMPORADA_ACTIVA)
    .eq('jornada', JORNADA_DESEMPATE);

  const finalizados = new Set(
    ((partidos ?? []) as { id: string; estado: string }[])
      .filter(p => p.estado === 'finalizado')
      .map(p => p.id)
  );

  if (finalizados.size === 0) return buildFilas(porClave, {});

  // 3. Predicciones por la misma ruta que usa el ranking de la tabla
  const res = await fetch('/api/predicciones-tabla', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partidoIds: [...finalizados] }),
  });
  const { predicciones: preds = [] } = await res.json().catch(() => ({ predicciones: [] }));

  const puntajes: Record<string, Puntaje> = {};
  (preds as { user_id: string; partido_id: string; quiniela_extra_id: string | null; puntos_ganados: number | null }[])
    .forEach(p => {
      if (p.quiniela_extra_id !== null) return;     // solo quiniela principal
      if (!finalizados.has(p.partido_id)) return;   // solo partidos finalizados
      if (!puntajes[p.user_id]) puntajes[p.user_id] = { puntos: 0, exactos: 0 };
      puntajes[p.user_id].puntos += p.puntos_ganados || 0;
      if (p.puntos_ganados === 3) puntajes[p.user_id].exactos++;
    });

  return buildFilas(porClave, puntajes);
};

// Desempate del pozo de la jornada 11: lo resuelven los puntos de la jornada 12 entre
// quienes quedaron empatados en el primer lugar de la jornada 11. Los empatados se
// detectan solos; si el pozo ya tiene ganador o no hay empate, devuelve [].
export const DESEMPATE_POZO_J11 = { jornadaPozo: 11, jornadaPuntos: 12 } as const;

type PredServida = {
  user_id: string;
  partido_id: string;
  quiniela_extra_id: string | null;
  puntos_ganados: number | null;
};

const claveEntrada = (userId: string, extraId: string | null) => `${userId}:${extraId ?? 'null'}`;

export const cargarDesempatePozoJ11 = async (): Promise<DesempateRow[]> => {
  const { jornadaPozo, jornadaPuntos } = DESEMPATE_POZO_J11;

  const [{ data: pozo }, { data: parts }, { data: partidos }] = await Promise.all([
    supabase.from('quiniela_pozo').select('ganador_id').eq('temporada', TEMPORADA_ACTIVA).eq('jornada', jornadaPozo).maybeSingle(),
    supabase.from('quiniela_participaciones').select('user_id, quiniela_extra_id').eq('temporada', TEMPORADA_ACTIVA).eq('jornada', jornadaPozo).eq('pagado', true),
    supabase.from('quiniela_partidos').select('id, jornada, estado').eq('temporada', TEMPORADA_ACTIVA).in('jornada', [jornadaPozo, jornadaPuntos]),
  ]);

  if (pozo?.ganador_id) return [];

  const entradas = (parts ?? []) as { user_id: string; quiniela_extra_id: string | null }[];
  const finalizados = ((partidos ?? []) as { id: string; jornada: number; estado: string }[])
    .filter(p => p.estado === 'finalizado');
  const jornadaDe = new Map(finalizados.map(p => [p.id, p.jornada]));

  if (entradas.length < 2 || !finalizados.some(p => p.jornada === jornadaPozo)) return [];

  // Misma fuente que el ranking de /tabla: predicciones servidas con service_role
  const res = await fetch('/api/predicciones-tabla', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partidoIds: finalizados.map(p => p.id) }),
  });
  const { predicciones: preds = [] } = await res.json().catch(() => ({ predicciones: [] }));

  const puntosPozo: Record<string, number> = {};
  const puntajesDesempate: Record<string, Puntaje> = {};
  (preds as PredServida[]).forEach(p => {
    const jornada = jornadaDe.get(p.partido_id);
    if (jornada === undefined) return;
    const k = claveEntrada(p.user_id, p.quiniela_extra_id);
    if (jornada === jornadaPozo) {
      puntosPozo[k] = (puntosPozo[k] ?? 0) + (p.puntos_ganados || 0);
    } else if (jornada === jornadaPuntos) {
      if (!puntajesDesempate[k]) puntajesDesempate[k] = { puntos: 0, exactos: 0 };
      puntajesDesempate[k].puntos += p.puntos_ganados || 0;
      if (p.puntos_ganados === 3) puntajesDesempate[k].exactos++;
    }
  });

  const total = (e: { user_id: string; quiniela_extra_id: string | null }) =>
    puntosPozo[claveEntrada(e.user_id, e.quiniela_extra_id)] ?? 0;
  const maximo = Math.max(...entradas.map(total));
  const empatados = entradas.filter(e => total(e) === maximo);
  if (empatados.length < 2) return [];

  const userIds = [...new Set(empatados.map(e => e.user_id))];
  const extraIds = [...new Set(empatados.map(e => e.quiniela_extra_id).filter(Boolean))] as string[];
  const [{ data: jugadores }, { data: extras }] = await Promise.all([
    supabase.from('quiniela_jugadores').select('id, nombre, apodo').in('id', userIds),
    extraIds.length
      ? supabase.from('quiniela_extra').select('id, nombre').in('id', extraIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);
  const jugadorPorId = new Map(((jugadores ?? []) as { id: string; nombre: string; apodo: string | null }[]).map(j => [j.id, j]));
  const extraPorId = new Map(((extras ?? []) as { id: string; nombre: string }[]).map(q => [q.id, q.nombre]));

  return empatados
    .map(e => {
      const k = claveEntrada(e.user_id, e.quiniela_extra_id);
      const jug = jugadorPorId.get(e.user_id);
      const base = jug?.apodo || jug?.nombre?.split(' ')[0] || 'Jugador';
      const extra = e.quiniela_extra_id ? extraPorId.get(e.quiniela_extra_id) : null;
      const sc = puntajesDesempate[k] ?? { puntos: 0, exactos: 0 };
      return {
        key:     k,
        nombre:  extra ? `${base} (${extra})` : base,
        clave:   k,
        puntos:  sc.puntos,
        exactos: sc.exactos,
        detalle: `${maximo} pts en J${jornadaPozo} · ${sc.exactos} exactos en J${jornadaPuntos}`,
      };
    })
    .sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre));
};
