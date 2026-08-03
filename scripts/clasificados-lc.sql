CREATE TABLE IF NOT EXISTS quiniela_clasificados_lc (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  temporada TEXT NOT NULL,
  liga TEXT NOT NULL,
  equipos TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(temporada, liga)
);
ALTER TABLE quiniela_clasificados_lc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todos pueden leer clasificados" ON quiniela_clasificados_lc FOR SELECT USING (true);
CREATE POLICY "solo admin puede modificar clasificados" ON quiniela_clasificados_lc FOR ALL USING (
  EXISTS (SELECT 1 FROM quiniela_jugadores WHERE id = auth.uid() AND rol = 'admin')
);
