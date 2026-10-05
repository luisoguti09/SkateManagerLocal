const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/circuito-reglas');
const body = {
  inscripcionRequierePago: true,
  inscripcionDesde: '2026-10-01T09:00:00-03:00',
  inscripcionHasta: '2026-10-25T21:00:00-03:00',
  abmDesde: '2026-10-27T09:00:00-03:00',
  abmHasta: '2026-10-28T09:00:00-03:00',
  pagoDesde: '2026-10-29T09:00:00-03:00',
  pagoHasta: '2026-10-30T09:00:00-03:00',
};
test('cuadernillo entre inscripción y ABM: límites argentinos exactos', () => {
  const ev = R.calendario(body);
  assert.equal(R.etapa(ev, new Date('2026-10-25T23:59:59Z')), 'inscripcion');
  assert.equal(R.etapa(ev, new Date('2026-10-26T00:00:00Z')), 'cuadernillo');
  assert.equal(R.etapa(ev, new Date('2026-10-27T11:59:59Z')), 'cuadernillo');
  assert.equal(R.etapa(ev, new Date('2026-10-27T12:00:00Z')), 'abm');
  assert.equal(R.etapa(ev, new Date('2026-10-28T12:00:00Z')), 'por_confirmar');
  const inmediato = R.calendario({ ...body, abmDesde: body.inscripcionHasta });
  assert.equal(R.etapa(inmediato, new Date('2026-10-26T00:00:00Z')), 'abm');
});
test('ABM obligatoria y coherente; eventos antiguos sin apertura requieren revisión', () => {
  for (const abmDesde of [null, '2026-10-24T09:00:00-03:00', body.abmHasta])
    assert.throws(() => R.calendario({ ...body, abmDesde }), { status: 400 });
  assert.equal(R.etapa({ ...body, abmDesde: null }), 'sin_configurar');
  const confirmado = { ...body, abmDesde: null, inscripcionesConfirmadasAt: new Date() };
  assert.equal(R.etapa(confirmado, new Date('2026-10-29T12:00:00Z')), 'pago');
});
