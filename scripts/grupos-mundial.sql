-- Tabla de posiciones de grupos — Mundial 2026
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS quiniela_grupos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo TEXT NOT NULL,
  equipo TEXT NOT NULL,
  bandera TEXT,
  pj INTEGER DEFAULT 0,
  g INTEGER DEFAULT 0,
  e INTEGER DEFAULT 0,
  p INTEGER DEFAULT 0,
  gf INTEGER DEFAULT 0,
  gc INTEGER DEFAULT 0,
  pts INTEGER GENERATED ALWAYS AS (g * 3 + e) STORED,
  dg INTEGER GENERATED ALWAYS AS (gf - gc) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quiniela_grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_leen_grupos"
ON quiniela_grupos FOR SELECT USING (true);

CREATE POLICY "admin_gestiona_grupos"
ON quiniela_grupos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_grupos_grupo ON quiniela_grupos(grupo);
CREATE INDEX IF NOT EXISTS idx_grupos_pts ON quiniela_grupos(pts DESC);
