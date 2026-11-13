/** Colores semánticos de puntos (diseño Quiniela Metro). */
export function estiloPuntos(pts: number | null | undefined): React.CSSProperties {
  if (pts == null) return { background: 'var(--pnS)', color: 'var(--ink2)' };
  if (pts >= 3) return { background: 'var(--ex)', color: 'var(--exI)' };
  if (pts >= 1) return { background: 'var(--rs)', color: '#2B1D00' };
  return { background: 'var(--flS)', color: 'var(--fl)' };
}

/** Chip de puntos: «+3 Exacto», «+1 Resultado», «0 Fallo», «Pendiente». */
export function ChipPuntos({ pts, className = '' }: { pts: number | null | undefined; className?: string }) {
  const label = pts == null ? 'Pendiente' : pts >= 3 ? `+${pts} Exacto` : pts >= 1 ? `+${pts} Resultado` : '0 Fallo';
  return (
    <span className={`inline-flex items-center rounded-[8px] px-2 py-1 text-[13px] font-semibold whitespace-nowrap ${className}`} style={estiloPuntos(pts)}>
      {label}
    </span>
  );
}

/** Celda de la tabla (46 × 40): marcador predicho coloreado por puntos. */
export function CeldaPred({ marcador, pts, destacado }: { marcador: string; pts: number | null | undefined; destacado?: boolean }) {
  return (
    <span className="inline-flex items-center justify-center rounded-[8px] font-display tabular-nums"
      style={{ width: 46, height: 40, fontSize: 18, ...estiloPuntos(pts), outline: destacado ? '2px solid var(--br)' : 'none', outlineOffset: 1 }}>
      {marcador}
    </span>
  );
}
