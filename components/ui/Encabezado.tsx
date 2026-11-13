import Link from 'next/link';

/** Encabezado de pantalla estilo señalética: estación (número) + título condensado. */
export default function Encabezado({
  titulo, subtitulo, estacion, volver, derecha,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  estacion?: number | string | null;
  volver?: string;
  derecha?: React.ReactNode;
}) {
  return (
    <header className="flex items-start gap-3 mb-5">
      {volver && (
        <Link href={volver} aria-label="Volver" className="flex items-center justify-center w-11 h-11 -ml-2 shrink-0" style={{ color: 'var(--ink)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        </Link>
      )}
      {estacion != null && estacion !== '' && (
        <span className="flex items-center justify-center shrink-0 rounded-[10px] font-display"
          style={{ width: 44, height: 44, background: 'var(--br)', color: 'var(--brI)', fontSize: 26, lineHeight: 1 }}>
          {estacion}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="font-display truncate" style={{ fontSize: 32, lineHeight: 1, color: 'var(--ink)' }}>{titulo}</h1>
        {subtitulo && <div className="text-[14px] font-medium mt-1" style={{ color: 'var(--mut)' }}>{subtitulo}</div>}
      </div>
      {derecha}
    </header>
  );
}
