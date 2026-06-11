-- Fix: el trigger calcular_puntos_quiniela sumaba predicciones de quinielas extra
-- junto con las de la quiniela principal, inflando puntos_total en quiniela_ranking.
-- Este script corrige el trigger y recalcula todos los datos existentes.

-- 1. Corregir el trigger para filtrar solo quiniela principal
CREATE OR REPLACE FUNCTION calcular_puntos_quiniela()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quiniela_predicciones p
  SET puntos_ganados = CASE
    WHEN p.goles_local_pred = NEW.goles_local
     AND p.goles_visitante_pred = NEW.goles_visitante
    THEN 3
    WHEN (p.goles_local_pred > p.goles_visitante_pred
          AND NEW.goles_local > NEW.goles_visitante)
      OR (p.goles_local_pred < p.goles_visitante_pred
          AND NEW.goles_local < NEW.goles_visitante)
      OR (p.goles_local_pred = p.goles_visitante_pred
          AND NEW.goles_local = NEW.goles_visitante)
    THEN 1
    ELSE 0
  END
  WHERE p.partido_id = NEW.id;

  INSERT INTO quiniela_ranking (user_id, jornada, puntos_total, exactos)
  SELECT
    p.user_id,
    NEW.jornada,
    SUM(p.puntos_ganados),
    COUNT(CASE WHEN p.puntos_ganados = 3 THEN 1 END)
  FROM quiniela_predicciones p
  JOIN quiniela_partidos pa ON pa.id = p.partido_id
  WHERE pa.jornada = NEW.jornada
    AND p.quiniela_extra_id IS NULL
  GROUP BY p.user_id
  ON CONFLICT (user_id, jornada)
  DO UPDATE SET
    puntos_total = EXCLUDED.puntos_total,
    exactos = EXCLUDED.exactos,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Corregir get_ranking_general para filtrar quinielas extra
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

-- 3. Recalcular quiniela_ranking con datos correctos (solo quiniela principal)
UPDATE quiniela_ranking r
SET
  puntos_total = (
    SELECT COALESCE(SUM(pred.puntos_ganados), 0)
    FROM quiniela_predicciones pred
    JOIN quiniela_partidos pa ON pa.id = pred.partido_id
    WHERE pred.user_id = r.user_id
      AND pa.jornada = r.jornada
      AND pred.quiniela_extra_id IS NULL
  ),
  exactos = (
    SELECT COUNT(*)
    FROM quiniela_predicciones pred
    JOIN quiniela_partidos pa ON pa.id = pred.partido_id
    WHERE pred.user_id = r.user_id
      AND pa.jornada = r.jornada
      AND pred.quiniela_extra_id IS NULL
      AND pred.puntos_ganados = 3
  ),
  updated_at = NOW();
