'use strict';

// Primera pieza del circuito de licencias. Todavía NO conectada al middleware.
// Todos los argumentos deben provenir de consultas del servidor, nunca del body,
// del JWT ni del retorno de Checkout. No verifica un pago contra Mercado Pago.
const ROLES = new Set(['deportista', 'administrador', 'tecnico', 'juez', 'tesoreria']);
const idValido = value => (typeof value === 'number' || (typeof value === 'string' && /^[1-9]\d*$/.test(value))) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const mismoId = (a, b) => idValido(a) && idValido(b) && Number(a) === Number(b);
const resultado = (codigo, accesoNormal = false, puedePagar = false) =>
  ({ codigo, accesoNormal, puedePagar });

function habilitacion({ usuario, padron, licencia, documentosVigentes = false } = {}) {
  if (!usuario || !idValido(usuario.id) || !ROLES.has(usuario.rol))
    return resultado('CUENTA_INVALIDA');
  if (usuario.estado === 'bloqueado') return resultado('CUENTA_BLOQUEADA');
  if (usuario.estado !== 'aprobado' || usuario.aprobado !== true)
    return resultado('CUENTA_EN_REVISION');
  // No concede permisos de rol: el middleware conserva requireRole y sus alcances.
  if (usuario.rol !== 'deportista') return resultado('NO_REQUIERE_LICENCIA', true);
  if (!padron || !idValido(padron.id) || padron.estado !== 'vigente')
    return resultado('PADRON_NO_DISPONIBLE');
  if (!licencia) return resultado('LICENCIA_SIN_SOLICITAR');
  if (!mismoId(licencia.usuarioId, usuario.id) || !mismoId(licencia.padronId, padron.id))
    return resultado('LICENCIA_NO_CORRESPONDE');
  if (['suspendida', 'anulada'].includes(licencia.estado))
    return resultado('LICENCIA_NO_HABILITADA');
  if (!['solicitada', 'habilitada'].includes(licencia.estado))
    return resultado('LICENCIA_ESTADO_INVALIDO');
  if (licencia.documentacionEstado !== 'aprobada' || documentosVigentes !== true)
    return resultado('DOCUMENTACION_EN_REVISION');
  // Estos estados son internos y deberán persistirse SOLO tras conciliación
  // transaccional contra el proveedor o autorización auditada de bonificación.
  if (licencia.estado === 'habilitada' &&
      ['conciliado', 'bonificacion_autorizada'].includes(licencia.cobroEstado))
    return resultado('LICENCIA_HABILITADA', true);
  if (licencia.estado === 'solicitada' && licencia.cobroEstado === 'sin_iniciar')
    return resultado('PAGO_HABILITADO', false, true);
  if (licencia.cobroEstado === 'en_proceso') return resultado('PAGO_EN_PROCESO');
  return resultado('REQUIERE_CONCILIACION');
}

module.exports = { habilitacion };
