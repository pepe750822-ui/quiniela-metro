-- Actualiza el deadline de la predicción de campeón mundial
-- Nuevo deadline: 27 de junio 8:00 p.m. CDMX = 2026-06-28T02:00:00+00

DROP POLICY IF EXISTS "campeon_picks_insert" ON quiniela_campeon_picks;
DROP POLICY IF EXISTS "campeon_picks_update" ON quiniela_campeon_picks;

CREATE POLICY "campeon_picks_insert" ON quiniela_campeon_picks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOW() < '2026-06-28T02:00:00+00'::timestamptz
  );

CREATE POLICY "campeon_picks_update" ON quiniela_campeon_picks
  FOR UPDATE USING (
    auth.uid() = user_id
    AND NOW() < '2026-06-28T02:00:00+00'::timestamptz
  );
