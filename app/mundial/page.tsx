'use client'
import { useEffect, useState } from 'react';

export default function MundialPage() {
  const [season, setSeason] = useState('2022');
  const apiKey = process.env.NEXT_PUBLIC_API_SPORTS_KEY || '';

  // Diagnóstico: buscar league ID y temporadas disponibles del Mundial
  useEffect(() => {
    fetch('https://v3.football.api-sports.io/leagues?name=FIFA World Cup', {
      headers: { 'x-apisports-key': apiKey }
    })
      .then(r => r.json())
      .then(data => console.log('Leagues:', JSON.stringify(data.response?.map((l: { league: { id: number; name: string }; seasons: { year: number }[] }) => ({
        id: l.league.id,
        name: l.league.name,
        seasons: l.seasons?.map(s => s.year)
      })))))
      .catch(err => console.error('Leagues fetch error:', err));
  }, [apiKey]);

  // Cargar script de widgets al montar
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">

      <div className="px-4 pt-6 pb-2">
        <h1 className="font-bebas text-3xl text-orange-500">
          🏆 MUNDIAL 2026
        </h1>
        <p className="text-slate-400 text-sm">
          Estadísticas y resultados oficiales
        </p>
      </div>

      {/* Selector de temporada */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-widest">Temporada:</span>
        {['2022', '2026'].map(y => (
          <button
            key={y}
            onClick={() => setSeason(y)}
            className="px-3 py-1 rounded-lg text-sm font-bold transition-all active:scale-95"
            style={{
              background: season === y ? '#ea580c' : 'rgba(255,255,255,0.06)',
              color: season === y ? '#fff' : '#64748b',
              border: `1px solid ${season === y ? '#ea580c' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="px-2 space-y-4">

        {/* Calendario/Resultados — re-monta al cambiar temporada */}
        <div key={season} className="bg-[#12121a] rounded-xl overflow-hidden"
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
                  data-season="${season}">
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
