const EMOJI_A_CODIGO: Record<string, string> = {
  '🇲🇽': 'mx', '🇿🇦': 'za', '🇰🇷': 'kr', '🇨🇿': 'cz',
  '🇨🇦': 'ca', '🇧🇦': 'ba', '🇶🇦': 'qa', '🇨🇭': 'ch',
  '🇧🇷': 'br', '🇲🇦': 'ma', '🇭🇹': 'ht', '🇺🇸': 'us',
  '🇵🇾': 'py', '🇦🇺': 'au', '🇹🇷': 'tr', '🇩🇪': 'de',
  '🇨🇼': 'cw', '🇨🇮': 'ci', '🇪🇨': 'ec', '🇳🇱': 'nl',
  '🇯🇵': 'jp', '🇸🇪': 'se', '🇹🇳': 'tn', '🇧🇪': 'be',
  '🇪🇬': 'eg', '🇮🇷': 'ir', '🇳🇿': 'nz', '🇪🇸': 'es',
  '🇨🇻': 'cv', '🇸🇦': 'sa', '🇺🇾': 'uy', '🇫🇷': 'fr',
  '🇳🇴': 'no', '🇸🇳': 'sn', '🇮🇶': 'iq', '🇦🇷': 'ar',
  '🇩🇿': 'dz', '🇦🇹': 'at', '🇯🇴': 'jo', '🇵🇹': 'pt',
  '🇳🇬': 'ng', '🇺🇿': 'uz', '🇨🇴': 'co', '🇵🇦': 'pa',
  '🇬🇭': 'gh', '🇭🇷': 'hr', '🇩🇰': 'dk', '🇨🇲': 'cm',
  '🇵🇱': 'pl', '🇸🇮': 'si', '🇬🇧': 'gb', '🇮🇹': 'it',
  '🇵🇪': 'pe', '🇨🇱': 'cl', '🇧🇴': 'bo', '🇻🇪': 've',
  '🇵🇭': 'ph', '🇮🇩': 'id', '🇰🇪': 'ke', '🇹🇿': 'tz',
  '🏴󠁧󠁢󠁥󠁮󠁧󠁿': 'gb-eng',
  '🏴󠁧󠁢󠁳󠁣󠁴󠁿': 'gb-sct',
};

const SIZE_PX = { sm: 24, md: 40, lg: 56 } as const;

interface BanderaProps {
  emoji: string | null;
  nombre: string;
  size?: keyof typeof SIZE_PX;
}

export function Bandera({ emoji, nombre, size = 'md' }: BanderaProps) {
  if (!emoji) return null;
  const codigo = EMOJI_A_CODIGO[emoji];
  const px = SIZE_PX[size];

  if (!codigo) {
    return <span style={{ fontSize: px * 0.8, lineHeight: 1 }}>{emoji}</span>;
  }

  const h = Math.round(px * 0.75);
  return (
    <img
      src={`https://flagcdn.com/${px}x${h}/${codigo}.png`}
      srcSet={`https://flagcdn.com/${px * 2}x${h * 2}/${codigo}.png 2x`}
      width={px}
      height={h}
      alt={nombre}
      className="object-cover rounded-sm"
      loading="lazy"
    />
  );
}
