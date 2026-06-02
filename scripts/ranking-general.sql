-- Ejecutar DESPUÉS de apodo.sql
CREATE OR REPLACE FUNCTION get_ranking_general()
RETURNS TABLE (
  user_id      UUID,
  nombre       TEXT,
  apodo        TEXT,
  email        TEXT,
  avatar_url   TEXT,
  puntos_total BIGINT,
  exactos      BIGINT
) AS $$
  SELECT
    j.id          AS user_id,
    j.nombre,
    j.apodo,
    j.email,
    j.avatar_url,
    COALESCE(SUM(r.puntos_total), 0) AS puntos_total,
    COALESCE(SUM(r.exactos),      0) AS exactos
  FROM quiniela_jugadores j
  LEFT JOIN quiniela_ranking r ON r.user_id = j.id
  GROUP BY j.id, j.nombre, j.apodo, j.email, j.avatar_url
  ORDER BY puntos_total DESC;
$$ LANGUAGE sql SECURITY DEFINER;
