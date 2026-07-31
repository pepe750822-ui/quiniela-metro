'use client'
import { useState } from 'react';
import { LOGOS_LIGAMX } from '@/lib/utils';

const EMOJI_A_CODIGO: Record<string, string> = {
  '🇲🇽': 'mx', '🇿🇦': 'za', '🇰🇷': 'kr', '🇨🇿': 'cz',
  '🇨🇦': 'ca', '🇶🇦': 'qa', '🇨🇭': 'ch', '🇧🇦': 'ba',
  '🇺🇸': 'us', '🇵🇾': 'py', '🇧🇷': 'br', '🇲🇦': 'ma',
  '🇭🇹': 'ht', '🇦🇺': 'au', '🇹🇷': 'tr', '🇩🇪': 'de',
  '🇨🇼': 'cw', '🇨🇮': 'ci', '🇪🇨': 'ec', '🇳🇱': 'nl',
  '🇯🇵': 'jp', '🇸🇪': 'se', '🇹🇳': 'tn', '🇪🇸': 'es',
  '🇨🇻': 'cv', '🇸🇦': 'sa', '🇺🇾': 'uy', '🇧🇪': 'be',
  '🇪🇬': 'eg', '🇮🇷': 'ir', '🇳🇿': 'nz', '🇫🇷': 'fr',
  '🇸🇳': 'sn', '🇮🇶': 'iq', '🇳🇴': 'no', '🇦🇷': 'ar',
  '🇩🇿': 'dz', '🇦🇹': 'at', '🇯🇴': 'jo', '🇵🇹': 'pt',
  '🇨🇩': 'cd', '🇺🇿': 'uz', '🇨🇴': 'co', '🇵🇦': 'pa',
  '🇬🇭': 'gh', '🇭🇷': 'hr', '🇮🇹': 'it', '🇸🇻': 'sv',
  '🇭🇺': 'hu', '🇸🇮': 'si', '🇬🇪': 'ge', '🇸🇰': 'sk',
  '🇦🇱': 'al', '🇷🇸': 'rs', '🇷🇴': 'ro', '🇵🇱': 'pl',
  '🇩🇰': 'dk', '🇨🇲': 'cm', '🇳🇬': 'ng', '🇧🇴': 'bo',
  '🇻🇪': 've', '🇨🇱': 'cl', '🇵🇪': 'pe', '🇬🇹': 'gt',
  '🇯🇲': 'jm', '🇭🇳': 'hn', '🇨🇷': 'cr', '🇹🇹': 'tt',
  '🇺🇦': 'ua', '🇨🇺': 'cu', '🇰🇿': 'kz',
  '🏴󠁧󠁢󠁥󠁮󠁧󠁿': 'gb-eng',
  '🏴󠁧󠁢󠁳󠁣󠁴󠁿': 'gb-sct',
  '🏴󠁧󠁢󠁷󠁬󠁳󠁿': 'gb-wls',
};

const sizeMap = {
  sm: { w: 24, h: 18 },
  md: { w: 40, h: 30 },
  lg: { w: 56, h: 42 },
};

interface BanderaProps {
  emoji: string;
  nombre: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Bandera({ emoji, nombre, size = 'md' }: BanderaProps) {
  const [error, setError] = useState(false);
  const { w, h } = sizeMap[size];

  const logoUrl = LOGOS_LIGAMX[nombre];
  if (logoUrl && !error) {
    return (
      <img
        src={logoUrl}
        width={w}
        height={w}
        alt={nombre}
        className="object-contain inline-block"
        style={{ width: w, height: w }}
        loading="lazy"
        onError={() => setError(true)}
      />
    );
  }

  // Handle both flag emojis ('🇨🇦') and raw ISO-2 codes ('CA') stored in DB
  const codigo = EMOJI_A_CODIGO[emoji] ?? (/^[A-Z]{2}$/.test(emoji) ? emoji.toLowerCase() : undefined);

  if (!codigo || error) {
    return (
      <span style={{ fontSize: w * 0.7 }} role="img" aria-label={nombre}>
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/${w}x${h}/${codigo}.png`}
      srcSet={`https://flagcdn.com/${w*2}x${h*2}/${codigo}.png 2x`}
      width={w}
      height={h}
      alt={nombre}
      className="object-cover rounded-sm inline-block"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

export default Bandera;
