'use client';
import { useState, useEffect } from 'react';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show) return null;

  const instalar = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setShow(false);
  };

  // Banner discreto arriba de la barra inferior (zona del pulgar)
  return (
    <div
      className="no-print fixed left-3 right-3 z-50 mx-auto max-w-xl rounded-2xl p-3 shadow-lg"
      style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))', background: 'var(--text-primary)', color: 'var(--bg-base)' }}
      role="dialog"
      aria-label="Instalar la app"
    >
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" className="h-11 w-11 shrink-0 rounded-xl" alt="" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight">Instala Quiniela Metro</p>
          <p className="text-[13px] opacity-80">Ábrela como app, sin buscar el link en WhatsApp.</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2">
        <button
          type="button"
          onClick={() => setShow(false)}
          className="min-h-[46px] rounded-xl text-[15px] font-bold"
          style={{ border: '1.5px solid currentColor', opacity: 0.8 }}
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={instalar}
          className="min-h-[46px] rounded-xl text-[15px] font-bold active:scale-95 transition-transform"
          style={{ background: '#C8006A', color: '#fff' }}
        >
          Instalar
        </button>
      </div>
    </div>
  );
}
