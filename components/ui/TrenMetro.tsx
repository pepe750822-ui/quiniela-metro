/** Tren del Metro en caricatura (vista frontal, con carita). Dibujo original. */
export default function TrenMetro({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Tren del Metro">
      {/* rieles */}
      <path d="M14 61h36" stroke="#15120F" strokeWidth="3" strokeLinecap="round" />
      {/* cuerpo */}
      <rect x="10" y="6" width="44" height="48" rx="14" fill="#F07A1A" stroke="#15120F" strokeWidth="3" />
      {/* franja rosa */}
      <rect x="11.5" y="40" width="41" height="6" fill="#C8006A" />
      {/* parabrisas */}
      <rect x="16" y="12" width="32" height="20" rx="7" fill="#FFFDF9" stroke="#15120F" strokeWidth="2.5" />
      {/* ojos */}
      <circle cx="26" cy="22" r="3.2" fill="#15120F" />
      <circle cx="38" cy="22" r="3.2" fill="#15120F" />
      <circle cx="27.1" cy="20.9" r="1" fill="#fff" />
      <circle cx="39.1" cy="20.9" r="1" fill="#fff" />
      {/* cachetes */}
      <circle cx="21" cy="27" r="2.4" fill="#FADCEB" />
      <circle cx="43" cy="27" r="2.4" fill="#FADCEB" />
      {/* sonrisa */}
      <path d="M28 27.5q4 3.5 8 0" fill="none" stroke="#15120F" strokeWidth="2" strokeLinecap="round" />
      {/* faros */}
      <circle cx="19" cy="36" r="2.6" fill="#FFE27A" stroke="#15120F" strokeWidth="1.5" />
      <circle cx="45" cy="36" r="2.6" fill="#FFE27A" stroke="#15120F" strokeWidth="1.5" />
      {/* ruedas */}
      <circle cx="21" cy="55" r="4" fill="#15120F" />
      <circle cx="43" cy="55" r="4" fill="#15120F" />
    </svg>
  );
}
