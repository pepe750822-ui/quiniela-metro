-- Trigger: crear fila en quiniela_jugadores al registrar usuario en auth.users
-- Ejecutar en: Supabase SQL Editor (proyecto tmvbmmkmisfdghqswsma)

CREATE OR REPLACE FUNCTION public.crear_jugador_quiniela()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.quiniela_jugadores (id, nombre, email, rol)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_crear_jugador
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.crear_jugador_quiniela();
