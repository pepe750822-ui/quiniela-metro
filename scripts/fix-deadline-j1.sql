-- fix-deadline-j1.sql
-- Deadline Jornada 1: miércoles 10 de junio 11:59 p.m. CDMX = 2026-06-11T05:59:00Z (UTC)
--
-- No existe RLS de fecha en la tabla predicciones_normales.
-- El bloqueo de edición es responsabilidad del frontend:
--   - Cada partido se bloquea automáticamente cuando su fecha_hora llega.
--   - El texto informativo en /instrucciones muestra la fecha límite.
--
-- Verificación: confirmar que ningún partido de J1 tiene fecha_hora
-- anterior al deadline correcto (2026-06-11T05:59:00Z).

SELECT
  id,
  jornada,
  local,
  visitante,
  fecha_hora,
  fecha_hora AT TIME ZONE 'America/Mexico_City' AS fecha_hora_cdmx
FROM quiniela_partidos
WHERE jornada = 1
ORDER BY fecha_hora;

-- Si algún partido aparece antes de 2026-06-11 06:00 UTC,
-- la lógica del frontend lo bloqueará antes del deadline.
-- No se requiere cambio de RLS.
