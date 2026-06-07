-- Otorgar rol de admin a un jugador existente
UPDATE quiniela_jugadores
SET rol = 'admin'
WHERE email = 'hserna2311@gmail.com';
