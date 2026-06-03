-- Sincronizar usuarios de auth.users que no tienen registro en quiniela_jugadores
-- Ejecutar en Supabase SQL Editor cuando haya usuarios que entraron antes
-- de que el callback auto-creara el perfil.

INSERT INTO quiniela_jugadores (id, nombre, email, rol)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name',
           email_confirmed_at::text,
           email),
  email,
  'jugador'
FROM auth.users
WHERE id NOT IN (SELECT id FROM quiniela_jugadores);
