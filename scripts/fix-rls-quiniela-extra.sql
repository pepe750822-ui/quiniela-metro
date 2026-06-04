-- ============================================================
-- FIX: Permitir que todos los usuarios autenticados vean
-- los nombres de quinielas extra (necesario para mostrarlos
-- en /jornada/[id] y en la clasificación de /)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Agregar política de lectura pública para quinielas extra
-- (los nombres son información pública una vez que el usuario participa)
DROP POLICY IF EXISTS "todos_ven_quinielas" ON quiniela_extra;

CREATE POLICY "todos_ven_quinielas"
ON quiniela_extra FOR SELECT
USING (auth.role() = 'authenticated');

-- Verificar políticas resultantes
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'quiniela_extra';
