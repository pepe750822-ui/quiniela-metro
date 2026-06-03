-- Agrega columna last_seen a quiniela_jugadores
-- Ejecutar en Supabase SQL Editor (proyecto tmvbmmkmisfdghqswsma)

ALTER TABLE quiniela_jugadores
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
