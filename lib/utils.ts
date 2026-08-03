export const TEMPORADA_ACTIVA = 'ligamx2026';

export const LOGOS_LIGAMX: Record<string, string> = {
  // Liga MX (locales)
  'América':      '/logos/america.svg',
  'Guadalajara':  '/logos/guadalajara.svg',
  'Cruz Azul':    '/logos/cruzazul.png',
  'Monterrey':    '/logos/monterrey.png',
  'Tigres':       '/logos/tigres.png',
  'Pumas':        '/logos/pumas.png',
  'Toluca':       '/logos/toluca.png',
  'Atlas':        '/logos/atlas.png',
  'León':         '/logos/leon.png',
  'Pachuca':      '/logos/pachuca.png',
  'Santos':       '/logos/santos.svg',
  'Puebla':       '/logos/puebla.svg',
  'Querétaro':    '/logos/queretaro.png',
  'Tijuana':      '/logos/tijuana.svg',
  'Juárez':       '/logos/juarez.svg',
  'San Luis':     '/logos/sanluis.png',
  'Necaxa':       '/logos/necaxa.png',
  'Atlante':      '/logos/atlante.svg',
  // MLS (Leagues Cup 2026)
  'FC Cincinnati':      'https://upload.wikimedia.org/wikipedia/en/thumb/b/b7/FC_Cincinnati_primary_logo.svg/120px-FC_Cincinnati_primary_logo.svg.png',
  'Columbus Crew':      'https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/Columbus_Crew_SC_logo.svg/120px-Columbus_Crew_SC_logo.svg.png',
  'Charlotte FC':       'https://upload.wikimedia.org/wikipedia/en/thumb/c/ce/Charlotte_FC_logo.svg/120px-Charlotte_FC_logo.svg.png',
  'Minnesota United':   'https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Minnesota_United_FC_logo.svg/120px-Minnesota_United_FC_logo.svg.png',
  'Vancouver Whitecaps':'https://upload.wikimedia.org/wikipedia/en/thumb/2/29/Vancouver_Whitecaps_FC_logo.svg/120px-Vancouver_Whitecaps_FC_logo.svg.png',
  'Inter Miami':        'https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Inter_Miami_CF_logo.svg/120px-Inter_Miami_CF_logo.svg.png',
  'Nashville SC':       'https://upload.wikimedia.org/wikipedia/en/thumb/1/1d/Nashville_SC_logo.svg/120px-Nashville_SC_logo.svg.png',
  'FC Dallas':          'https://upload.wikimedia.org/wikipedia/en/thumb/9/97/FC_Dallas_2019.svg/120px-FC_Dallas_2019.svg.png',
  'LAFC':               'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Los_Angeles_FC.svg/120px-Los_Angeles_FC.svg.png',
  'New York City FC':   'https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/New_York_City_FC.svg/120px-New_York_City_FC.svg.png',
  'Chicago Fire':       'https://upload.wikimedia.org/wikipedia/en/thumb/2/25/Chicago_Fire_FC_logo.svg/120px-Chicago_Fire_FC_logo.svg.png',
  'Austin FC':          'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Austin_FC_logo.svg/120px-Austin_FC_logo.svg.png',
  'Portland Timbers':   'https://upload.wikimedia.org/wikipedia/en/thumb/5/57/Portland_Timbers_logo.svg/120px-Portland_Timbers_logo.svg.png',
  'San Diego FC':       'https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/San_Diego_FC_logo.svg/120px-San_Diego_FC_logo.svg.png',
  'Philadelphia Union': 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b5/Philadelphia_Union_logo.svg/120px-Philadelphia_Union_logo.svg.png',
  'Seattle Sounders':   'https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Seattle_Sounders_FC.svg/120px-Seattle_Sounders_FC.svg.png',
  'Orlando City':       'https://upload.wikimedia.org/wikipedia/en/thumb/b/b6/Orlando_City_FC_2014.svg/120px-Orlando_City_FC_2014.svg.png',
  'Real Salt Lake':     'https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/Real_Salt_Lake_logo.svg/120px-Real_Salt_Lake_logo.svg.png',
};

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
  if (j === 6) return 'Fase Final';
  return `J${j}`;
};

export const getNombreJornadaLigaMX = (j: number) => {
  if (j === 1) return 'Leagues Cup F1';
  return `Jornada ${j + 2}`;
};

export const labelJornada = (j: number) =>
  TEMPORADA_ACTIVA === 'ligamx2026' ? getNombreJornadaLigaMX(j) : getNombreJornada(j);

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
