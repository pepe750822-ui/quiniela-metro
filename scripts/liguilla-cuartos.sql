-- ============================================================
-- ⚠️ ESTE ES EL ARCHIVO SQL PARA SUPABASE.
-- NO ejecutes liguilla-cuartos.patch: ese es un diff de código
-- (empieza con "--- a/..." y "+++ b/..."), no es SQL.
-- ============================================================
-- Liguilla Apertura 2026 — Cuartos de Final
--
-- Champions (J15) + Liguilla son UNA sola jornada/competencia:
--   * Los 8 partidos de Liguilla viven en J15 (grupo = 'LIGUILLA').
--   * Una sola participación (J15).
--   * Un solo pozo combinado (J15), $50 por jugador.
--   * El ranking de J15 suma Champions + Liguilla.
--
-- No existe J16.
--
-- Reglas de puntos de la Liguilla:
--   * Ida: solo marcador (3 exacto / 1 resultado / 0).
--   * Vuelta: marcador + campo "¿Quién pasa a semifinales?"
--     (+2 si acierta al equipo que avanza). Máximo 5.
--
-- Correr UNA VEZ en el Supabase SQL Editor.
-- ============================================================

-- 1. Columna para marcar los partidos de vuelta de una eliminatoria.
ALTER TABLE quiniela_partidos
  ADD COLUMN IF NOT EXISTS es_vuelta BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Trigger de puntuación con el bono de +2 para la vuelta de Liguilla.
--    Se conserva el comportamiento anterior para Leagues Cup / J5+.
CREATE OR REPLACE FUNCTION calcular_puntos_quiniela()
RETURNS TRIGGER AS $$
DECLARE
  es_leagues_cup BOOLEAN;
  es_liguilla    BOOLEAN;
  es_vuelta_lig  BOOLEAN;
BEGIN
  es_leagues_cup := (
    NEW.grupo = 'LC' OR (
      NEW.fecha_hora >= '2026-08-04 00:00:00+00' AND
      NEW.fecha_hora <= '2026-08-14 06:00:00+00'
    )
  );
  es_liguilla   := COALESCE(NEW.grupo = 'LIGUILLA', false);
  es_vuelta_lig := es_liguilla AND COALESCE(NEW.es_vuelta, false);

  UPDATE quiniela_predicciones p
  SET puntos_ganados =
    -- Puntos por marcador (sin cambios)
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
    -- Bonus Liguilla: +2 por acertar quién pasa (solo vuelta)
    + CASE
        WHEN es_vuelta_lig
         AND NEW.clasificado IS NOT NULL
         AND p.clasificado_pred = NEW.clasificado
        THEN 2
        -- Bonus anterior: +1 por clasificado (Leagues Cup / J5+)
        WHEN NOT es_liguilla
         AND (es_leagues_cup OR NEW.jornada >= 5)
         AND NEW.clasificado IS NOT NULL
         AND p.clasificado_pred = NEW.clasificado
        THEN 1
        ELSE 0
      END
    -- Bonus anterior: +1 por cómo termina (Leagues Cup / J5+)
    + CASE
        WHEN NOT es_liguilla
         AND (es_leagues_cup OR NEW.jornada >= 5)
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
    -- Exactos por marcador (aunque el partido tenga bonus de pase).
    COUNT(CASE WHEN p.goles_local_pred = pa.goles_local
                AND p.goles_visitante_pred = pa.goles_visitante THEN 1 END)
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

-- 3. El trigger debe disparar también al corregir "quién pasa".
DROP TRIGGER IF EXISTS trigger_calcular_puntos ON quiniela_partidos;
CREATE TRIGGER trigger_calcular_puntos
  AFTER UPDATE OF goles_local, goles_visitante, clasificado, como_termino
  ON quiniela_partidos
  FOR EACH ROW EXECUTE FUNCTION calcular_puntos_quiniela();

-- 4. Los 8 partidos de Cuartos de Final (ida y vuelta), dentro de J15.
--    Días oficiales: ida 25/26 nov, vuelta 28/29 nov 2026.
--    Los horarios son provisionales: la Liga MX dará a conocer
--    los horarios el lunes 23 de noviembre. Se pueden editar desde /admin.
--    Orden de localía: el equipo mejor sembrado cierra de local.

-- Si la versión anterior los creó como J16, moverlos a J15 conservando
-- el id y los pronósticos ya capturados.
UPDATE quiniela_partidos
SET jornada = 15
WHERE temporada = 'ligamx2026'
  AND jornada = 16
  AND grupo = 'LIGUILLA';

INSERT INTO quiniela_partidos
  (jornada, grupo, equipo_local, equipo_visitante, bandera_local,
   bandera_visitante, fecha_hora, estado, temporada, es_vuelta)
SELECT v.jornada, v.grupo, v.equipo_local, v.equipo_visitante,
       v.bandera_local, v.bandera_visitante, v.fecha_hora, v.estado,
       v.temporada, v.es_vuelta
FROM (VALUES
  -- Ida — miércoles 25 de noviembre
  (15, 'LIGUILLA', 'Pachuca',   'Guadalajara', NULL::text, NULL::text, '2026-11-25 19:00:00-06'::timestamptz, 'pendiente', 'ligamx2026', false),
  (15, 'LIGUILLA', 'León',      'Cruz Azul',   NULL::text, NULL::text, '2026-11-25 21:15:00-06'::timestamptz, 'pendiente', 'ligamx2026', false),
  -- Ida — jueves 26 de noviembre
  (15, 'LIGUILLA', 'Monterrey', 'América',     NULL::text, NULL::text, '2026-11-26 19:00:00-06'::timestamptz, 'pendiente', 'ligamx2026', false),
  (15, 'LIGUILLA', 'Toluca',    'Atlas',       NULL::text, NULL::text, '2026-11-26 21:15:00-06'::timestamptz, 'pendiente', 'ligamx2026', false),
  -- Vuelta — sábado 28 de noviembre
  (15, 'LIGUILLA', 'Guadalajara', 'Pachuca',   NULL::text, NULL::text, '2026-11-28 19:00:00-06'::timestamptz, 'pendiente', 'ligamx2026', true),
  (15, 'LIGUILLA', 'Cruz Azul',   'León',      NULL::text, NULL::text, '2026-11-28 21:15:00-06'::timestamptz, 'pendiente', 'ligamx2026', true),
  -- Vuelta — domingo 29 de noviembre
  (15, 'LIGUILLA', 'América',     'Monterrey', NULL::text, NULL::text, '2026-11-29 19:00:00-06'::timestamptz, 'pendiente', 'ligamx2026', true),
  (15, 'LIGUILLA', 'Atlas',       'Toluca',    NULL::text, NULL::text, '2026-11-29 21:15:00-06'::timestamptz, 'pendiente', 'ligamx2026', true)
) AS v(jornada, grupo, equipo_local, equipo_visitante, bandera_local,
       bandera_visitante, fecha_hora, estado, temporada, es_vuelta)
WHERE NOT EXISTS (
  SELECT 1
  FROM quiniela_partidos p
  WHERE p.temporada = v.temporada
    AND p.jornada = v.jornada
    AND p.equipo_local = v.equipo_local
    AND p.equipo_visitante = v.equipo_visitante
);

-- 5. Pozo combinado Champions + Liguilla.
--    Una sola fila y un solo contador. Se queda en J15 (la base):
--    $50 por jugador; quien ya está en J15 no paga otra vez.
-- 5.1 Asegurar la fila del pozo J15.
INSERT INTO quiniela_pozo (jornada, total_mxn, participantes, estado, temporada)
SELECT 15, 0, 0, 'abierto', 'ligamx2026'
WHERE NOT EXISTS (
  SELECT 1 FROM quiniela_pozo
  WHERE jornada = 15 AND temporada = 'ligamx2026'
);

-- 5.2 Mover participaciones de J16 a J15 (quiniela principal).
INSERT INTO quiniela_participaciones
  (user_id, jornada, pagado, monto, publicado, predicciones_completas,
   quiniela_extra_id, temporada, pagado_at, created_at)
SELECT p16.user_id, 15, p16.pagado, p16.monto, p16.publicado,
       p16.predicciones_completas, NULL, p16.temporada, p16.pagado_at, p16.created_at
FROM quiniela_participaciones p16
WHERE p16.jornada = 16
  AND p16.temporada = 'ligamx2026'
  AND p16.quiniela_extra_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM quiniela_participaciones p15
    WHERE p15.user_id = p16.user_id
      AND p15.jornada = 15
      AND p15.temporada = p16.temporada
      AND p15.quiniela_extra_id IS NULL
  );

-- 5.3 Mover participaciones de J16 a J15 (quinielas extra).
INSERT INTO quiniela_participaciones
  (user_id, jornada, pagado, monto, publicado, predicciones_completas,
   quiniela_extra_id, temporada, pagado_at, created_at)
SELECT p16.user_id, 15, p16.pagado, p16.monto, p16.publicado,
       p16.predicciones_completas, p16.quiniela_extra_id, p16.temporada,
       p16.pagado_at, p16.created_at
FROM quiniela_participaciones p16
WHERE p16.jornada = 16
  AND p16.temporada = 'ligamx2026'
  AND p16.quiniela_extra_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM quiniela_participaciones p15
    WHERE p15.user_id = p16.user_id
      AND p15.jornada = 15
      AND p15.temporada = p16.temporada
      AND p15.quiniela_extra_id = p16.quiniela_extra_id
  );

-- 5.4 Si ya existía la participación de J15, conservar pago/publicación.
UPDATE quiniela_participaciones p15
SET pagado = COALESCE(p15.pagado, false) OR COALESCE(p16.pagado, false),
    publicado = COALESCE(p15.publicado, false) OR COALESCE(p16.publicado, false),
    predicciones_completas = COALESCE(p15.predicciones_completas, false)
                              OR COALESCE(p16.predicciones_completas, false),
    pagado_at = COALESCE(p15.pagado_at, p16.pagado_at)
FROM quiniela_participaciones p16
WHERE p15.jornada = 15
  AND p16.jornada = 16
  AND p15.temporada = p16.temporada
  AND p15.user_id = p16.user_id
  AND p15.quiniela_extra_id IS NOT DISTINCT FROM p16.quiniela_extra_id;

-- 5.5 Ya no debe quedar una participación separada de J16.
DELETE FROM quiniela_participaciones
WHERE jornada = 16 AND temporada = 'ligamx2026';

-- 5.6 Quitar cualquier pozo J16 que haya creado la versión anterior.
DELETE FROM quiniela_pozo
WHERE jornada = 16 AND temporada = 'ligamx2026';

-- 5.7 Recalcular el pozo combinado: $50 por participación pagada.
UPDATE quiniela_pozo pz
SET total_mxn = 50 * sub.cnt,
    participantes = sub.cnt
FROM (
  SELECT COUNT(*)::int AS cnt
  FROM quiniela_participaciones
  WHERE jornada = 15
    AND temporada = 'ligamx2026'
    AND pagado = true
) sub
WHERE pz.jornada = 15
  AND pz.temporada = 'ligamx2026'
  AND pz.estado = 'abierto';

-- 6. Verificación.
SELECT id, jornada, grupo, equipo_local, equipo_visitante, es_vuelta,
       fecha_hora, estado
FROM quiniela_partidos
WHERE temporada = 'ligamx2026' AND jornada = 15 AND grupo = 'LIGUILLA'
ORDER BY fecha_hora;
-- Deben ser 8 partidos de Liguilla dentro de J15.

SELECT COUNT(*) AS partidos_j16
FROM quiniela_partidos
WHERE temporada = 'ligamx2026' AND jornada = 16;
-- Debe ser 0: no existe J16.

SELECT jornada, total_mxn, participantes, estado
FROM quiniela_pozo
WHERE temporada = 'ligamx2026' AND jornada IN (15, 16)
ORDER BY jornada;
-- Debe quedar solo la fila 15 (combinada).

SELECT jornada, COUNT(*) AS participaciones
FROM quiniela_participaciones
WHERE temporada = 'ligamx2026' AND jornada IN (15, 16)
GROUP BY jornada
ORDER BY jornada;
-- J16 debe quedar en 0; todo se movió a J15.

SELECT prosecdef, proname
FROM pg_proc
WHERE proname = 'calcular_puntos_quiniela';
-- prosecdef = true confirma SECURITY DEFINER.
