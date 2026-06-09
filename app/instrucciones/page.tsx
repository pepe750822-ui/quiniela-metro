export default function InstruccionesPage() {
  const pasos = [
    {
      numero: 1,
      emoji: '🔐',
      titulo: 'INICIA SESIÓN',
      descripcion: 'Entra con tu cuenta de Google. Es rápido y seguro.',
    },
    {
      numero: 2,
      emoji: '👤',
      titulo: 'PON TU APODO',
      descripcion: 'Ve a Perfil y escribe tu nombre o apodo. Así el admin te identifica para confirmar tu pago.',
    },
    {
      numero: 3,
      emoji: '⚽',
      titulo: 'HAZ TUS PREDICCIONES',
      descripcion: 'En Predicciones elige el marcador de cada partido. Puedes registrar varias quinielas (Esposa, Hija, Compadre...) cada una con sus propias predicciones.',
    },
    {
      numero: 4,
      emoji: '📢',
      titulo: 'PUBLICA TU QUINIELA',
      descripcion: 'Cuando termines de llenar todos los partidos, presiona PUBLICAR. Tus predicciones aparecerán en el área "Ver quinielas por jornada" para que todos las vean.',
    },
    {
      numero: 5,
      emoji: '💳',
      titulo: 'REALIZA TU PAGO',
      descripcion: 'Transfiere $50 MXN por cada quiniela por jornada.\n\nBanco: Santander\nNombre: JOSE LUIS GONZALEZ PEREZ\nCLABE: 014180565546539842\n\nEnvía tu comprobante por WhatsApp al 55 2326 9241 junto con tu correo de Google y el nombre de tu quiniela.',
    },
    {
      numero: 6,
      emoji: '✅',
      titulo: 'CONFIRMA TU PARTICIPACIÓN',
      descripcion: 'El admin confirmará tu pago. En el ranking aparecerás como:\n✅ Confirmado — tu quiniela es válida y entra al pozo\n⏳ Pago pendiente — tu quiniela se ve pero aún no es válida',
    },
    {
      numero: 7,
      emoji: '🏆',
      titulo: 'GANA EL POZO',
      descripcion: '🏆 SISTEMA DE PUNTUACIÓN\n\n🥇 3 puntos — Marcador exacto\nEjemplo: predijiste 2-1 y el resultado fue 2-1\n\n✅ 1 punto — Aciertas el resultado general\n• Predijiste que gana el local (cualquier marcador) ✓\n• Predijiste empate (cualquier marcador) ✓\n• Predijiste que gana el visitante (cualquier marcador) ✓\nEjemplo: predijiste 2-0 y ganó el local 1-0 → 1 punto\n\n❌ 0 puntos — Fallas el resultado\nEjemplo: predijiste que ganaba México y ganó Sudáfrica',
    },
    {
      numero: 8,
      emoji: '✏️',
      titulo: 'PUEDES EDITAR',
      descripcion: 'Puedes cambiar tus predicciones hasta 24 horas antes del primer partido de cada jornada.\n\n⏰ Jornada 1 cierra: miércoles 10 de junio a las 11:59 p.m. CDMX',
    },
  ];

  return (
    <main
      className="max-w-lg mx-auto px-4 pb-24"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
    >
      {/* Header */}
      <div className="mb-6" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: '#ea580c', lineHeight: 1, letterSpacing: '0.05em' }}>
          📖 CÓMO FUNCIONA
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          Guía rápida para participar en Quiniela Metro Mundial 2026
        </p>
      </div>

      {/* Pasos */}
      <div className="space-y-4">
        {pasos.map((paso, i) => (
          <div
            key={paso.numero}
            className="rounded-2xl p-5"
            style={{
              background: '#12121a',
              border: '1px solid #1e1e2e',
              animation: `fadeInUp 0.4s ease-out ${i * 60}ms both`,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Número */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                style={{ background: '#ea580c', fontFamily: 'var(--font-bebas)', fontSize: '1.1rem' }}
              >
                {paso.numero}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{paso.emoji}</span>
                  <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: '#fb923c', letterSpacing: '0.04em' }}>
                    {paso.titulo}
                  </h3>
                </div>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: '#cbd5e1' }}
                >
                  {paso.descripcion}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div
        className="mt-6 rounded-2xl p-4 text-center"
        style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.3)', animation: 'fadeInUp 0.4s ease-out 0.5s both' }}
      >
        <p className="text-sm font-semibold" style={{ color: '#fb923c', fontFamily: 'var(--font-rajdhani)' }}>
          ¿Dudas? Escríbenos al WhatsApp
        </p>
        <p className="text-lg font-bold mt-1" style={{ color: '#fff', fontFamily: 'var(--font-bebas)', letterSpacing: '0.05em' }}>
          55 2326 9241
        </p>
      </div>

      {/* Grupo WhatsApp */}
      <a
        href="https://chat.whatsapp.com/LeFSQrZwf9nARVoU7YARhD"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full py-4 rounded-xl font-bold hover:opacity-80 transition-all mt-6"
        style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontFamily: 'var(--font-rajdhani)' }}>
        💬 Únete al grupo de WhatsApp
      </a>
    </main>
  );
}
