-- Política para que admin pueda borrar participaciones
CREATE POLICY "admin_elimina_participaciones"
ON quiniela_participaciones FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Política para que admin pueda borrar predicciones
CREATE POLICY "admin_elimina_predicciones"
ON quiniela_predicciones FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM quiniela_jugadores
    WHERE id = auth.uid() AND rol = 'admin'
  )
);
