-- Agregar columna marcador_penales a quiniela_partidos
ALTER TABLE quiniela_partidos
ADD COLUMN IF NOT EXISTS marcador_penales TEXT;

-- Poblar datos de J4 (penales)
UPDATE quiniela_partidos
SET clasificado       = 'Paraguay',
    como_termino      = 'penales',
    marcador_penales  = '4-3'
WHERE equipo_local    = 'Alemania'
  AND equipo_visitante = 'Paraguay'
  AND jornada         = 4;

UPDATE quiniela_partidos
SET clasificado       = 'Marruecos',
    como_termino      = 'penales',
    marcador_penales  = '3-2'
WHERE equipo_local    = 'Países Bajos'
  AND equipo_visitante = 'Marruecos'
  AND jornada         = 4;

-- Verificar
SELECT equipo_local, equipo_visitante, goles_local, goles_visitante,
       clasificado, como_termino, marcador_penales
FROM quiniela_partidos
WHERE jornada = 4 AND como_termino IS NOT NULL;
