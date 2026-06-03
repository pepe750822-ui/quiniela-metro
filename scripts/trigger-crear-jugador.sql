-- Trigger: crear fila en quiniela_jugadores al registrar usuario en auth.users
-- Ejecutar en: Supabase SQL Editor (proyecto tmvbmmkmisfdghqswsma)

CREATE OR REPLACE FUNCTION crear_jugador_quiniela()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO quiniela_jugadores (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             split_part(NEW.email, '@', 1)),
    NEW.email,
    'jugador'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_crear_jugador
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION crear_jugador_quiniela();
