'use client'

export default function MundialPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-bebas text-3xl text-orange-500">
          🏆 MUNDIAL 2026
        </h1>
        <p className="text-slate-400 text-sm">
          Estadísticas y resultados oficiales
        </p>
      </div>

      {/* Widgets API-Sports */}
      <div className="px-2">

        {/* Config global */}
        <api-sports-widget
          data-type="config"
          data-key={process.env.NEXT_PUBLIC_API_SPORTS_KEY}
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
          data-season="2026"
        />

        <div className="grid grid-cols-1 gap-4">

          {/* Calendario/Resultados */}
          <div className="bg-[#12121a] rounded-xl overflow-hidden">
            <api-sports-widget data-type="league" />
          </div>

          {/* Detalles del partido seleccionado */}
          <div id="game-content"
            className="bg-[#12121a] rounded-xl overflow-hidden">
            <api-sports-widget
              data-type="game"
              data-game-id="0" />
          </div>

          {/* Standings / Tabla de posiciones */}
          <div className="bg-[#12121a] rounded-xl overflow-hidden">
            <api-sports-widget data-type="standings" />
          </div>

        </div>
      </div>
    </div>
  );
}
