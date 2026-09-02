export const TEMPORADA_ACTIVA = 'ligamx2026';

export const LOGOS_LIGAMX: Record<string, string> = {
  // Liga MX — archivos locales
  'América':      '/logos/america.svg',
  'Guadalajara':  '/logos/guadalajara.svg',
  'Cruz Azul':    '/logos/cruzazul.svg',
  'Monterrey':    '/logos/monterrey.svg',
  'Tigres':       '/logos/tigres.svg',
  'Pumas':        '/logos/pumas.svg',
  'Toluca':       '/logos/toluca.svg',
  'Atlas':        '/logos/atlas.svg',
  'León':         '/logos/leon.svg',
  'Pachuca':      '/logos/pachuca.svg',
  'Santos':       '/logos/santos.svg',
  'Puebla':       '/logos/puebla.svg',
  'Querétaro':    '/logos/queretaro.svg',
  'Tijuana':      '/logos/tijuana.svg',
  'Juárez':       '/logos/juarez.svg',
  'San Luis':     '/logos/sanluis.svg',
  'Necaxa':       '/logos/necaxa.svg',
  'Atlante':      '/logos/atlante.svg',
  // MLS — archivos locales (descargados de Wikipedia)
  'Charlotte FC':       '/logos/charlottefc.svg',
  'Columbus Crew':      '/logos/columbuscrew.svg',
  'FC Dallas':          '/logos/fcdallas.svg',
  'Inter Miami':        '/logos/intermiami.svg',
  'New York City FC':   '/logos/newyorkcityfc.svg',
  'Real Salt Lake':     '/logos/realsaltlake.svg',
  'Seattle Sounders':   '/logos/seattlesounders.svg',
  'FC Cincinnati':      '/logos/fccincinnati.svg',
  'Minnesota United':   '/logos/minnesotaunited.svg',
  'Vancouver Whitecaps': '/logos/vancouverwhitecaps.svg',
  'Nashville SC':        '/logos/nashvillesc.svg',
  'Orlando City':        '/logos/orlandocity.svg',
  'LAFC':                '/logos/lafc.svg',
  'Philadelphia Union':  '/logos/philadelphiaunion.svg',
  'Chicago Fire':        '/logos/chicagofire.svg',
  'Austin FC':           '/logos/austinfc.svg',
  'San Diego FC':        '/logos/sandiegofc.svg',
  'Portland Timbers':    '/logos/portlandtimbers.svg',
  // LaLiga ESP
  'Espanyol':            '/logos/espanyol.svg',
  'Real Madrid':         '/logos/realmadrid.svg',
  'Elche':               '/logos/elche.svg',
  'Barcelona':           '/logos/barcelona.svg',
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
  if (j === 2) return 'Leagues Cup F2';
  if (j === 3) return 'J3';
  if (j === 6) return 'J6+LC Cuartos';
  if (j === 7) return 'J7+LC Semis';
  if (j === 8) return 'J8+Champions';
  return `J${j}`;
};

export const labelJornada = (j: number) =>
  TEMPORADA_ACTIVA === 'ligamx2026' ? getNombreJornadaLigaMX(j) : getNombreJornada(j);

export const getMontoJornada = (j: number): number => {
  if (TEMPORADA_ACTIVA === 'ligamx2026' && j >= 6) return 50;
  if (j >= 5) return 100;
  return 50;
};

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
