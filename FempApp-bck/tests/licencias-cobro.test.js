'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { centavos, cotizar, validarPago, resolverOperaciones, verificarFirma } = require('../services/licencias/cobro-reglas');
const ahora = '2026-11-04T15:00:00-03:00';
const tarifa = () => ({ cicloId: 1, ahora, aranceles: [{ id: 1, cicloId: 1, estado: 'aprobado', desde: '2026-11-01T00:00:00-03:00', importe: '130000.00' }], promociones: [] });
const intento = { externalReference: 'lic-test-unique', totalCentavos: 11700000, moneda: 'ARS' };
const config = { collectorId: '123', liveMode: false };
const pago = () => ({ id: '456', collector_id: 123, live_mode: false, external_reference: intento.externalReference, currency_id: 'ARS', transaction_amount: 117000, transaction_amount_refunded: 0, status: 'approved', date_last_updated: '2026-11-04T18:00:00Z' });
const op = (cambios = {}) => validarPago({ ...pago(), ...cambios }, intento, config);
const promocion = (porcentaje = 10) => ({ id: 2, cicloId: 1, estado: 'aprobado', desde: '2026-11-01T00:00:00-03:00', hasta: '2026-12-01T00:00:00-03:00', porcentaje });
test('importes exactos en centavos; rechaza coerciones y decimales extra', () => {
  assert.equal(centavos('0.01'), 1); assert.equal(centavos('130000'), 13000000);
  for (const x of [null, undefined, '', ' 1', '1e3', -1, Infinity, NaN, true, {}, '1.001']) assert.throws(() => centavos(x));
});
test('arancel sin configurar no tiene un precio predeterminado', () => assert.throws(() => cotizar({ ...tarifa(), aranceles: [] }), { code: 'ARANCEL_NO_CONFIGURADO' }));
test('descuento 10% con comisión de plataforma cero y snapshot inmutable', () => {
  const c = tarifa(); c.promociones.push(promocion()); const snapshot = cotizar(c);
  assert.equal(snapshot.totalCentavos, 11700000); assert.equal(snapshot.comisionPlataformaCentavos, 0);
  c.aranceles[0].importe = '150000'; assert.equal(snapshot.baseCentavos, 13000000);
  assert.throws(() => { snapshot.totalCentavos = 1; });
});
test('porcentaje fraccionario redondea el descuento a centavos', () => {
  const c = tarifa(); c.aranceles[0].importe = '1.01'; c.promociones.push(promocion('12.50'));
  assert.equal(cotizar(c).totalCentavos, 88);
});
test('100% requiere autorización de bonificación; no simula MP', () => {
  const c = tarifa(); c.promociones.push(promocion(100));
  assert.equal(cotizar(c).requiereBonificacion, true); assert.equal(cotizar(c).totalCentavos, 0);
  assert.throws(() => validarPago(pago(), { ...intento, totalCentavos: 0 }, config));
});
test('porcentaje mayor a 100 y negativo rechazados', () => {
  for (const n of [100.01, -1]) { const c = tarifa(); c.promociones.push(promocion(n)); assert.throws(() => cotizar(c)); }
});
test('vigencia futura no adelanta el precio; aplica exactamente al comenzar', () => {
  const c = tarifa(); c.aranceles.push({ ...c.aranceles[0], id: 2, importe: '150000', desde: '2026-12-01T00:00:00-03:00' });
  assert.equal(cotizar(c).baseCentavos, 13000000);
  c.ahora = '2026-12-01T00:00:00-03:00'; assert.equal(cotizar(c).baseCentavos, 15000000);
});
test('conserva último arancel vencido y genera aviso', () => {
  const c = tarifa(); c.aranceles[0].hasta = '2026-11-03T00:00:00-03:00';
  assert.equal(cotizar(c).totalCentavos, 13000000);
  assert.deepEqual(cotizar(c).avisos, ['REVISAR_VIGENCIA_ARANCEL']);
});
test('promoción vence al inicio del día posterior en Argentina', () => {
  const c = tarifa(); c.promociones.push(promocion());
  c.ahora = '2026-12-01T02:59:59Z'; assert.equal(cotizar(c).totalCentavos, 11700000);
  c.ahora = '2026-12-01T03:00:00Z'; assert.equal(cotizar(c).totalCentavos, 13000000);
});
test('no mezcla ciclos ni aplica borradores', () => {
  const c = tarifa(); c.promociones.push({ ...promocion(), cicloId: 2 }, { ...promocion(), estado: 'borrador' });
  assert.equal(cotizar(c).totalCentavos, 13000000);
});
test('programación simultánea ambigua no cobra', () => {
  const c = tarifa(); c.aranceles.push({ ...c.aranceles[0], id: 2 }); assert.throws(() => cotizar(c), { code: 'PROGRAMACION_AMBIGUA' });
});
test('fecha imposible y fecha sin zona horaria rechazadas', () => {
  for (const fecha of ['2026-02-30T00:00:00Z', '2026-11-04', '2026-11-04T12:00:00']) assert.throws(() => cotizar({ ...tarifa(), ahora: fecha }));
});
test('pago aprobado verificado es conciliable', () => assert.equal(resolverOperaciones([op()]), 'conciliado'));
for (const [nombre, cambio] of Object.entries({ receptor: { collector_id: 999 }, referencia: { external_reference: 'otra' }, moneda: { currency_id: 'USD' }, monto: { transaction_amount: 1 }, ambiente: { live_mode: true }, estado: { status: 'success' }, fecha: { date_last_updated: null }, reintegroAusente: { transaction_amount_refunded: undefined }, id: { id: 9007199254740992 } })) {
  test('no acredita pago con ' + nombre + ' incorrecto', () => assert.throws(() => op(cambio)));
}
test('pago pendiente o autorizado nunca habilita', () => {
  for (const status of ['pending', 'in_process', 'authorized']) assert.equal(resolverOperaciones([op({ status })]), 'en_proceso');
});
test('rechazado/cancelado no habilitan', () => {
  for (const status of ['rejected', 'cancelled']) assert.equal(resolverOperaciones([op({ status })]), 'sin_pago_aprobado');
});
test('webhook repetido no duplica el pago; dos IDs aprobados requieren revisión', () => {
  assert.equal(resolverOperaciones([op(), op()]), 'conciliado');
  assert.equal(resolverOperaciones([op(), op({ id: '457' })]), 'pago_duplicado');
});
test('rechazo de otra operación no revoca pago aprobado', () => assert.equal(resolverOperaciones([op(), op({ id: '457', status: 'rejected' })]), 'conciliado'));
test('reintegro parcial, total o contracargo exigen revisión', () => {
  for (const cambio of [{ transaction_amount_refunded: 1 }, { status: 'refunded' }, { status: 'charged_back' }]) assert.equal(resolverOperaciones([op(cambio)]), 'requiere_revision');
});
test('notificación antigua no vuelve a habilitar tras devolución', () => {
  const devuelto = op({ status: 'refunded', date_last_updated: '2026-11-05T18:00:00Z' });
  assert.equal(resolverOperaciones([devuelto, op()]), 'requiere_revision');
});
test('datos contradictorios con igual fecha no habilitan', () => assert.throws(() => resolverOperaciones([op(), op({ status: 'rejected' })]), { code: 'OPERACION_CONFLICTIVA' }));
const firma = (ts = '1793815200') => {
  const secret = 'secret-ficticio-solo-test'; const requestId = 'request-123'; const dataId = '456';
  const v1 = createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');
  return { secret, requestId, dataId, signature: `ts=${ts},v1=${v1}`, now: 1793815200000 };
};
test('valida firma HMAC con timestamp en segundos y milisegundos', () => {
  assert.equal(verificarFirma(firma()), true); assert.equal(verificarFirma(firma('1793815200000')), true);
});
test('rechaza ID modificado, firma falsa, secreto vacío y replay vencido', () => {
  for (const cambio of [{ dataId: '457' }, { requestId: 'otro' }, { signature: 'ts=1793815200,v1=00' }, { secret: '' }, { now: 1793815800000 }, { dataId: ['456', '457'] }]) assert.equal(verificarFirma({ ...firma(), ...cambio }), false);
});
test('rechaza headers duplicados o incompletos', () => {
  const f = firma(); assert.equal(verificarFirma({ ...f, signature: f.signature + ',ts=1793815200' }), false);
  assert.equal(verificarFirma({ ...f, requestId: undefined }), false);
});
