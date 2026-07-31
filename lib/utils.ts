export const TEMPORADA_ACTIVA = 'ligamx2026';

export const LOGOS_LIGAMX: Record<string, string> = {
  'América':      'https://upload.wikimedia.org/wikipedia/en/thumb/a/a3/Club_Am%C3%A9rica_crest.svg/200px-Club_Am%C3%A9rica_crest.svg.png',
  'Guadalajara':  'https://upload.wikimedia.org/wikipedia/en/thumb/3/37/CD_Guadalajara_logo.svg/200px-CD_Guadalajara_logo.svg.png',
  'Cruz Azul':    'https://upload.wikimedia.org/wikipedia/en/thumb/e/e9/Cruz_Azul_FC_logo.svg/200px-Cruz_Azul_FC_logo.svg.png',
  'Monterrey':    'https://upload.wikimedia.org/wikipedia/en/thumb/8/82/CF_Monterrey_2019_logo.svg/200px-CF_Monterrey_2019_logo.svg.png',
  'Tigres':       'https://upload.wikimedia.org/wikipedia/en/thumb/5/54/Tigres_UANL_logo.svg/200px-Tigres_UANL_logo.svg.png',
  'Pumas':        'https://upload.wikimedia.org/wikipedia/en/thumb/6/67/Pumas_UNAM.svg/200px-Pumas_UNAM.svg.png',
  'Toluca':       'https://upload.wikimedia.org/wikipedia/en/thumb/7/7e/Deportivo_Toluca_F.C._logo.svg/200px-Deportivo_Toluca_F.C._logo.svg.png',
  'Atlas':        'https://upload.wikimedia.org/wikipedia/en/thumb/d/da/Atlas_FC_Logo.png/200px-Atlas_FC_Logo.png',
  'León':         'https://upload.wikimedia.org/wikipedia/en/thumb/6/6a/Club_Le%C3%B3n.svg/200px-Club_Le%C3%B3n.svg.png',
  'Pachuca':      'https://upload.wikimedia.org/wikipedia/en/thumb/4/43/CF_Pachuca_logo.svg/200px-CF_Pachuca_logo.svg.png',
  'Santos':       'https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Santos_Laguna_logo.svg/200px-Santos_Laguna_logo.svg.png',
  'Puebla':       'https://upload.wikimedia.org/wikipedia/en/thumb/b/b7/Club_Puebla_logo.svg/200px-Club_Puebla_logo.svg.png',
  'Querétaro':    'https://upload.wikimedia.org/wikipedia/en/thumb/8/8d/Quer%C3%A9taro_FC_logo.svg/200px-Quer%C3%A9taro_FC_logo.svg.png',
  'Tijuana':      'https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Club_Tijuana_logo.svg/200px-Club_Tijuana_logo.svg.png',
  'Juárez':       'https://upload.wikimedia.org/wikipedia/en/thumb/0/00/FC_Ju%C3%A1rez_logo.svg/200px-FC_Ju%C3%A1rez_logo.svg.png',
  'San Luis':     'https://upload.wikimedia.org/wikipedia/en/thumb/0/0b/Atletico_de_San_Luis_crest.svg/200px-Atletico_de_San_Luis_crest.svg.png',
  'Necaxa':       'https://upload.wikimedia.org/wikipedia/en/thumb/3/36/Club_Necaxa_logo.svg/200px-Club_Necaxa_logo.svg.png',
  'Atlante':      'https://upload.wikimedia.org/wikipedia/en/thumb/4/44/Atlante_FC_logo.svg/200px-Atlante_FC_logo.svg.png',
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
