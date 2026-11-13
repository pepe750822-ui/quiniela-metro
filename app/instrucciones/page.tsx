import Encabezado from '@/components/ui/Encabezado';

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
      style={{ paddingTop: 'max(20px, calc(env(safe-area-inset-top) + 12px))' }}
    >
      {/* Header */}
      <Encabezado titulo="Cómo jugar" volver="/perfil" subtitulo="Guía rápida para participar en Quiniela Metro" />

      {/* Así se suman puntos */}
      <section className="rounded-[16px] p-4 mb-5" style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
        <p className="senal mb-3" style={{ fontSize: 12 }}>Así se suman puntos</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { n: '3', t: 'Marcador exacto', st: { background: 'var(--ex)', color: 'var(--exI)' } },
            { n: '1', t: 'Ganador o empate', st: { background: 'var(--rs)', color: '#2B1D00' } },
            { n: '0', t: 'Fallo', st: { background: 'var(--flS)', color: 'var(--fl)' } },
          ].map(x => (
            <div key={x.n} className="rounded-[12px] py-3 px-2 text-center" style={x.st}>
              <div className="font-display" style={{ fontSize: 40, lineHeight: 1 }}>{x.n}</div>
              <div className="text-[13px] font-semibold leading-tight mt-1">{x.t}</div>
            </div>
          ))}
        </div>
        <p className="text-[14px] mt-3 opacity-80">¿Empate en puntos? Se desempata con los puntos de la jornada siguiente.</p>
      </section>

      {/* Pasos como estaciones de una línea */}
      <ol className="relative">
        <span aria-hidden="true" className="absolute" style={{ left: 21, top: 22, bottom: 22, width: 6, borderRadius: 3, background: 'var(--br)' }} />
        {pasos.map((paso) => (
          <li key={paso.numero} className="relative flex items-start gap-3 mb-3">
            <span className="relative z-10 flex items-center justify-center rounded-full shrink-0 font-display"
              style={{ width: 48, height: 48, background: 'var(--sf)', border: '5px solid var(--br)', color: 'var(--ink)', fontSize: 20 }}>
              {paso.numero}
            </span>
            <div className="flex-1 min-w-0 rounded-[16px] px-4 py-3" style={{ background: 'var(--sf)', border: '1px solid var(--ln)' }}>
              <h3 className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>
                {paso.titulo.charAt(0) + paso.titulo.slice(1).toLowerCase()}
              </h3>
              <p className="text-[14px] leading-snug whitespace-pre-line mt-0.5" style={{ color: 'var(--ink2)' }}>
                {paso.descripcion}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* Contacto */}
      <div className="mt-4 rounded-[16px] p-4 text-center" style={{ background: 'var(--brS)' }}>
        <p className="text-[14px] font-semibold" style={{ color: 'var(--ink2)' }}>
          ¿Dudas? Escríbenos al WhatsApp
        </p>
        <p className="font-display mt-1" style={{ fontSize: 28, color: 'var(--ink)' }}>
          55 2326 9241
        </p>
      </div>

      <a
        href="https://chat.whatsapp.com/LeFSQrZwf9nARVoU7YARhD"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-[12px] font-bold text-[16px] mt-4 active:scale-[0.98] transition-transform"
        style={{ minHeight: 56, background: 'var(--wa)', color: '#fff' }}>
        Únete al grupo de WhatsApp
      </a>
    </main>
  );
}
