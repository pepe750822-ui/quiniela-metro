-- ============================================================
-- Limpieza de participaciones FANTASMA de J15
--
-- Borra SOLO participaciones de J15 que:
--   * tienen pagado = false, y
--   * NO tienen ningún pronóstico en J15 (misma quiniela/extra).
--
-- No borra participaciones pagadas.
-- No borra participaciones con al menos 1 pronóstico.
-- No toca J14.
--
-- Correr en el Supabase SQL Editor.
-- ============================================================

-- 1) PRIMERO: ver cuáles se van a borrar.
SELECT
  p.id,
  p.user_id,
  j.nombre,
  j.apodo,
  p.jornada,
  p.pagado,
  p.publicado,
  p.quiniela_extra_id,
  p.created_at
FROM quiniela_participaciones p
LEFT JOIN quiniela_jugadores j ON j.id = p.user_id
WHERE p.temporada = 'ligamx2026'
  AND p.jornada = 15
  AND p.pagado = false
  AND NOT EXISTS (
    SELECT 1
    FROM quiniela_predicciones pred
    JOIN quiniela_partidos pa ON pa.id = pred.partido_id
    WHERE pred.user_id = p.user_id
      AND pa.temporada = 'ligamx2026'
      AND pa.jornada = 15
      AND pred.quiniela_extra_id IS NOT DISTINCT FROM p.quiniela_extra_id
  )
ORDER BY p.created_at;

-- 2) DESPUÉS: borrar exactamente esas participaciones.
DELETE FROM quiniela_participaciones p
WHERE p.temporada = 'ligamx2026'
  AND p.jornada = 15
  AND p.pagado = false
  AND NOT EXISTS (
    SELECT 1
    FROM quiniela_predicciones pred
    JOIN quiniela_partidos pa ON pa.id = pred.partido_id
    WHERE pred.user_id = p.user_id
      AND pa.temporada = 'ligamx2026'
      AND pa.jornada = 15
      AND pred.quiniela_extra_id IS NOT DISTINCT FROM p.quiniela_extra_id
  );

-- 3) Verificación: deben quedar 0 fantasmas.
SELECT COUNT(*) AS fantasmas_restantes
FROM quiniela_participaciones p
WHERE p.temporada = 'ligamx2026'
  AND p.jornada = 15
  AND p.pagado = false
  AND NOT EXISTS (
    SELECT 1
    FROM quiniela_predicciones pred
    JOIN quiniela_partidos pa ON pa.id = pred.partido_id
    WHERE pred.user_id = p.user_id
      AND pa.temporada = 'ligamx2026'
      AND pa.jornada = 15
      AND pred.quiniela_extra_id IS NOT DISTINCT FROM p.quiniela_extra_id
  );

-- 4) Participaciones reales que quedan en J15.
SELECT
  p.id,
  j.nombre,
  j.apodo,
  p.pagado,
  p.publicado,
  p.quiniela_extra_id,
  p.created_at
FROM quiniela_participaciones p
LEFT JOIN quiniela_jugadores j ON j.id = p.user_id
WHERE p.temporada = 'ligamx2026'
  AND p.jornada = 15
ORDER BY p.created_at;
