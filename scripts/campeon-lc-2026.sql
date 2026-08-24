-- Pick de campeón Leagues Cup 2026 — J6 Cuartos
-- Ejecutar UNA VEZ en el Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS quiniela_prediccion_campeon_lc (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temporada  TEXT        NOT NULL,
  equipo     TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, temporada)
);

ALTER TABLE quiniela_prediccion_campeon_lc ENABLE ROW LEVEL SECURITY;

-- Cada usuario puede leer y escribir solo su propio pick
CREATE POLICY "campeon_lc_select" ON quiniela_prediccion_campeon_lc
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "campeon_lc_insert" ON quiniela_prediccion_campeon_lc
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "campeon_lc_update" ON quiniela_prediccion_campeon_lc
  FOR UPDATE USING (auth.uid() = user_id);
