import Link from 'next/link';
import type { ReactNode } from 'react';

/*
 * Boleto inspirado en el boleto magnético naranja del Metro (1969-2023).
 * Frente: naranja con trama de sellos, folio, texto vertical y letras grandes con serifa.
 * Reverso: crema con banda magnética café.
 * El sello de la trama es una «Q» propia de la quiniela (no reproduce logotipos oficiales).
 */

const TINTA = '#5B2A12';

const sello = (color: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='18' viewBox='0 0 22 18'><g fill='none' stroke='${color}' stroke-width='1.3'><rect x='2' y='2' width='17' height='14' rx='3.5'/><circle cx='10.5' cy='8.6' r='3.6'/><path d='M12.4 10.8l3 3'/></g></svg>`,
  )}")`;

const vertical: React.CSSProperties = { writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' };

export function BoletoFrente({
  folio, clave, titulo, sup, inf, valor, pie, href, accion, chip,
}: {
  folio: string; clave: string; titulo: string; sup: string; inf: string;
  valor: string; pie?: ReactNode; href?: string; accion?: string; chip?: ReactNode;
}) {
  return (
    <div className="overflow-hidden" style={{ background: '#EE7A32', color: TINTA, borderRadius: 10, boxShadow: '0 1px 0 rgba(0,0,0,.08), 0 6px 18px -8px rgba(120,50,10,.45)' }}>
      <div className="flex">
        {/* talón izquierdo */}
        <div className="flex items-center gap-1.5 px-1.5 py-3" style={{ borderLeft: '7px solid #F7EFE2', borderRight: `1px solid ${TINTA}33` }}>
          <span className="font-black tracking-wide" style={{ ...vertical, fontSize: 15 }}>UNA QUINIELA</span>
          <span className="font-bold" style={{ ...vertical, fontSize: 9, opacity: 0.85 }}>VALOR $50.00 PESOS · CDMX</span>
        </div>
        <div className="px-1 py-3 flex items-center">
          <span className="font-bold tracking-wider" style={{ ...vertical, fontSize: 12 }}>{clave}</span>
        </div>

        {/* cuerpo con trama */}
        <div className="relative flex-1 py-2.5 pr-1" style={{ backgroundImage: sello(`${TINTA}8C`), backgroundSize: '22px 18px' }}>
          <div className="flex items-start justify-between gap-2">
            <span className="px-1 font-mono tabular-nums" style={{ fontSize: 17, letterSpacing: '0.02em', background: '#EE7A32' }}>{folio}</span>
            {chip}
          </div>
          <div className="flex items-center gap-2 my-1.5 py-1 pl-1" style={{ background: '#EE7A32' }}>
            <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 50, lineHeight: 0.9, letterSpacing: '-0.01em' }}>
              {titulo}
            </span>
            <span className="flex flex-col" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 17, lineHeight: 1 }}>
              <span>{sup}</span>
              <span style={{ borderTop: `1.5px solid ${TINTA}`, marginTop: 2, paddingTop: 2 }}>{inf}</span>
            </span>
          </div>
          <div className="inline-flex items-baseline gap-2 px-1" style={{ background: '#EE7A32' }}>
            <span className="font-display tabular-nums" style={{ fontSize: 40, lineHeight: 1 }}>{valor}</span>
            {pie && <span className="text-[13px] font-semibold">{pie}</span>}
          </div>
        </div>

        {/* leyenda derecha */}
        <div className="flex items-center px-1.5">
          <span className="font-bold tracking-[0.12em]" style={{ ...vertical, transform: 'none', fontSize: 9 }}>PROHIBIDA SU REVENTA</span>
        </div>
      </div>
      {href && (
        <Link href={href} className="flex items-center justify-between px-4 text-[15px] font-bold"
          style={{ minHeight: 48, background: '#F7EFE2', color: TINTA, borderTop: `2px dashed ${TINTA}55` }}>
          {accion}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
        </Link>
      )}
    </div>
  );
}

export function BoletoReverso({
  encabezado, linea1, linea2, href, accion, chip,
}: { encabezado: string; linea1: ReactNode; linea2?: ReactNode; href?: string; accion?: string; chip?: ReactNode }) {
  return (
    <div className="overflow-hidden" style={{ background: '#F7F1E6', color: '#3A2A1E', borderRadius: 10, border: '1px solid #E4D8C4' }}>
      <div className="px-4 pt-3 text-center">
        <div className="flex items-center justify-between">
          <span className="senal" style={{ fontSize: 12 }}>{encabezado}</span>
          {chip}
        </div>
        <p className="mt-1.5 text-[15px] font-bold" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{linea1}</p>
        {linea2 && <p className="text-[13px]" style={{ opacity: 0.8 }}>{linea2}</p>}
      </div>
      {/* banda magnética */}
      <div className="my-3" style={{ height: 22, background: 'linear-gradient(#6A4422, #533316)' }} />
      {href && (
        <Link href={href} className="flex items-center justify-between px-4 text-[15px] font-semibold"
          style={{ minHeight: 48, borderTop: '2px dashed #D9CBB3' }}>
          {accion}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
        </Link>
      )}
    </div>
  );
}
