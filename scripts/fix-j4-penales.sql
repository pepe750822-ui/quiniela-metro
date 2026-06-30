-- Actualizar partidos de J4 que terminaron en penales
-- Ejecutar en Supabase SQL Editor

UPDATE quiniela_partidos
SET clasificado = 'Paraguay', como_termino = 'penales'
WHERE equipo_local = 'Alemania'
  AND equipo_visitante = 'Paraguay'
  AND jornada = 4;

UPDATE quiniela_partidos
SET clasificado = 'Marruecos', como_termino = 'penales'
WHERE equipo_local = 'Países Bajos'
  AND equipo_visitante = 'Marruecos'
  AND jornada = 4;

-- Verificar resultados
SELECT id, equipo_local, equipo_visitante, jornada, clasificado, como_termino
FROM quiniela_partidos
WHERE jornada = 4 AND como_termino IS NOT NULL;
