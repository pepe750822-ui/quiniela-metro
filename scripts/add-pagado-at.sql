-- Agrega columna pagado_at a quiniela_participaciones
-- Ejecutar en Supabase SQL Editor

ALTER TABLE quiniela_participaciones
  ADD COLUMN IF NOT EXISTS pagado_at TIMESTAMPTZ;

-- Opcional: rellenar retroactivamente con created_at para registros ya pagados
UPDATE quiniela_participaciones
SET pagado_at = created_at
WHERE pagado = true AND pagado_at IS NULL;
