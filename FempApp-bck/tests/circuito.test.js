const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/circuito-reglas');
const { createHmac } = require('crypto');
const schedule = {
  inscripcionRequierePago: true,
  inscripcionDesde: '2026-10-10T00:00:00-03:00',
  inscripcionHasta: '2026-10-20T00:00:00-03:00',
  abmDesde: '2026-10-20T00:00:00-03:00',
  abmHasta: '2026-10-22T00:00:00-03:00',
  pagoDesde: '2026-10-22T00:00:00-03:00',
  pagoHasta: '2026-10-25T00:00:00-03:00',
};
test('cargo fijo por evento; gratuito sin comisión; precisión decimal', () => {
  assert.deepEqual(R.montos('50000.00', true), {
    montoBase: '50000.00',
    montoComision: '2000.00',
    montoTotal: '52000.00',
  });
  assert.equal(R.montos('65000', true).montoComision, '2000.00');
  assert.equal(R.montos(null, false).montoTotal, '0.00');
  assert.equal(R.montos('10.01', true).montoTotal, '2010.01');
  for (const x of ['-1', '0', 'Infinity', '10.123', '1e4', null])
    assert.throws(() => R.montos(x, true));
});
test('cortes exactos, calendario y pago tras confirmación', () => {
  const ev = R.calendario(schedule);
  assert.equal(R.etapa(ev, new Date('2026-10-10T02:59:59Z')), 'por_abrir');
  assert.equal(R.etapa(ev, new Date('2026-10-10T03:00:00Z')), 'inscripcion');
  assert.equal(R.etapa(ev, new Date('2026-10-20T03:00:00Z')), 'abm');
  assert.equal(R.etapa(ev, new Date('2026-10-22T03:00:00Z')), 'por_confirmar');
  ev.inscripcionesConfirmadasAt = new Date();
  assert.equal(R.etapa(ev, new Date('2026-10-22T03:00:00Z')), 'pago');
  assert.equal(R.etapa(ev, new Date('2026-10-25T03:00:00Z')), 'pago_cerrado');
  assert.throws(() =>
    R.calendario({ ...schedule, pagoDesde: '2026-10-21T00:00:00-03:00' }),
  );
  assert.throws(() =>
    R.calendario({ ...schedule, abmHasta: '2026-02-30T00:00:00Z' }),
  );
  assert.equal(R.etapa({}), 'sin_configurar');
});
test('perfiles duplicados, identificadores y filtro día argentino', () => {
  assert.throws(() => R.ids([1, 1]));
  assert.throws(() => R.ids([1, -1]));
  assert.deepEqual(R.ids([3, 1]), [1, 3]);
  assert.equal(
    R.inicioDiaArgentina('2026-10-20').toISOString(),
    '2026-10-20T03:00:00.000Z',
  );
  assert.throws(() => R.inicioDiaArgentina('2026-02-29'));
});
test('conciliación rechaza moneda, monto y referencia ajenos', () => {
  const p = { externalReference: 'cargo_1', montoTotal: '52000.00' };
  assert.ok(
    R.conciliable(
      {
        currency_id: 'ARS',
        external_reference: 'cargo_1',
        transaction_amount: 52000,
      },
      p,
    ),
  );
  for (const v of [
    {
      currency_id: 'USD',
      external_reference: 'cargo_1',
      transaction_amount: 52000,
    },
    {
      currency_id: 'ARS',
      external_reference: 'otro',
      transaction_amount: 52000,
    },
    {
      currency_id: 'ARS',
      external_reference: 'cargo_1',
      transaction_amount: 1,
    },
  ])
    assert.equal(R.conciliable(v, p), false);
});
test('firma HMAC correcta, adulterada y ausente', () => {
  const sig = createHmac('sha256', 'test')
    .update('id:123;request-id:abc;ts:100;')
    .digest('hex');
  const headers = { 'x-request-id': 'abc', 'x-signature': `ts=100,v1=${sig}` };
  assert.ok(R.firmaValida({ 'data.id': '123' }, headers, 'test'));
  assert.equal(R.firmaValida({ 'data.id': '999' }, headers, 'test'), false);
  assert.equal(R.firmaValida({}, headers, 'test'), false);
});
