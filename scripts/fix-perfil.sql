-- Política RLS: cada usuario puede editar su propio perfil en quiniela_jugadores
-- Ejecutar en Supabase SQL Editor si el UPDATE desde /perfil falla silenciosamente

-- 1. Verificar políticas existentes
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'quiniela_jugadores';

-- 2. Crear política de UPDATE si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiniela_jugadores'
      AND policyname = 'usuario_edita_su_perfil'
  ) THEN
    EXECUTE '
      CREATE POLICY "usuario_edita_su_perfil"
      ON quiniela_jugadores FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id)
    ';
    RAISE NOTICE 'Política usuario_edita_su_perfil creada';
  ELSE
    RAISE NOTICE 'Política usuario_edita_su_perfil ya existe';
  END IF;
END
$$;

-- 3. Verificar que RLS está habilitado en la tabla
ALTER TABLE quiniela_jugadores ENABLE ROW LEVEL SECURITY;
