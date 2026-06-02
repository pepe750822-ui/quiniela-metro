-- 1. Agregar columna publicado a quiniela_participaciones
ALTER TABLE quiniela_participaciones 
ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT FALSE;

-- 2. Crear índice para performance
CREATE INDEX IF NOT EXISTS idx_quiniela_participaciones_publicado 
ON quiniela_participaciones(publicado) WHERE publicado = TRUE;

-- 3. Actualizar política RLS de predicciones
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
    AND part.publicado = TRUE
  )
);

-- 4. Actualizar políticas para participaciones (si era necesario)
-- No hay política explícita de "ver_participaciones" mencionada en los scripts anteriores
-- pero para asegurar que puedan ver la info de publicado:
DROP POLICY IF EXISTS "ver_participaciones" ON quiniela_participaciones;
CREATE POLICY "ver_participaciones" ON quiniela_participaciones
FOR SELECT USING (
  auth.uid() = user_id 
  OR publicado = TRUE
  OR EXISTS (SELECT 1 FROM quiniela_jugadores WHERE id = auth.uid() AND rol = 'admin')
);
