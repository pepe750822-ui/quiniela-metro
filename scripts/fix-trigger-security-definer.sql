-- ============================================================
-- FIX: calcular_puntos_quiniela con SECURITY DEFINER
--
-- Problema: la función corría como SECURITY INVOKER (default),
-- lo que activaba RLS al ejecutarse desde la app.
-- La policy "actualizar_prediccion" bloquea UPDATE cuando
-- fecha_hora ya pasó, y no hay policy de INSERT en quiniela_ranking.
-- Resultado: todos los puntos quedaban en NULL/0 al guardar
-- desde admin, pero funcionaba desde el SQL Editor (postgres bypassea RLS).
--
-- Solución: SECURITY DEFINER + SET search_path = public
-- para que la función corra con privilegios del creador (postgres)
-- y omita RLS, igual que cuando se ejecuta directo en SQL Editor.
--
-- Correr UNA VEZ en el Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_puntos_quiniela()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verificar que quedó bien:
SELECT prosecdef, proname
FROM pg_proc
WHERE proname = 'calcular_puntos_quiniela';
-- prosecdef = true confirma SECURITY DEFINER activo
