'use client';

import { useState } from 'react';
import TrenMetro from './TrenMetro';

export type AccionMetrin = 'trofeo' | 'lapiz' | 'lupa' | 'reloj' | 'balon' | 'saluda' | 'boleto' | 'llega';

const T = '#15120F';

/** Objeto que acompaña a Metrín en cada ventana. Dibujos originales. */
function Utileria({ accion }: { accion: AccionMetrin }) {
  switch (accion) {
    case 'trofeo':
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" className="metrin-obj metrin-brilla" style={{ position: 'absolute', right: -10, top: -8 }} aria-hidden="true">
          <path d="M6 3h12v4a6 6 0 0 1-12 0Z" fill="#F2B632" stroke={T} strokeWidth="1.6" />
          <path d="M6 5H3v1.5A3.5 3.5 0 0 0 6.5 10M18 5h3v1.5A3.5 3.5 0 0 1 17.5 10" fill="none" stroke={T} strokeWidth="1.6" />
          <path d="M10.5 13h3v3.5h-3Z" fill="#F2B632" stroke={T} strokeWidth="1.4" />
          <rect x="7.5" y="16.5" width="9" height="4" rx="1" fill="#8A1538" stroke={T} strokeWidth="1.4" />
          <path d="M9 5.5v2" stroke="#FFF6D6" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'lapiz':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" className="metrin-obj metrin-escribe" style={{ position: 'absolute', right: -10, bottom: 2 }} aria-hidden="true">
          <path d="M4 20l1.2-4.6L16.5 4.1a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8Z" fill="#FFE27A" stroke={T} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M15 5.6l3.4 3.4" stroke={T} strokeWidth="1.6" />
          <path d="M4 20l1.2-4.6 3.4 3.4Z" fill={T} />
        </svg>
      );
    case 'lupa':
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" className="metrin-obj metrin-busca" style={{ position: 'absolute', right: -12, top: 6 }} aria-hidden="true">
          <circle cx="10" cy="10" r="6" fill="#DDF3FA" fillOpacity=".75" stroke={T} strokeWidth="2" />
          <path d="M14.5 14.5l5.5 5.5" stroke="#7A4A26" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M7.5 8a3 3 0 0 1 2.5-1.6" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'reloj':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" className="metrin-obj" style={{ position: 'absolute', right: -10, top: -6 }} aria-hidden="true">
          <circle cx="12" cy="13" r="8.5" fill="#FFFDF9" stroke={T} strokeWidth="1.8" />
          <path d="M9 2.5h6" stroke={T} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 13V8.5" stroke={T} strokeWidth="1.8" strokeLinecap="round" />
          <g className="metrin-manecilla"><path d="M12 13h4" stroke="#0098B8" strokeWidth="1.8" strokeLinecap="round" /></g>
          <circle cx="12" cy="13" r="1.2" fill={T} />
        </svg>
      );
    case 'balon':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" className="metrin-obj metrin-rebota" style={{ position: 'absolute', right: -10, bottom: 0 }} aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#FFFDF9" stroke={T} strokeWidth="1.8" />
          <path d="M12 7.5l4.3 3.1-1.6 5h-5.4l-1.6-5Z" fill={T} />
          <path d="M12 7.5V2.5M16.3 10.6l4.6-1.5M14.7 15.6l2.9 4M9.3 15.6l-2.9 4M7.7 10.6 3.1 9.1" stroke={T} strokeWidth="1.4" />
        </svg>
      );
    case 'boleto':
      return (
        <svg width="30" height="22" viewBox="0 0 30 22" className="metrin-obj metrin-ofrece" style={{ position: 'absolute', left: -22, bottom: 2 }} aria-hidden="true">
          <path d="M3 3h24v5a3 3 0 0 0 0 6v5H3v-5a3 3 0 0 0 0-6Z" fill="#F07A1A" stroke={T} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M3 8.5h24" stroke="#8A1538" strokeWidth="2.4" />
          <path d="M20 4v14" stroke={T} strokeWidth="1" strokeDasharray="1.6 1.6" />
          <path d="M7 14h9" stroke="#FFFDF9" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'llega':
      return (
        <svg width="22" height="18" viewBox="0 0 22 18" className="metrin-obj metrin-humo" style={{ position: 'absolute', right: -14, top: -6 }} aria-hidden="true">
          <circle cx="6" cy="12" r="4" fill="#D6CEC1" />
          <circle cx="13" cy="8" r="5" fill="#E5DFD4" />
          <circle cx="18" cy="4" r="3.2" fill="#EFEAE1" />
        </svg>
      );
    case 'saluda':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" className="metrin-obj metrin-mano" style={{ position: 'absolute', right: -8, top: -4 }} aria-hidden="true">
          <path d="M7 13V6.5a1.5 1.5 0 0 1 3 0V11V4.5a1.5 1.5 0 0 1 3 0V11V5.5a1.5 1.5 0 0 1 3 0V12V8.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 6 18.3L3.7 14.6a1.5 1.5 0 0 1 2.5-1.7Z"
            fill="#FFFDF9" stroke={T} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
  }
}

/** Movimiento del tren según la acción. */
const movimiento: Record<AccionMetrin, string> = {
  trofeo: 'metrin-festeja',
  lapiz: 'metrin-concentra',
  lupa: 'metrin-asoma',
  reloj: 'metrin-tictac',
  balon: 'metrin-dribla',
  saluda: 'metrin-saluda',
  boleto: 'metrin-concentra',
  llega: 'metrin-llega',
};

/** Metrín con su objeto de la ventana. */
export function MetrinFigura({ accion, size = 48 }: { accion: AccionMetrin; size?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <span className={`block ${movimiento[accion]}`} style={{ width: size, height: size }}>
        <TrenMetro size={size} />
      </span>
      <span className="absolute left-0 top-0" style={{ width: 48, height: 48, transform: `scale(${size / 48})`, transformOrigin: '0 0' }}>
        <Utileria accion={accion} />
      </span>
    </span>
  );
}

/**
 * Metrín, la mascota de Quiniela Metro: el trenecito con un globito de diálogo.
 * En cada ventana hace algo distinto (accion). Al tocarlo pasa al siguiente consejo.
 */
export default function Metrin({ consejos, accion = 'saluda', className = '' }: { consejos: string[]; accion?: AccionMetrin; className?: string }) {
  const [i, setI] = useState(0);
  if (!consejos.length) return null;
  const varios = consejos.length > 1;
  const siguiente = () => varios && setI(n => (n + 1) % consejos.length);

  return (
    <div
      className={`flex items-center gap-3 ${varios ? 'cursor-pointer select-none' : ''} ${className}`}
      onClick={siguiente}
      role={varios ? 'button' : undefined}
      aria-label={varios ? 'Metrín: siguiente consejo' : undefined}
    >
      <MetrinFigura accion={accion} />
      <div
        className="relative flex-1 min-w-0 rounded-[14px] px-3 py-2 ml-1"
        style={{ background: 'var(--sf)', border: '1.5px solid var(--ln)' }}
      >
        {/* colita del globito */}
        <span
          aria-hidden="true"
          className="absolute"
          style={{
            left: -7, top: 'calc(50% - 6px)', width: 12, height: 12, background: 'var(--sf)',
            borderLeft: '1.5px solid var(--ln)', borderBottom: '1.5px solid var(--ln)', transform: 'rotate(45deg)',
          }}
        />
        <p className="relative text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--br)' }}>
          Metrín
        </p>
        <p className="relative text-[14px] leading-snug" style={{ color: 'var(--ink2)' }}>
          {consejos[i]}
        </p>
        {varios && (
          <p className="relative text-[11px] mt-0.5" style={{ color: 'var(--mut)' }}>
            Toca para otro consejo · {i + 1}/{consejos.length}
          </p>
        )}
      </div>
    </div>
  );
}

/** Pantalla de carga con Metrín en camino. */
export function MetrinCargando({ texto = 'Metrín va en camino…' }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16">
      <TrenMetro size={64} className="metrin-avanza" />
      <p className="text-sm font-medium" style={{ color: 'var(--mut)' }}>{texto}</p>
    </div>
  );
}
