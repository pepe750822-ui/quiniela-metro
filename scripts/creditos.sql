-- Agregar columna créditos a jugadores
ALTER TABLE quiniela_jugadores
ADD COLUMN IF NOT EXISTS creditos INTEGER DEFAULT 0;

-- Tabla de pagos/créditos asignados por admin
CREATE TABLE IF NOT EXISTS quiniela_pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  creditos INTEGER NOT NULL,
  monto INTEGER NOT NULL,
  concepto TEXT,
  activado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE quiniela_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ve_pagos"
ON quiniela_pagos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

CREATE POLICY "usuario_ve_sus_pagos"
ON quiniela_pagos FOR SELECT
USING (auth.uid() = user_id);

-- Admin puede insertar pagos
CREATE POLICY "admin_inserta_pagos"
ON quiniela_pagos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);
