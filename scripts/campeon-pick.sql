CREATE TABLE IF NOT EXISTS quiniela_campeon_picks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES quiniela_jugadores(id) ON DELETE CASCADE,
  equipo     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quiniela_campeon_picks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all picks (needed for aggregate stats)
CREATE POLICY "campeon_picks_read" ON quiniela_campeon_picks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Own user can insert before deadline
CREATE POLICY "campeon_picks_insert" ON quiniela_campeon_picks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOW() < '2026-06-11T20:00:00+00'::timestamptz
  );

-- Own user can update before deadline
CREATE POLICY "campeon_picks_update" ON quiniela_campeon_picks
  FOR UPDATE USING (
    auth.uid() = user_id
    AND NOW() < '2026-06-11T20:00:00+00'::timestamptz
  );

-- badge_campeon: team name when user guessed correctly, NULL otherwise
ALTER TABLE quiniela_jugadores
  ADD COLUMN IF NOT EXISTS badge_campeon TEXT;
