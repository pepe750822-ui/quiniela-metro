-- Bono +5 pts por pick de campeón J6 (Cuartos de Final)
-- Ejecutar en Supabase SQL Editor

-- 1. Columna campeon_j6 en quiniela_pozo para registrar el equipo declarado
ALTER TABLE quiniela_pozo
  ADD COLUMN IF NOT EXISTS campeon_j6 TEXT;

-- 2. Tabla de bonos por jornada
CREATE TABLE IF NOT EXISTS quiniela_bono_campeon (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiniela_extra_id UUID       REFERENCES quiniela_extra(id) ON DELETE CASCADE,
  jornada          INTEGER     NOT NULL DEFAULT 6,
  equipo           TEXT        NOT NULL,
  puntos           INTEGER     NOT NULL DEFAULT 5,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quiniela_bono_campeon ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer (para ranking)
CREATE POLICY "bono_campeon_read" ON quiniela_bono_campeon
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo service role puede insertar/eliminar (lo hace el admin server-side o directo con service key)
-- El admin page usa el cliente con anon key — agregar política de insert para admins si es necesario:
CREATE POLICY "bono_campeon_admin_insert" ON quiniela_bono_campeon
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiniela_jugadores
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

CREATE POLICY "bono_campeon_admin_delete" ON quiniela_bono_campeon
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quiniela_jugadores
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );
