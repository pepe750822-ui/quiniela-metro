-- Paso 1: Agregar columna apodo a jugadores
ALTER TABLE quiniela_jugadores
ADD COLUMN IF NOT EXISTS apodo TEXT;

-- Paso 2: (Opcional) Volver a ejecutar ranking-general.sql
-- para que get_ranking_general() también devuelva el apodo.
-- El script actualizado ya está en scripts/ranking-general.sql
