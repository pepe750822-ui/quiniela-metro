-- Vista: ranking acumulado J1+J2+J3 (solo participaciones pagadas, sin quinielas extra)
CREATE OR REPLACE VIEW ranking_general AS
SELECT
  r.user_id,
  SUM(r.puntos_total) as puntos_totales,
  SUM(r.exactos) as exactos_totales,
  COUNT(r.jornada) as jornadas_jugadas
FROM quiniela_ranking r
JOIN quiniela_participaciones p
  ON p.user_id = r.user_id
  AND p.jornada = r.jornada
  AND p.pagado = true
  AND p.quiniela_extra_id IS NULL
GROUP BY r.user_id
ORDER BY puntos_totales DESC;

-- Función RPC: misma lógica, accesible desde el cliente con SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_ranking_general()
RETURNS TABLE (
  user_id UUID,
  puntos_totales BIGINT,
  exactos_totales BIGINT,
  jornadas_jugadas BIGINT
) AS $$
  SELECT
    r.user_id,
    SUM(r.puntos_total) as puntos_totales,
    SUM(r.exactos) as exactos_totales,
    COUNT(r.jornada) as jornadas_jugadas
  FROM quiniela_ranking r
  JOIN quiniela_participaciones p
    ON p.user_id = r.user_id
    AND p.jornada = r.jornada
    AND p.pagado = true
    AND p.quiniela_extra_id IS NULL
  GROUP BY r.user_id
  ORDER BY puntos_totales DESC;
$$ LANGUAGE sql SECURITY DEFINER;
