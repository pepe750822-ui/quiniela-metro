'use client'
import { useEffect } from 'react';

export default function MundialPage() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://widgets.api-sports.io/3.1.0/widgets.js';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_API_SPORTS_KEY || '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">

      <div className="px-4 pt-6 pb-4">
        <h1 className="font-bebas text-3xl text-orange-500">
          🏆 MUNDIAL 2026
        </h1>
        <p className="text-slate-400 text-sm">
          Estadísticas y resultados oficiales
        </p>
      </div>

      <div className="px-2 space-y-4">

        {/* Calendario/Resultados */}
        <div className="bg-[#12121a] rounded-xl overflow-hidden"
          style={{ minHeight: '400px' }}>
          <div
            dangerouslySetInnerHTML={{
              __html: `
                <api-sports-widget
                  data-type="config"
                  data-key="${apiKey}"
                  data-sport="football"
                  data-lang="es"
                  data-theme="dark"
                  data-show-logos="true"
                  data-refresh="60"
                  data-standings="true"
                  data-target-standings="true"
                  data-target-game="#game-content"
                  data-target-player="modal"
                  data-target-team="modal"
                  data-tab="results"
                  data-league="1"
                  data-season="2026">
                </api-sports-widget>
                <api-sports-widget data-type="league">
                </api-sports-widget>
              `
            }}
          />
        </div>

        {/* Detalles partido */}
        <div id="game-content"
          className="bg-[#12121a] rounded-xl overflow-hidden"
          style={{ minHeight: '300px' }}>
        </div>

        {/* Standings */}
        <div className="bg-[#12121a] rounded-xl overflow-hidden"
          style={{ minHeight: '400px' }}>
          <div
            dangerouslySetInnerHTML={{
              __html: `
                <api-sports-widget data-type="standings">
                </api-sports-widget>
              `
            }}
          />
        </div>

      </div>
    </div>
  );
}
