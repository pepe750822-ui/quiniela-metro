-- Knockout scoring: columnas nuevas y trigger actualizado para J5+
-- Correr UNA VEZ en el SQL Editor de Supabase.

-- 1. Agregar columnas a predicciones
ALTER TABLE quiniela_predicciones
  ADD COLUMN IF NOT EXISTS clasificado_pred TEXT,
  ADD COLUMN IF NOT EXISTS como_termina_pred TEXT;

-- 2. Agregar columnas a partidos
ALTER TABLE quiniela_partidos
  ADD COLUMN IF NOT EXISTS clasificado TEXT,
  ADD COLUMN IF NOT EXISTS como_termino TEXT;

-- 3. Reemplazar función con lógica de bonus para jornada >= 5
CREATE OR REPLACE FUNCTION calcular_puntos_quiniela()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quiniela_predicciones p
  SET puntos_ganados =
    -- Puntos por marcador (sin cambios respecto a versión anterior)
    CASE
      WHEN p.goles_local_pred  = NEW.goles_local
       AND p.goles_visitante_pred = NEW.goles_visitante
      THEN 3
      WHEN (p.goles_local_pred > p.goles_visitante_pred  AND NEW.goles_local > NEW.goles_visitante)
        OR (p.goles_local_pred < p.goles_visitante_pred  AND NEW.goles_local < NEW.goles_visitante)
        OR (p.goles_local_pred = p.goles_visitante_pred  AND NEW.goles_local = NEW.goles_visitante)
      THEN 1
      ELSE 0
    END
    -- Bonus: clasificado correcto (solo J5+)
    + CASE
        WHEN NEW.jornada >= 5
         AND NEW.clasificado IS NOT NULL
         AND p.clasificado_pred = NEW.clasificado
        THEN 1 ELSE 0
      END
    -- Bonus: cómo termina correcto (solo J5+)
    + CASE
        WHEN NEW.jornada >= 5
         AND NEW.como_termino IS NOT NULL
         AND p.como_termina_pred = NEW.como_termino
        THEN 1 ELSE 0
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
    exactos      = EXCLUDED.exactos,
    updated_at   = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recrear trigger para que también dispare al actualizar clasificado / como_termino
DROP TRIGGER IF EXISTS trigger_calcular_puntos ON quiniela_partidos;
CREATE TRIGGER trigger_calcular_puntos
  AFTER UPDATE OF goles_local, goles_visitante, clasificado, como_termino
  ON quiniela_partidos
  FOR EACH ROW EXECUTE FUNCTION calcular_puntos_quiniela();
