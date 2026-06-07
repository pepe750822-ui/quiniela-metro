-- Otorgar rol de admin a un jugador existente
-- Cambiar correo@gmail.com por el correo del compañero que será admin
UPDATE quiniela_jugadores
SET rol = 'admin'
WHERE email = 'correo@gmail.com';
