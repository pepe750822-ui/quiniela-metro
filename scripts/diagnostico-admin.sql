-- Verificar rol del usuario admin
SELECT id, nombre, email, rol
FROM quiniela_jugadores
WHERE email = 'pepe750822@gmail.com';

-- Si el rol NO es 'admin', corregirlo con:
-- UPDATE quiniela_jugadores SET rol = 'admin' WHERE email = 'pepe750822@gmail.com';
