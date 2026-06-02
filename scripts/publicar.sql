-- Paso A: Agregar columnas a quiniela_participaciones
ALTER TABLE quiniela_participaciones
ADD COLUMN IF NOT EXISTS predicciones_completas BOOLEAN DEFAULT false;

ALTER TABLE quiniela_participaciones
ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT false;

-- Paso C: Política RLS — predicciones visibles si:
--   1. Son tuyas
--   2. El partido ya inició (estado != 'pendiente')
--   3. El usuario publicó explícitamente su jornada (publicado = true)
DROP POLICY IF EXISTS "ver_predicciones" ON quiniela_predicciones;

CREATE POLICY "ver_predicciones"
ON quiniela_predicciones FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM quiniela_partidos p
    WHERE p.id = partido_id
    AND p.estado != 'pendiente'
  )
  OR
  EXISTS (
    SELECT 1 FROM quiniela_participaciones part
    WHERE part.user_id = quiniela_predicciones.user_id
    AND part.jornada = (
      SELECT jornada FROM quiniela_partidos
      WHERE id = quiniela_predicciones.partido_id
    )
    AND part.publicado = true
  )
);
