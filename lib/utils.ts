export const emailCorto = (email: string) => email.split('@')[0];

export const mostrarNombre = (jugador: { nombre: string; apodo?: string | null }) =>
  jugador.apodo || jugador.nombre.split(' ')[0];

export const formatearFechaCDMX = (fechaHora: string) => {
  return new Date(fechaHora).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatearHoraCDMX = (fechaHora: string) => {
  return new Date(fechaHora).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatearDiaCDMX = (fechaHora: string) => {
  return new Date(fechaHora).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};
