'use client';

export default function ReglasFaseFinal() {
  return (
    <div className="rounded-xl p-3 text-xs"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex items-start gap-2">
          <span>📊</span>
          <span>
            <strong>Puntos por partido:</strong> 3 exacto · 1 ganador · +1 clasificado · +1 cómo termina
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span>🏅</span>
          <span>
            <strong>Bonificación:</strong> +5 pts si aciertas al CAMPEÓN
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span>💰</span>
          <span>
            <strong>Premio:</strong> 100% del pozo para el 1er lugar
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span>⏰</span>
          <span>
            <strong>Deadline por ronda:</strong> revisa antes de cada fase
          </span>
        </div>
      </div>
    </div>
  );
}
