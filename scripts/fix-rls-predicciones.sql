-- ============================================================
-- FIX: Política RLS de quiniela_predicciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- PASO 1 — Verificar política actual
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'quiniela_predicciones';

-- PASO 2 — Reemplazar política de lectura
DROP POLICY IF EXISTS "ver_predicciones" ON quiniela_predicciones;

CREATE POLICY "ver_predicciones"
ON quiniela_predicciones FOR SELECT
USING (
  -- Siempre puedes ver las tuyas
  auth.uid() = user_id
  OR
  -- Puedes ver las de otro si su participación está marcada como publicado=true
  -- (y coincide la quiniela extra, manejando NULL correctamente)
  EXISTS (
    SELECT 1 FROM quiniela_participaciones p
    WHERE p.user_id = quiniela_predicciones.user_id
      AND p.jornada = (
        SELECT jornada FROM quiniela_partidos
        WHERE id = quiniela_predicciones.partido_id
      )
      AND p.publicado = true
      AND p.quiniela_extra_id IS NOT DISTINCT FROM quiniela_predicciones.quiniela_extra_id
  )
);

-- PASO 3 — Verificar que la nueva política quedó bien
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'quiniela_predicciones';
