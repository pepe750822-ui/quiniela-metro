-- ============================================================
-- Corrige DÍAS Y HORARIOS OFICIALES de la Liguilla (J15)
--
-- NO inserta partidos. Solo actualiza fecha_hora de los 8
-- partidos que ya existen con jornada = 15 y grupo = 'LIGUILLA'.
--
-- Horarios oficiales de la Liga MX, hora del Centro de México.
-- Correr UNA VEZ en el Supabase SQL Editor.
-- ============================================================

WITH horarios(equipo_local, equipo_visitante, fecha_hora) AS (
  VALUES
    -- Ida — miércoles 25 de noviembre
    ('Toluca',      'Atlas',       '2026-11-25 19:00:00-06'::timestamptz),
    ('Monterrey',   'América',     '2026-11-25 21:10:00-06'::timestamptz),
    -- Ida — jueves 26 de noviembre
    ('Pachuca',     'Guadalajara', '2026-11-26 19:00:00-06'::timestamptz),
    ('León',        'Cruz Azul',   '2026-11-26 21:10:00-06'::timestamptz),
    -- Vuelta — sábado 28 de noviembre
    ('Atlas',       'Toluca',      '2026-11-28 19:00:00-06'::timestamptz),
    ('América',     'Monterrey',   '2026-11-28 21:10:00-06'::timestamptz),
    -- Vuelta — domingo 29 de noviembre
    ('Guadalajara', 'Pachuca',     '2026-11-29 19:07:00-06'::timestamptz),
    ('Cruz Azul',   'León',        '2026-11-29 21:00:00-06'::timestamptz)
)
UPDATE quiniela_partidos p
SET fecha_hora = h.fecha_hora
FROM horarios h
WHERE p.temporada = 'ligamx2026'
  AND p.jornada = 15
  AND p.grupo = 'LIGUILLA'
  AND p.equipo_local = h.equipo_local
  AND p.equipo_visitante = h.equipo_visitante;

-- Verificación: deben ser 8 partidos, con estos días/horas CDMX.
SELECT
  equipo_local,
  equipo_visitante,
  es_vuelta,
  fecha_hora AT TIME ZONE 'America/Mexico_City' AS fecha_hora_cdmx,
  estado
FROM quiniela_partidos
WHERE temporada = 'ligamx2026'
  AND jornada = 15
  AND grupo = 'LIGUILLA'
ORDER BY fecha_hora;

SELECT COUNT(*) AS partidos_liguilla_j15
FROM quiniela_partidos
WHERE temporada = 'ligamx2026'
  AND jornada = 15
  AND grupo = 'LIGUILLA';
-- Debe devolver 8.
