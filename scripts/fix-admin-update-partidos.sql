-- ============================================================
-- FIX: Política RLS para que admin pueda actualizar partidos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Verificar políticas actuales en quiniela_partidos
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'quiniela_partidos';

-- Recrear política de UPDATE para admin
DROP POLICY IF EXISTS "admin_update_partidos" ON quiniela_partidos;

CREATE POLICY "admin_update_partidos"
ON quiniela_partidos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Verificar que quedó correctamente
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'quiniela_partidos';
