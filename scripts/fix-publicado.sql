-- TAREA 1: Asegurar que la columna existe
ALTER TABLE quiniela_participaciones
ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT false;

ALTER TABLE quiniela_participaciones
ADD COLUMN IF NOT EXISTS predicciones_completas BOOLEAN DEFAULT false;

-- TAREA 3: Política RLS de UPDATE — el usuario puede actualizar su propia fila
-- (necesaria para que "Publicar jornada" funcione)
DROP POLICY IF EXISTS "usuario_publica_predicciones" ON quiniela_participaciones;

CREATE POLICY "usuario_publica_predicciones"
ON quiniela_participaciones FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- También asegurar que el usuario puede INSERT su propia participación
DROP POLICY IF EXISTS "usuario_inserta_participacion" ON quiniela_participaciones;

CREATE POLICY "usuario_inserta_participacion"
ON quiniela_participaciones FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Verificar columnas presentes después del fix:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quiniela_participaciones'
ORDER BY ordinal_position;
