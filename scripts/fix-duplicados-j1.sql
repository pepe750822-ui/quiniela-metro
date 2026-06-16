-- Eliminar duplicados dejando solo el más reciente:
DELETE FROM quiniela_predicciones a
USING quiniela_predicciones b
WHERE a.user_id = b.user_id
AND a.partido_id = b.partido_id
AND (a.quiniela_extra_id = b.quiniela_extra_id
  OR (a.quiniela_extra_id IS NULL AND b.quiniela_extra_id IS NULL))
AND a.created_at < b.created_at
AND a.partido_id IN (
  SELECT id FROM quiniela_partidos WHERE jornada = 1
);
