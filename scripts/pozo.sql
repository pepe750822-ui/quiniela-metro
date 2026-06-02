-- Idempotente: agregar créditos si aún no existe
ALTER TABLE quiniela_jugadores
ADD COLUMN IF NOT EXISTS creditos INTEGER DEFAULT 0;

-- Pozo acumulado por jornada
CREATE TABLE IF NOT EXISTS quiniela_pozo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jornada INTEGER NOT NULL UNIQUE,
  total_mxn INTEGER DEFAULT 0,
  participantes INTEGER DEFAULT 0,
  ganador_id UUID REFERENCES auth.users(id),
  ganador_nombre TEXT,
  estado TEXT DEFAULT 'abierto'
    CHECK (estado IN ('abierto','cerrado','pagado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participaciones por jornada (una por usuario)
CREATE TABLE IF NOT EXISTS quiniela_participaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  jornada INTEGER NOT NULL,
  pagado BOOLEAN DEFAULT false,
  monto INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, jornada)
);

ALTER TABLE quiniela_pozo ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiniela_participaciones ENABLE ROW LEVEL SECURITY;

-- Pozo: todos pueden ver
CREATE POLICY "todos_ven_pozo"
ON quiniela_pozo FOR SELECT USING (true);

-- Admin puede actualizar el pozo
CREATE POLICY "admin_update_pozo"
ON quiniela_pozo FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Participaciones: el usuario ve las suyas
CREATE POLICY "usuario_ve_sus_participaciones"
ON quiniela_participaciones FOR SELECT
USING (auth.uid() = user_id);

-- Participaciones: todos ven (para admin y pozo widget)
CREATE POLICY "todos_ven_participaciones"
ON quiniela_participaciones FOR SELECT
USING (true);

-- Usuario puede insertar su propia participación pendiente
CREATE POLICY "usuario_inserta_participacion"
ON quiniela_participaciones FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admin puede actualizar participaciones (confirmar pago)
CREATE POLICY "admin_update_participaciones"
ON quiniela_participaciones FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Inicializar pozo para las 3 jornadas
INSERT INTO quiniela_pozo (jornada, total_mxn, participantes)
VALUES (1, 0, 0), (2, 0, 0), (3, 0, 0)
ON CONFLICT (jornada) DO NOTHING;
