'use client';
import { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show) return null;

  const instalar = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setShow(false);
  };

  return (
    <div className="fixed left-0 right-0 z-50 px-3" style={{ top: 'max(8px, env(safe-area-inset-top))' }}>
      <div className="max-w-lg mx-auto flex items-center gap-3 rounded-[16px] px-3 py-2.5 shadow-lg"
        style={{ background: 'var(--sf)', border: '1px solid var(--ln)', color: 'var(--ink)' }}>
        <img src="/icons/icon-192.png" className="w-10 h-10 rounded-[10px] shrink-0" alt="" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] leading-tight">Instala la app</p>
          <p className="text-[13px] leading-tight" style={{ color: 'var(--mut)' }}>
            Ábrela desde tu pantalla de inicio
          </p>
        </div>
        <button
          onClick={instalar}
          className="px-4 rounded-[10px] text-[14px] font-bold active:scale-95 transition-transform"
          style={{ minHeight: 40, background: 'var(--ink)', color: 'var(--bg)' }}
        >
          Agregar
        </button>
        <button onClick={() => setShow(false)} aria-label="Cerrar" className="w-10 h-10 flex items-center justify-center text-[18px]" style={{ color: 'var(--mut)' }}>
          ✕
        </button>
      </div>
    </div>
  );
}
