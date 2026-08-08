-- Crear participaciones de J3 copiando de J1 (solo pagado=true)
INSERT INTO quiniela_participaciones (user_id, jornada, pagado, predicciones_completas, temporada, quiniela_extra_id)
SELECT user_id, 3, pagado, false, temporada, quiniela_extra_id
FROM quiniela_participaciones
WHERE jornada = 1
  AND temporada = 'ligamx2026'
  AND pagado = true
ON CONFLICT DO NOTHING;

-- Crear pozo J3 copiando de J1
INSERT INTO quiniela_pozo (jornada, total_mxn, participantes, estado, temporada)
SELECT 3, total_mxn, participantes, 'abierto', temporada
FROM quiniela_pozo
WHERE jornada = 1
  AND temporada = 'ligamx2026'
ON CONFLICT DO NOTHING;
