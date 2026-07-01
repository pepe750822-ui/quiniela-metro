export const emailCorto = (email: string) => email.split('@')[0];

export const mostrarNombre = (jugador: { nombre: string; apodo?: string | null }) =>
  jugador.apodo || jugador.nombre.split(' ')[0];

export const formatearFechaCDMX = (fechaHora: string) => {
  return new Date(fechaHora).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatearHoraCDMX = (fechaHora: string) => {
  return new Date(fechaHora).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatearDiaCDMX = (fechaHora: string) => {
  return new Date(fechaHora).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

export const getFechaCDMX = (fechaHora: string) => {
  return new Date(fechaHora).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const getNombreJornada = (j: number) => {
  if (j === 4) return 'Dieciseisavos';
  if (j === 5) return 'Octavos de final';
  if (j === 6) return 'Cuartos de final';
  if (j === 7) return 'Semifinales';
  if (j === 8) return '3er Lugar';
  if (j === 9) return 'Final';
  return `J${j}`;
};

export const getMontoJornada = (j: number) => j >= 5 ? 100 : 50;

export const getFechaKey = (fecha: string) => {
  const d = new Date(fecha);
  return d.toISOString().slice(0, 16);
};

export const equiposE32: Record<string, { local: string; visitante: string }> = {
  '2026-06-28T19:00': { local: 'Sudáfrica',      visitante: 'Canadá' },
  '2026-06-29T17:00': { local: 'Brasil',          visitante: 'Japón' },
  '2026-06-29T20:30': { local: 'Alemania',        visitante: 'Paraguay' },
  '2026-06-30T01:00': { local: 'Países Bajos',    visitante: 'Marruecos' },
  '2026-07-01T01:00': { local: 'México',          visitante: 'Ecuador' },
  '2026-07-02T00:00': { local: 'Estados Unidos',  visitante: 'Bosnia y Herzegovina' },
  '2026-07-03T03:00': { local: 'Suiza',           visitante: 'Argelia' },
  '2026-07-03T22:00': { local: 'Argentina',       visitante: 'Cabo Verde' },
};

export const BANDERAS_EQUIPOS: Record<string, string> = {
  'México': '🇲🇽',
  'España': '🇪🇸',
  'Argentina': '🇦🇷',
  'Brasil': '🇧🇷',
  'Francia': '🇫🇷',
  'Alemania': '🇩🇪',
  'Portugal': '🇵🇹',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Estados Unidos': '🇺🇸',
  'Países Bajos': '🇳🇱',
  'Uruguay': '🇺🇾',
  'Colombia': '🇨🇴',
  'Japón': '🇯🇵',
  'Marruecos': '🇲🇦',
  'Senegal': '🇸🇳',
  'Australia': '🇦🇺',
  'Suiza': '🇨🇭',
  'Croacia': '🇭🇷',
  'Ecuador': '🇪🇨',
  'Canadá': '🇨🇦',
  'Corea del Sur': '🇰🇷',
  'Ghana': '🇬🇭',
  'Túnez': '🇹🇳',
  'Polonia': '🇵🇱',
  'Dinamarca': '🇩🇰',
  'Serbia': '🇷🇸',
  'Camerún': '🇨🇲',
  'Costa Rica': '🇨🇷',
  'Arabia Saudita': '🇸🇦',
  'Turquía': '🇹🇷',
  'Noruega': '🇳🇴',
  'Suecia': '🇸🇪',
  'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Ucrania': '🇺🇦',
  'Irán': '🇮🇷',
  'Bosnia y Herzegovina': '🇧🇦',
  'Sudáfrica': '🇿🇦',
  'Chequia': '🇨🇿',
  'Rumania': '🇷🇴',
  'Bélgica': '🇧🇪',
  'Costa de Marfil': '🇨🇮',
  'Venezuela': '🇻🇪',
  'Chile': '🇨🇱',
  'Paraguay': '🇵🇾',
  'Bolivia': '🇧🇴',
  'Perú': '🇵🇪',
  'Honduras': '🇭🇳',
  'Guatemala': '🇬🇹',
  'Jamaica': '🇯🇲',
  'Haití': '🇭🇹',
  'Cuba': '🇨🇺',
  'Panamá': '🇵🇦',
  'Trinidad y Tobago': '🇹🇹',
  'Curazao': '🇨🇼',
  'Catar': '🇶🇦',
  'Irak': '🇮🇶',
  'Jordania': '🇯🇴',
  'Egipto': '🇪🇬',
  'Nigeria': '🇳🇬',
  'Argelia': '🇩🇿',
  'Cabo Verde': '🇨🇻',
  'Nueva Zelanda': '🇳🇿',
  'Uzbekistán': '🇺🇿',
  'RD Congo': '🇨🇩',
  'Italia': '🇮🇹',
  'El Salvador': '🇸🇻',
  'Gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Hungría': '🇭🇺',
  'Eslovenia': '🇸🇮',
  'Georgia': '🇬🇪',
  'Eslovaquia': '🇸🇰',
  'Albania': '🇦🇱',
  'Austria': '🇦🇹',
  'Kazakhstan': '🇰🇿',
};
