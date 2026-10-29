'use strict';
// La misma decisión se usa al abrir el escáner y al registrar la asistencia.
function habilitacionAsistencia(evento, inscripciones, cargo, ahora = new Date()) {
  const vigentes = inscripciones.filter(i => i.estadoInscripcion !== 'baja');
  if (!vigentes.length) return { disponible: false, motivo: 'Para registrar tu asistencia necesitás estar inscripta en este evento.' };
  if (!evento.inscripcionesConfirmadasAt || !vigentes.every(i => i.estadoInscripcion === 'confirmada'))
    return { disponible: false, motivo: 'Tu asistencia se habilitará cuando la nómina esté confirmada.' };
  if (evento.inscripcionRequierePago !== false && !(evento.inscripcionRequierePago === true && cargo?.estado === 'pagado'))
    return { disponible: false, motivo: 'Tu asistencia se habilitará cuando el pago esté aprobado y conciliado.' };
  if (evento.checkinOpenAt && evento.checkinCloseAt && !(ahora >= new Date(evento.checkinOpenAt) && ahora <= new Date(evento.checkinCloseAt)))
    return { disponible: false, motivo: 'El registro de asistencia está fuera de horario.' };
  return { disponible: true, motivo: '' };
}
module.exports = { habilitacionAsistencia };
