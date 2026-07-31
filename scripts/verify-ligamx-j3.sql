-- Verificar partidos Liga MX Jornada 3 (interna j=1, temporada ligamx2026)
-- Ejecutar en Supabase SQL Editor para ver fechas y corregirlas si aplica
-- México en agosto usa CDT = UTC-5

SELECT
  id,
  equipo_local || ' vs ' || equipo_visitante                       AS partido,
  fecha_hora                                                        AS fecha_utc,
  (fecha_hora AT TIME ZONE 'America/Mexico_City')::text            AS hora_cdmx
FROM quiniela_partidos
WHERE temporada = 'ligamx2026'
  AND jornada = 1
ORDER BY fecha_hora;

-- Ejemplo de corrección si una fecha está mal (ajustar hora_cdmx a la real):
-- UPDATE quiniela_partidos
-- SET fecha_hora = '2026-08-01 21:05:00-05'  -- 21:05 CDMX = 02:05 UTC sáb
-- WHERE id = '<id-del-partido>';
