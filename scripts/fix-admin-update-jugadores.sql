-- Política para que admin pueda actualizar
-- cualquier jugador (apodo y referencia_admin)
CREATE POLICY "admin_actualiza_jugadores"
ON quiniela_jugadores FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);
