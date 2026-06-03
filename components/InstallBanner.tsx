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
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" className="w-8 h-8 rounded-lg" alt="" />
        <div>
          <p className="font-bold text-sm" style={{ fontFamily: 'var(--font-rajdhani)' }}>
            Instala Quiniela Metro
          </p>
          <p className="text-xs text-orange-200">
            Acceso rápido desde tu pantalla de inicio
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={instalar}
          className="bg-white text-orange-600 px-3 py-1.5 rounded-lg text-sm font-bold active:scale-95 transition-transform"
        >
          Instalar
        </button>
        <button onClick={() => setShow(false)} className="text-white/70 text-xl leading-none">
          ✕
        </button>
      </div>
    </div>
  );
}
