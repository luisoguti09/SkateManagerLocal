// Integration of real Express routes, JWT middleware and services; in-memory ORM doubles.
// No connection to Railway or Mercado Pago.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
process.env.JWT_SECRET = 'integration-test-only';
process.env.MP_ACCESS_TOKEN = 'TEST-only';
process.env.MP_COLLECTOR_ID = '987';
process.env.MP_WEBHOOK_SECRET = 'test';
const tables = {};
let barrier = Promise.resolve();
function match(row, where = {}) {
  return Reflect.ownKeys(where).every((k) => {
    const v = where[k];
    if (k === Op.and) return v.every((w) => match(row, w));
    if (k === Op.or) return v.some((w) => match(row, w));
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date))
      return Reflect.ownKeys(v).every((op) =>
        op === Op.ne
          ? row[k] !== v[op]
          : op === Op.in
            ? v[op].includes(row[k])
            : op === Op.gte
              ? +new Date(row[k]) >= +v[op]
              : op === Op.lt
                ? +new Date(row[k]) < +v[op]
                : op === Op.like
                  ? String(row[k] || '').includes(v[op].replaceAll('%', ''))
                  : false,
      );
    return String(row[k]) === String(v);
  });
}
function model(name) {
  tables[name] = [];
  function instance(data) {
    return {
      ...data,
      toJSON() {
        const out = {};
        for (const [k, v] of Object.entries(this))
          if (typeof v !== 'function') out[k] = v;
        return out;
      },
      async update(values) {
        Object.assign(this, values);
        return this;
      },
    };
  }
  return {
    async findByPk(id) {
      return tables[name].find((x) => Number(x.id) === Number(id)) || null;
    },
    async findAll(o = {}) {
      return tables[name].filter((x) => match(x, o.where));
    },
    async findOne(o = {}) {
      return (await this.findAll(o))[0] || null;
    },
    async count(o = {}) {
      return (await this.findAll(o)).length;
    },
    async create(v) {
      if (
        name === 'CargoInscripcion' &&
        tables[name].some(
          (x) => x.eventoId === v.eventoId && x.usuarioId === v.usuarioId,
        )
      )
        throw Error('unique cargo');
      const row = instance({
        id: tables[name].length + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...v,
      });
      tables[name].push(row);
      return row;
    },
    async update(v, o) {
      for (const x of await this.findAll(o)) await x.update(v);
    },
    async findOrCreate(o) {
      const x = await this.findOne(o);
      return x
        ? [x, false]
        : [await this.create({ ...o.where, ...o.defaults }), true];
    },
  };
}
const db = {};
for (const n of [
  'Usuario',
  'Evento',
  'UsuarioEventos',
  'PerfilDeportivo',
  'Club',
  'ClubSede',
  'PrecioParticipacionEvento',
  'CargoInscripcion',
  'Pago',
  'CambioInscripcion',
  'OperacionPago',
])
  db[n] = model(n);
db.sequelize = {
  transaction: async (fn) => {
    let release;
    const before = barrier;
    barrier = new Promise((r) => (release = r));
    await before;
    try {
      return await fn({ LOCK: { UPDATE: 'UPDATE' } });
    } finally {
      release();
    }
  },
};
require.cache[require.resolve('../models')] = { exports: db };
let preferenceCalls = 0;
let latestPayment;
require.cache[require.resolve('mercadopago')] = {
  exports: {
    configure() {},
    preferences: {
      async create(pref) {
        preferenceCalls++;
        assert.equal(pref.items[0].quantity, 1);
        return {
          body: {
            id: 'pref1',
            init_point: 'https://test.invalid/checkout',
            ...pref,
          },
        };
      },
    },
    payment: {
      async get() {
        return { body: latestPayment };
      },
    },
  },
};
const app = express();
app.use(express.json());
app.use('/eventos', require('../routes/circuito.router'));
app.use('/pagos', require('../routes/pagos.router'));
app.use(
  '/precios-participacion',
  require('../routes/preciosParticipacion.router'),
);
let server, base;
const ready = new Promise((r) => {
  server = app.listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    r();
  });
});
after(() => server.close());
async function request(
  path,
  role = 'deportista',
  body,
  method = body ? 'POST' : 'GET',
  asId,
) {
  await ready;
  const id =
    asId || { deportista: 1, administrador: 2, tesoreria: 3 }[role] || 1;
  const headers = {};
  if (role)
    headers.Authorization =
      'Bearer ' + jwt.sign({ id, rol: role }, process.env.JWT_SECRET);
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}
const at = (delta) => new Date(Date.now() + delta);
let ev;
test('real routes: permissions, ABM, immutable charge, retry and reconciliation', async () => {
  for (const [id, rol] of [
    [1, 'deportista'],
    [2, 'administrador'],
    [3, 'tesoreria'],
    [4, 'deportista'],
  ])
    await db.Usuario.create({
      id,
      rol,
      aprobado: true,
      estado: 'aprobado',
      nombre: 'Persona ' + id,
      dni: '100' + id,
    });
  ev = await db.Evento.create({
    nombre: 'Evento',
    titulo: 'Evento',
    inscripcionRequierePago: true,
    inscripcionDesde: at(-90000),
    inscripcionHasta: at(90000),
    abmDesde: at(90000),
    abmHasta: at(180000),
    pagoDesde: at(190000),
    pagoHasta: at(500000),
  });
  for (const id of [10, 11, 12])
    await db.PerfilDeportivo.create({
      id,
      usuarioId: 1,
      activa: true,
      disciplina: 'Libre',
      categoria: 'Senior',
      club: 'Club A',
    });
  await db.PerfilDeportivo.create({ id: 99, usuarioId: 4, activa: true });
  assert.equal((await request('/pagos', null)).status, 401);
  assert.equal((await request('/pagos', 'administrador')).status, 403);
  assert.equal((await request('/pagos/cargos', 'administrador')).status, 403);
  assert.equal(
    (await request('/pagos/resumen/evento/1', 'administrador')).status,
    403,
  );
  assert.equal(
    (await request('/pagos/filtros/clubes', 'administrador')).status,
    403,
  );
  assert.equal((await request('/pagos', 'tesoreria')).status, 200);
  // JWT role cannot override current role in the database.
  assert.equal(
    (await request('/pagos', 'tesoreria', undefined, 'GET', 1)).status,
    403,
  );
  assert.equal(
    (
      await request('/precios-participacion', 'administrador', {
        eventoId: 1,
        cantidadParticipaciones: 3,
        monto: 65000,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request('/precios-participacion', 'tesoreria', {
        eventoId: 1,
        cantidadParticipaciones: 3,
        monto: 65000,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request('/precios-participacion/evento/1', 'administrador')).status,
    200,
  );
  assert.equal(
    (await request('/eventos/1/inscripciones.csv', 'tesoreria')).status,
    403,
  );
  assert.equal(
    (await request('/eventos/1/confirmar-inscripciones', 'administrador', {}))
      .status,
    409,
  );
  assert.equal(
    (
      await request(
        '/eventos/1/mi-inscripcion',
        'deportista',
        { perfilDeportivoIds: [99] },
        'PUT',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        '/eventos/1/mi-inscripcion',
        'deportista',
        { perfilDeportivoIds: [10, 11, 12] },
        'PUT',
      )
    ).status,
    200,
  );
  assert.equal(
    (await request('/pagos/crear-preferencia', 'deportista', { eventoId: 1 }))
      .status,
    409,
  );
  assert.equal(
    (
      await request(
        '/eventos/1/mi-inscripcion',
        'deportista',
        { perfilDeportivoIds: [10] },
        'PUT',
      )
    ).status,
    409,
  );
  ev.inscripcionHasta = at(-1000);
  ev.abmDesde = at(90000);
  assert.equal((await request('/eventos/1/circuito')).data.etapa, 'cuadernillo');
  assert.equal((await request('/eventos/1/mi-inscripcion', 'deportista', { perfilDeportivoIds: [10] }, 'PUT')).status, 409);
  assert.equal((await request('/eventos/1/inscribir', 'deportista', { perfilDeportivoIds: [10] })).status, 409);
  assert.equal((await request('/eventos/1/confirmar-inscripciones', 'administrador', {})).status, 409);
  assert.equal((await request('/pagos/crear-preferencia', 'deportista', { eventoId: 1 })).status, 409);
  assert.equal((await request('/eventos/1/inscripciones.csv', 'administrador')).status, 200);
  assert.equal(tables.UsuarioEventos.filter(x => x.estadoInscripcion !== 'baja').length, 3);
  ev.abmDesde = at(-1000);
  ev.abmHasta = at(90000);
  assert.equal(
    (
      await request(
        '/eventos/1/mi-inscripcion',
        'deportista',
        { perfilDeportivoIds: [10] },
        'PUT',
      )
    ).status,
    200,
  );
  assert.equal(
    tables.UsuarioEventos.filter((x) => x.estadoInscripcion === 'baja').length,
    2,
  );
  assert.equal(
    (
      await request(
        '/eventos/1/mi-inscripcion',
        'deportista',
        { perfilDeportivoIds: [10, 11, 12] },
        'PUT',
      )
    ).status,
    200,
  );
  const csv = await request('/eventos/1/inscripciones.csv', 'administrador');
  assert.equal(csv.status, 200);
  assert.ok(!csv.data.includes('monto'));
  ev.abmHasta = at(-500);
  ev.pagoDesde = at(-100);
  assert.equal(
    (await request('/eventos/1/confirmar-inscripciones', 'administrador', {}))
      .status,
    200,
  );
  assert.equal(
    (await request('/eventos/1/confirmar-inscripciones', 'administrador', {}))
      .status,
    200,
  );
  assert.equal(tables.CargoInscripcion.length, 1);
  assert.equal(tables.CargoInscripcion[0].montoTotal, '67000.00');
  assert.equal(
    (
      await request(
        '/eventos/1/mi-inscripcion',
        'deportista',
        { perfilDeportivoIds: [] },
        'PUT',
      )
    ).status,
    409,
  );
  const admin = await request('/eventos/1/circuito', 'administrador');
  assert.equal(admin.data.cargo, null);
  assert.equal(
    (
      await request('/precios-participacion', 'tesoreria', {
        eventoId: 1,
        cantidadParticipaciones: 3,
        monto: 90000,
      })
    ).status,
    200,
  );
  assert.equal(tables.CargoInscripcion[0].montoTotal, '67000.00');
  const results = await Promise.all([
    request('/pagos/crear-preferencia', 'deportista', {
      eventoId: 1,
      quantity: 1,
    }),
    request('/pagos/crear-preferencia', 'deportista', { eventoId: 1 }),
  ]);
  assert.ok(results.some((x) => x.status === 200));
  assert.equal(preferenceCalls, 1);
  assert.equal(tables.Pago.length, 1);
  assert.equal(
    (await request('/pagos/crear-preferencia', 'deportista', { eventoId: 1 }))
      .status,
    200,
  );
  assert.equal(preferenceCalls, 1);
  assert.equal(
    (
      await request('/pagos/crear-preferencia', 'deportista', {
        eventoId: 1,
        usuarioId: 4,
      })
    ).status,
    403,
  );
  latestPayment = {
    id: 123,
    collector_id: 987,
    currency_id: 'ARS',
    transaction_amount: 67000,
    external_reference: tables.Pago[0].externalReference,
    status: 'approved',
    date_last_updated: new Date().toISOString(),
  };
  assert.equal(
    (await request('/pagos/confirmar?payment_id=123', 'administrador')).status,
    403,
  );
  assert.equal(
    (
      await request(
        '/pagos/confirmar?payment_id=123',
        'deportista',
        undefined,
        'GET',
        4,
      )
    ).status,
    404,
  );
  assert.equal((await request('/pagos/confirmar?payment_id=123')).status, 200);
  assert.equal(tables.CargoInscripcion[0].estado, 'pagado');
  assert.equal((await request('/pagos/confirmar?payment_id=123')).status, 200);
  assert.equal(tables.OperacionPago.length, 1);
  assert.equal(
    (await request('/pagos/crear-preferencia', 'deportista', { eventoId: 1 }))
      .status,
    409,
  );
  assert.equal(
    (await request('/pagos/webhook', null, { type: 'payment' })).status,
    401,
  );
  // Refund affects the confirmed obligation without rewriting its amount.
  latestPayment = {
    ...latestPayment,
    status: 'refunded',
    date_last_updated: new Date(Date.now() + 1000).toISOString(),
  };
  assert.equal((await request('/pagos/confirmar?payment_id=123')).status, 200);
  assert.equal(tables.CargoInscripcion[0].estado, 'requiere_revision');
  assert.equal(tables.CargoInscripcion[0].montoTotal, '67000.00');
  // A free event confirms at zero, without checkout or a platform fee.
  const free = await db.Evento.create({
    ...ev.toJSON(),
    id: 2,
    inscripcionRequierePago: false,
    inscripcionesConfirmadasAt: null,
  });
  await db.UsuarioEventos.create({
    EventoId: 2,
    UsuarioId: 1,
    perfilDeportivoId: 10,
    estadoInscripcion: 'provisoria',
    disciplina: 'Libre',
  });
  assert.equal(
    (await request('/eventos/2/confirmar-inscripciones', 'administrador', {}))
      .status,
    200,
  );
  assert.equal(tables.CargoInscripcion[1].montoTotal, '0.00');
  assert.equal(tables.CargoInscripcion[1].estado, 'sin_cargo');
  assert.equal(
    (await request('/pagos/crear-preferencia', 'deportista', { eventoId: 2 }))
      .status,
    409,
  );
});
