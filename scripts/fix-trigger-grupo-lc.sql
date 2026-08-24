-- Fix: calcular_puntos_quiniela detecta Leagues Cup por grupo = 'LC'
-- O por rango de fechas (compatibilidad con partidos ya ingresados sin grupo).
-- Correr UNA VEZ en el Supabase SQL Editor.

CREATE OR REPLACE FUNCTION calcular_puntos_quiniela()
RETURNS TRIGGER AS $$
DECLARE
  es_leagues_cup BOOLEAN;
BEGIN
  es_leagues_cup := (
    NEW.grupo = 'LC' OR (
      NEW.fecha_hora >= '2026-08-04 00:00:00+00' AND
      NEW.fecha_hora <= '2026-08-14 06:00:00+00'
    )
  );

  UPDATE quiniela_predicciones p
  SET puntos_ganados =
    -- Puntos por marcador
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
    -- Bonus: clasificado correcto (solo Leagues Cup)
    + CASE
        WHEN es_leagues_cup
         AND NEW.clasificado IS NOT NULL
         AND p.clasificado_pred = NEW.clasificado
        THEN 1 ELSE 0
      END
    -- Bonus: cómo termina correcto (solo Leagues Cup)
    + CASE
        WHEN es_leagues_cup
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verificar:
SELECT prosecdef, proname FROM pg_proc WHERE proname = 'calcular_puntos_quiniela';
