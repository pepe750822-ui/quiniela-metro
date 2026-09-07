-- Agregar columna acerto a quiniela_prediccion_campeon_lc
-- Ejecutar una vez en Supabase SQL Editor
ALTER TABLE quiniela_prediccion_campeon_lc
ADD COLUMN IF NOT EXISTS acerto BOOLEAN;
