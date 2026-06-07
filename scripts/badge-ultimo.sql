-- Agregar columna badge_ultimo a quiniela_jugadores
-- Valor ejemplo: 'J1' significa que el jugador fue último en Jornada 1
ALTER TABLE quiniela_jugadores
ADD COLUMN IF NOT EXISTS badge_ultimo TEXT;
