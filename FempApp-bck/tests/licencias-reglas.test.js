'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { habilitacion } = require('../services/licencias-reglas');
const caso = () => ({
  usuario: { id: 10, rol: 'deportista', estado: 'aprobado', aprobado: true },
  padron: { id: 7, temporada: 2027, estado: 'vigente' },
  licencia: { usuarioId: 10, padronId: 7, estado: 'habilitada', documentacionEstado: 'aprobada', cobroEstado: 'conciliado' },
  documentosVigentes: true,
});
test('cuenta aprobada sin licencia sigue restringida', () => {
  const c = caso(); c.licencia = null;
  assert.deepEqual(habilitacion(c), { codigo: 'LICENCIA_SIN_SOLICITAR', accesoNormal: false, puedePagar: false });
});
test('revisión documental precede al pago; pago precede al acceso', () => {
  const c = caso(); c.licencia.estado = 'solicitada'; c.licencia.cobroEstado = 'sin_iniciar';
  c.licencia.documentacionEstado = 'pendiente';
  assert.equal(habilitacion(c).puedePagar, false);
  c.licencia.documentacionEstado = 'aprobada';
  assert.deepEqual(habilitacion(c), { codigo: 'PAGO_HABILITADO', accesoNormal: false, puedePagar: true });
  c.licencia.cobroEstado = 'en_proceso';
  assert.deepEqual(habilitacion(c), { codigo: 'PAGO_EN_PROCESO', accesoNormal: false, puedePagar: false });
});
test('solo habilitación conciliada permite acceso; retorno del navegador no sirve', () => {
  for (const cobroEstado of ['success', 'approved', 'pending', 'rechazado', 'devuelto', 'contracargo', null, undefined]) {
    const c = caso(); c.licencia.cobroEstado = cobroEstado;
    assert.equal(habilitacion(c).accesoNormal, false, String(cobroEstado));
    assert.equal(habilitacion(c).puedePagar, false, String(cobroEstado));
  }
  assert.equal(habilitacion(caso()).accesoNormal, true);
});
test('no acredita a otra persona ni otro padrón; temporadas de perfiles no intervienen', () => {
  for (const cambios of [{ usuarioId: 11 }, { padronId: 8 }]) {
    const c = caso(); Object.assign(c.licencia, cambios);
    assert.equal(habilitacion(c).accesoNormal, false);
  }
  const c = caso(); c.usuario.perfiles = [{ temporada: 2027 }, { temporada: 2028 }];
  assert.equal(habilitacion(c).accesoNormal, true);
  c.padron.id = 8;
  assert.equal(habilitacion(c).accesoNormal, false);
});
test('documentos vencidos, cuenta bloqueada y licencia anulada/suspendida bloquean', () => {
  const c = caso(); c.documentosVigentes = false;
  assert.equal(habilitacion(c).accesoNormal, false);
  for (const estado of ['anulada', 'suspendida', 'desconocido']) {
    const x = caso(); x.licencia.estado = estado;
    assert.equal(habilitacion(x).accesoNormal, false);
  }
  const x = caso(); x.usuario.estado = 'bloqueado';
  assert.equal(habilitacion(x).accesoNormal, false);
});
test('otros roles no pagan licencia deportiva, pero requieren aprobación', () => {
  for (const rol of ['administrador', 'tecnico', 'juez', 'tesoreria', 'delegado']) {
    const c = caso(); c.usuario.rol = rol; c.licencia = null; c.padron = null;
    assert.equal(habilitacion(c).accesoNormal, true);
    assert.equal(habilitacion(c).puedePagar, false);
    c.usuario.estado = 'pendiente';
    assert.equal(habilitacion(c).accesoNormal, false);
  }
});
test('bonificación autorizada es un estado separado, nunca un pago MP ficticio', () => {
  const c = caso(); c.licencia.cobroEstado = 'bonificacion_autorizada';
  assert.equal(habilitacion(c).accesoNormal, true);
  c.licencia.estado = 'solicitada';
  assert.equal(habilitacion(c).accesoNormal, false);
});
test('datos ausentes, identificadores inválidos y estados desconocidos cierran acceso', () => {
  assert.equal(habilitacion().accesoNormal, false);
  for (const id of [null, undefined, '', 0, -1, 'abc']) {
    const c = caso(); c.usuario.id = id;
    assert.equal(habilitacion(c).accesoNormal, false);
  }
  const c = caso(); c.padron.estado = 'cerrado';
  assert.equal(habilitacion(c).accesoNormal, false);
  c.usuario.rol = 'rol_desconocido';
  assert.equal(habilitacion(c).accesoNormal, false);
});
