-- ============================================================
-- Quiniela Metro — Mundial 2026
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- TABLAS

CREATE TABLE IF NOT EXISTS quiniela_partidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jornada INTEGER NOT NULL,
  grupo TEXT,
  equipo_local TEXT NOT NULL,
  equipo_visitante TEXT NOT NULL,
  bandera_local TEXT,
  bandera_visitante TEXT,
  goles_local INTEGER,
  goles_visitante INTEGER,
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','en_curso','finalizado'))
);

CREATE TABLE IF NOT EXISTS quiniela_predicciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partido_id UUID REFERENCES quiniela_partidos(id),
  goles_local_pred INTEGER NOT NULL CHECK (goles_local_pred >= 0),
  goles_visitante_pred INTEGER NOT NULL CHECK (goles_visitante_pred >= 0),
  puntos_ganados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, partido_id)
);

CREATE TABLE IF NOT EXISTS quiniela_jugadores (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT DEFAULT 'jugador'
    CHECK (rol IN ('jugador','admin')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiniela_ranking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  jornada INTEGER,
  puntos_total INTEGER DEFAULT 0,
  exactos INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, jornada)
);

-- ============================================================
-- FUNCIÓN Y TRIGGER DE PUNTUACIÓN AUTOMÁTICA
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_puntos_quiniela()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quiniela_predicciones p
  SET puntos_ganados = CASE
    WHEN p.goles_local_pred = NEW.goles_local
     AND p.goles_visitante_pred = NEW.goles_visitante
    THEN 3
    WHEN (p.goles_local_pred > p.goles_visitante_pred
          AND NEW.goles_local > NEW.goles_visitante)
      OR (p.goles_local_pred < p.goles_visitante_pred
          AND NEW.goles_local < NEW.goles_visitante)
      OR (p.goles_local_pred = p.goles_visitante_pred
          AND NEW.goles_local = NEW.goles_visitante)
    THEN 1
    ELSE 0
  END
  WHERE p.partido_id = NEW.id;

  INSERT INTO quiniela_ranking (user_id, jornada, puntos_total, exactos)
  SELECT
    p.user_id,
    NEW.jornada,
    SUM(p.puntos_ganados),
    COUNT(CASE WHEN p.puntos_ganados = 3 THEN 1 END)
  FROM quiniela_predicciones p
  JOIN quiniela_partidos pa ON pa.id = p.partido_id
  WHERE pa.jornada = NEW.jornada
    AND p.quiniela_extra_id IS NULL
  GROUP BY p.user_id
  ON CONFLICT (user_id, jornada)
  DO UPDATE SET
    puntos_total = EXCLUDED.puntos_total,
    exactos = EXCLUDED.exactos,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_puntos
AFTER UPDATE OF goles_local, goles_visitante
ON quiniela_partidos
FOR EACH ROW EXECUTE FUNCTION calcular_puntos_quiniela();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE quiniela_predicciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiniela_partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiniela_ranking ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiniela_jugadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_ven_partidos"
  ON quiniela_partidos FOR SELECT USING (true);

CREATE POLICY "ver_predicciones"
  ON quiniela_predicciones FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM quiniela_participaciones p
      WHERE p.user_id = quiniela_predicciones.user_id
        AND p.jornada = (
          SELECT jornada FROM quiniela_partidos
          WHERE id = quiniela_predicciones.partido_id
        )
        AND p.publicado = true
        AND p.quiniela_extra_id IS NOT DISTINCT FROM quiniela_predicciones.quiniela_extra_id
    )
  );

CREATE POLICY "insertar_prediccion"
  ON quiniela_predicciones FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM quiniela_partidos p
      WHERE p.id = partido_id
        AND p.fecha_hora > NOW() + INTERVAL '15 minutes'
    )
  );

CREATE POLICY "actualizar_prediccion"
  ON quiniela_predicciones FOR UPDATE
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM quiniela_partidos p
      WHERE p.id = partido_id
        AND p.fecha_hora > NOW() + INTERVAL '15 minutes'
    )
  );

CREATE POLICY "todos_ven_ranking"
  ON quiniela_ranking FOR SELECT USING (true);

CREATE POLICY "todos_ven_jugadores"
  ON quiniela_jugadores FOR SELECT USING (true);

CREATE POLICY "jugador_crea_perfil"
  ON quiniela_jugadores FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_update_partidos"
  ON quiniela_partidos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quiniela_jugadores
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- ============================================================
-- PARTIDOS — FASE DE GRUPOS MUNDIAL 2026
-- 12 Grupos (A–L) · 4 equipos por grupo · Jornadas 1 y 2
-- Horarios en America/Mexico_City (UTC-5)
-- ============================================================

INSERT INTO quiniela_partidos (jornada, grupo, equipo_local, equipo_visitante, bandera_local, bandera_visitante, fecha_hora) VALUES

-- ── JORNADA 1 ────────────────────────────────────────────

-- Grupo A
(1, 'A', 'México',        'Polonia',        '🇲🇽', '🇵🇱', '2026-06-11 19:00:00-05'),
(1, 'A', 'Arabia Saudita','Costa de Marfil','🇸🇦', '🇨🇮', '2026-06-12 10:00:00-05'),

-- Grupo B
(1, 'B', 'Estados Unidos','Dinamarca',      '🇺🇸', '🇩🇰', '2026-06-12 13:00:00-05'),
(1, 'B', 'Irán',          'Camerún',        '🇮🇷', '🇨🇲', '2026-06-12 16:00:00-05'),

-- Grupo C
(1, 'C', 'Canadá',        'Suiza',          '🇨🇦', '🇨🇭', '2026-06-13 10:00:00-05'),
(1, 'C', 'Australia',     'Senegal',        '🇦🇺', '🇸🇳', '2026-06-13 13:00:00-05'),

-- Grupo D
(1, 'D', 'España',        'Argentina',      '🇪🇸', '🇦🇷', '2026-06-13 16:00:00-05'),
(1, 'D', 'Japón',         'Nigeria',        '🇯🇵', '🇳🇬', '2026-06-13 19:00:00-05'),

-- Grupo E
(1, 'E', 'Francia',       'Brasil',         '🇫🇷', '🇧🇷', '2026-06-14 10:00:00-05'),
(1, 'E', 'Corea del Sur', 'Marruecos',      '🇰🇷', '🇲🇦', '2026-06-14 13:00:00-05'),

-- Grupo F
(1, 'F', 'Alemania',      'Uruguay',        '🇩🇪', '🇺🇾', '2026-06-14 16:00:00-05'),
(1, 'F', 'Qatar',         'Túnez',          '🇶🇦', '🇹🇳', '2026-06-14 19:00:00-05'),

-- Grupo G
(1, 'G', 'Inglaterra',    'Colombia',       '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇨🇴', '2026-06-15 10:00:00-05'),
(1, 'G', 'Irak',          'Ghana',          '🇮🇶', '🇬🇭', '2026-06-15 13:00:00-05'),

-- Grupo H
(1, 'H', 'Portugal',      'Ecuador',        '🇵🇹', '🇪🇨', '2026-06-15 16:00:00-05'),
(1, 'H', 'Jordania',      'Argelia',        '🇯🇴', '🇩🇿', '2026-06-15 19:00:00-05'),

-- Grupo I
(1, 'I', 'Países Bajos',  'Chile',          '🇳🇱', '🇨🇱', '2026-06-16 10:00:00-05'),
(1, 'I', 'Serbia',        'Egipto',         '🇷🇸', '🇪🇬', '2026-06-16 13:00:00-05'),

-- Grupo J
(1, 'J', 'Bélgica',       'Panamá',         '🇧🇪', '🇵🇦', '2026-06-16 16:00:00-05'),
(1, 'J', 'Croacia',       'Nueva Zelanda',  '🇭🇷', '🇳🇿', '2026-06-16 19:00:00-05'),

-- Grupo K
(1, 'K', 'Austria',       'Honduras',       '🇦🇹', '🇭🇳', '2026-06-17 10:00:00-05'),
(1, 'K', 'Italia',        'Escocia',        '🇮🇹', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-17 13:00:00-05'),

-- Grupo L
(1, 'L', 'Turquía',       'Costa Rica',     '🇹🇷', '🇨🇷', '2026-06-17 16:00:00-05'),
(1, 'L', 'Ucrania',       'Venezuela',      '🇺🇦', '🇻🇪', '2026-06-17 19:00:00-05'),

-- ── JORNADA 2 ────────────────────────────────────────────

-- Grupo A
(2, 'A', 'México',        'Arabia Saudita', '🇲🇽', '🇸🇦', '2026-06-18 10:00:00-05'),
(2, 'A', 'Polonia',       'Costa de Marfil','🇵🇱', '🇨🇮', '2026-06-18 10:00:00-05'),

-- Grupo B
(2, 'B', 'Estados Unidos','Irán',           '🇺🇸', '🇮🇷', '2026-06-18 13:00:00-05'),
(2, 'B', 'Dinamarca',     'Camerún',        '🇩🇰', '🇨🇲', '2026-06-18 13:00:00-05'),

-- Grupo C
(2, 'C', 'Canadá',        'Australia',      '🇨🇦', '🇦🇺', '2026-06-19 10:00:00-05'),
(2, 'C', 'Suiza',         'Senegal',        '🇨🇭', '🇸🇳', '2026-06-19 10:00:00-05'),

-- Grupo D
(2, 'D', 'España',        'Japón',          '🇪🇸', '🇯🇵', '2026-06-19 13:00:00-05'),
(2, 'D', 'Argentina',     'Nigeria',        '🇦🇷', '🇳🇬', '2026-06-19 13:00:00-05'),

-- Grupo E
(2, 'E', 'Francia',       'Corea del Sur',  '🇫🇷', '🇰🇷', '2026-06-20 10:00:00-05'),
(2, 'E', 'Brasil',        'Marruecos',      '🇧🇷', '🇲🇦', '2026-06-20 10:00:00-05'),

-- Grupo F
(2, 'F', 'Alemania',      'Qatar',          '🇩🇪', '🇶🇦', '2026-06-20 13:00:00-05'),
(2, 'F', 'Uruguay',       'Túnez',          '🇺🇾', '🇹🇳', '2026-06-20 13:00:00-05'),

-- Grupo G
(2, 'G', 'Inglaterra',    'Irak',           '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇮🇶', '2026-06-21 10:00:00-05'),
(2, 'G', 'Colombia',      'Ghana',          '🇨🇴', '🇬🇭', '2026-06-21 10:00:00-05'),

-- Grupo H
(2, 'H', 'Portugal',      'Jordania',       '🇵🇹', '🇯🇴', '2026-06-21 13:00:00-05'),
(2, 'H', 'Ecuador',       'Argelia',        '🇪🇨', '🇩🇿', '2026-06-21 13:00:00-05'),

-- Grupo I
(2, 'I', 'Países Bajos',  'Serbia',         '🇳🇱', '🇷🇸', '2026-06-22 10:00:00-05'),
(2, 'I', 'Chile',         'Egipto',         '🇨🇱', '🇪🇬', '2026-06-22 10:00:00-05'),

-- Grupo J
(2, 'J', 'Bélgica',       'Croacia',        '🇧🇪', '🇭🇷', '2026-06-22 13:00:00-05'),
(2, 'J', 'Panamá',        'Nueva Zelanda',  '🇵🇦', '🇳🇿', '2026-06-22 13:00:00-05'),

-- Grupo K
(2, 'K', 'Austria',       'Italia',         '🇦🇹', '🇮🇹', '2026-06-22 16:00:00-05'),
(2, 'K', 'Honduras',      'Escocia',        '🇭🇳', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-22 16:00:00-05'),

-- Grupo L
(2, 'L', 'Turquía',       'Ucrania',        '🇹🇷', '🇺🇦', '2026-06-22 19:00:00-05'),
(2, 'L', 'Costa Rica',    'Venezuela',      '🇨🇷', '🇻🇪', '2026-06-22 19:00:00-05');
