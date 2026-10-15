// Offline: no base de datos, correos ni llamadas reales a Mercado Pago.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Sequelize, DataTypes, Utils } = require('sequelize');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

test('Sequelize genera UUID y transacciones con la dependencia corregida', async () => {
  assert.match(Utils.toDefaultValue(DataTypes.UUIDV1()), /^[0-9a-f-]{14}1[0-9a-f-]{21}$/);
  assert.match(Utils.toDefaultValue(DataTypes.UUIDV4()), /^[0-9a-f-]{14}4[0-9a-f-]{21}$/);
  const db = new Sequelize('test', 'test', 'test', { dialect: 'mysql', logging: false });
  try {
    const t = new Sequelize.Transaction(db);
    assert.match(t.id, /^[0-9a-f-]{14}4[0-9a-f-]{21}$/);
    const M = db.define('Prueba', { id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } });
    assert.notEqual(M.build().id, M.build().id);
    assert.equal(require('module').createRequire(require.resolve('sequelize'))('uuid/package.json').version, '11.1.1');
  } finally { await db.close(); }
});

test('SDK real: checkout y consulta devuelven objetos directos; errores no reintentan', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  let fail = false;
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (fail) return new Response(JSON.stringify({ message: 'test-error' }), { status: 503 });
    const body = options.method === 'POST'
      ? { id: 'pref-test', init_point: 'https://test.invalid/checkout' }
      : { id: 123, status: 'approved', external_reference: 'cargo-test' };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  try {
    const config = new MercadoPagoConfig({ accessToken: 'TEST-offline', options: { timeout: 15000, maxRetries: 0 } });
    const pref = await new Preference(config).create({ body: { items: [{ title: 'Prueba', quantity: 1, unit_price: 100, currency_id: 'ARS' }] } });
    assert.equal(pref.id, 'pref-test');
    assert.equal(pref.body, undefined);
    assert.equal(JSON.parse(calls[0].options.body).items[0].unit_price, 100);
    assert.equal(calls[0].url, 'https://api.mercadopago.com/checkout/preferences/');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer TEST-offline');
    const payment = await new Payment(config).get({ id: 123 });
    assert.equal(payment.status, 'approved');
    assert.equal(calls[1].url, 'https://api.mercadopago.com/v1/payments/123');
    fail = true;
    await assert.rejects(new Preference(config).create({ body: { items: [] } }));
    assert.equal(calls.length, 3);
  } finally { global.fetch = originalFetch; }
});
