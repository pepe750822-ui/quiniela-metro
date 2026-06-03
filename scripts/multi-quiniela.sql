-- Tabla de quinielas extra por usuario
CREATE TABLE IF NOT EXISTS quiniela_extra (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE quiniela_extra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_ve_sus_quinielas"
ON quiniela_extra FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "usuario_crea_quinielas"
ON quiniela_extra FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuario_edita_sus_quinielas"
ON quiniela_extra FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "admin_ve_todas_quinielas"
ON quiniela_extra FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Agregar quiniela_extra_id a predicciones
ALTER TABLE quiniela_predicciones
ADD COLUMN IF NOT EXISTS quiniela_extra_id UUID
  REFERENCES quiniela_extra(id) ON DELETE CASCADE;

-- Agregar quiniela_extra_id a participaciones
ALTER TABLE quiniela_participaciones
ADD COLUMN IF NOT EXISTS quiniela_extra_id UUID
  REFERENCES quiniela_extra(id) ON DELETE CASCADE;

-- Cambiar unique constraint para incluir quiniela_extra_id
ALTER TABLE quiniela_predicciones
DROP CONSTRAINT IF EXISTS quiniela_predicciones_user_id_partido_id_key;

ALTER TABLE quiniela_predicciones
ADD CONSTRAINT quiniela_predicciones_unique
UNIQUE (user_id, partido_id, quiniela_extra_id);

ALTER TABLE quiniela_participaciones
DROP CONSTRAINT IF EXISTS quiniela_participaciones_user_id_jornada_key;

ALTER TABLE quiniela_participaciones
ADD CONSTRAINT quiniela_participaciones_unique
UNIQUE (user_id, jornada, quiniela_extra_id);
