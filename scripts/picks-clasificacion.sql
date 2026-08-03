-- Picks de clasificación a Cuartos de Final — Leagues Cup 2026
CREATE TABLE IF NOT EXISTS quiniela_picks_clasificacion (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  temporada  TEXT        NOT NULL,
  liga       TEXT        NOT NULL, -- 'ligamx' | 'mls'
  equipos    TEXT[]      NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, temporada, liga)
);

ALTER TABLE quiniela_picks_clasificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios ven sus picks" ON quiniela_picks_clasificacion
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "usuarios insertan sus picks" ON quiniela_picks_clasificacion
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuarios actualizan sus picks" ON quiniela_picks_clasificacion
  FOR UPDATE USING (auth.uid() = user_id);
