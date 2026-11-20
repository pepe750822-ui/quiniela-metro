'use client';

import { useState } from 'react';
import TrenMetro from './TrenMetro';

/**
 * Metrín, la mascota de Quiniela Metro: el trenecito con un globito de diálogo.
 * Recibe uno o varios consejos; al tocarlo pasa al siguiente.
 */
export default function Metrin({ consejos, className = '' }: { consejos: string[]; className?: string }) {
  const [i, setI] = useState(0);
  if (!consejos.length) return null;
  const varios = consejos.length > 1;
  const siguiente = () => varios && setI(n => (n + 1) % consejos.length);

  return (
    <div
      className={`flex items-center gap-2 ${varios ? 'cursor-pointer select-none' : ''} ${className}`}
      onClick={siguiente}
      role={varios ? 'button' : undefined}
      aria-label={varios ? 'Metrín: siguiente consejo' : undefined}
    >
      <TrenMetro size={48} className="shrink-0 metrin-saluda" />
      <div
        className="relative flex-1 min-w-0 rounded-[14px] px-3 py-2"
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
