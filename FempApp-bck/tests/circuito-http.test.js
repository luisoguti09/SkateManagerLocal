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
        ...(name === 'Usuario' ? { sessionVersion: 0 } : {}),
        id: Math.max(0, ...tables[name].map(row => Number(row.id) || 0)) + 1,
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
  'TarifarioGeneral',
  'TarifarioEstado',
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
require.cache[require.resolve('../models/usuario.model')] = { exports: db.Usuario };
let preferenceCalls = 0;
let latestPayment;
require.cache[require.resolve('mercadopago')] = {
  exports: {
    MercadoPagoConfig: class { constructor(config) { assert.equal(config.accessToken, 'TEST-only'); } },
    Preference: class {
      async create({ body: pref }) {
        preferenceCalls++;
        assert.equal(pref.items[0].quantity, 1);
        assert.equal(pref.items[0].unit_price, 65000);
        assert.ok(!pref.items[0].description.includes('gestión'));
        return { id: 'pref1', init_point: 'https://test.invalid/checkout', ...pref };
      }
    },
    Payment: class {
      async get({ id }) {
        assert.equal(id, 123);
        return latestPayment;
      }
    }
  }
};
const app = express();
app.use(express.json());
app.use('/eventos', require('../routes/circuito.router'));
app.use('/perfiles-deportivos', require('../routes/perfilesdeportivos.router'));
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
  await db.TarifarioEstado.create({ id: 1, tarifarioId: null });
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
  const rowsBeforeEmpty = tables.UsuarioEventos.length;
  const auditsBeforeEmpty = tables.CambioInscripcion.length;
  assert.equal((await request('/eventos/1/mi-inscripcion', 'deportista', { perfilDeportivoIds: [] }, 'PUT')).status, 400);
  assert.equal(tables.UsuarioEventos.length, rowsBeforeEmpty);
  assert.equal(tables.CambioInscripcion.length, auditsBeforeEmpty);

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
      await request('/precios-participacion/general', 'tesoreria', {
        versionActual: null, individual1: 55000, individual2: 65000, individual3: 65000, pareja: 35000, conjunto: 30000,
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
  assert.equal((await request('/eventos/1/mi-inscripcion', 'deportista', { perfilDeportivoIds: [10, 11, 12, 99] }, 'PUT')).status, 409, 'No se agregan perfiles después de confirmar fuera de ABM');
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
  assert.equal((await request('/eventos/1/mi-inscripcion', 'deportista', { perfilDeportivoIds: [] }, 'PUT')).status, 200, 'ABM permite la baja total');
  assert.equal(tables.UsuarioEventos.filter(x => x.EventoId === 1 && x.UsuarioId === 1 && x.estadoInscripcion !== 'baja').length, 0);
  assert.equal((await request('/eventos/1/mi-inscripcion', 'deportista', { perfilDeportivoIds: [10, 11, 12] }, 'PUT')).status, 200);
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
  assert.equal(tables.CargoInscripcion[0].montoTotal, '65000.00');
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
      await request('/precios-participacion/general', 'tesoreria', {
        versionActual: 1, individual1: 55000, individual2: 65000, individual3: 90000, pareja: 35000, conjunto: 30000,
      })
    ).status,
    200,
  );
  assert.equal(tables.CargoInscripcion[0].montoTotal, '65000.00');
  const antiguo = tables.CargoInscripcion[0];
  antiguo.montoComision = '2000.00';
  antiguo.montoTotal = '67000.00';
  assert.equal((await request('/pagos/crear-preferencia', 'deportista', { eventoId: 1 })).status, 409);
  assert.equal(preferenceCalls, 0);
  antiguo.montoComision = '0.00';
  antiguo.montoTotal = '65000.00';
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
    transaction_amount: 65000,
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
  assert.equal(tables.CargoInscripcion[0].montoTotal, '65000.00');
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

test('constancia: pago propio, bajas, reintegro y gratuito; sin exigir asistencia', async () => {
  await db.Usuario.create({ id: 910, rol: 'deportista', aprobado: true, estado: 'aprobado', nombre: 'Deportista', dni: '123', club: 'Club' });
  const evento = await db.Evento.create({ id: 900, titulo: 'Evento futuro', fechaInicio: '2030-11-20', fechaFin: '2030-11-22', inscripcionRequierePago: true });
  const consultar = async () => {
    const respuesta = await request('/eventos/900/certificado-datos', 'deportista', undefined, 'GET', 910);
    const circuito = await request('/eventos/900/circuito', 'deportista', undefined, 'GET', 910);
    assert.equal(circuito.data.certificadoDisponible, respuesta.status === 200);
    return respuesta;
  };
  assert.equal((await consultar()).status, 403);
  const ins = await db.UsuarioEventos.create({ EventoId: 900, UsuarioId: 910, estadoInscripcion: 'confirmada', perfilDeportivoId: 999 });
  await db.CargoInscripcion.create({ eventoId: 900, usuarioId: 4, estado: 'pagado' });
  assert.equal((await consultar()).status, 403, 'El pago de otra persona no habilita');
  const cargo = await db.CargoInscripcion.create({ eventoId: 900, usuarioId: 910, estado: 'adeudado', participacionesSnapshot: [{ perfilDeportivoId: 999, club: 'Club de la inscripción' }] });
  assert.equal((await consultar()).status, 403);
  await cargo.update({ estado: 'pagado' });
  const permitido = await consultar();
  assert.equal(permitido.status, 200);
  assert.equal(permitido.data.evento.fechaInicio, '2030-11-20');
  assert.equal(permitido.data.usuario.club, 'Club de la inscripción');
  assert.ok(permitido.data.emitidoAt);
  await cargo.update({ estado: 'requiere_revision' });
  assert.equal((await consultar()).status, 403);
  await evento.update({ inscripcionRequierePago: false });
  assert.equal((await consultar()).status, 200);
  await ins.update({ estadoInscripcion: 'baja' });
  assert.equal((await consultar()).status, 403);
  assert.equal((await request('/eventos/900/certificado-datos', null)).status, 401);
  assert.equal((await request('/eventos/900/certificado-datos', 'administrador')).status, 403);
});



test('tarifario general: permisos, versiones, cargos mixtos y reutilización entre eventos', async () => {
  const valores = { individual1: 55000, individual2: 65000, individual3: 70000, pareja: 35000, conjunto: 30000 };
  assert.equal((await request('/precios-participacion/general', null)).status, 401);
  assert.equal((await request('/precios-participacion/general', 'administrador')).status, 403);
  assert.equal((await request('/precios-participacion/general', 'deportista', { ...valores, versionActual: 2 })).status, 403);
  assert.equal((await request('/precios-participacion', 'tesoreria', {})).status, 410);
  const original = (await request('/precios-participacion/general', 'tesoreria')).data.actual;
  assert.equal((await request('/precios-participacion/general', 'tesoreria', { ...valores, versionActual: original.id, pareja: -1 })).status, 400);
  assert.equal((await request('/precios-participacion/general', 'tesoreria', { ...valores, versionActual: null })).status, 409);
  const versiones = await Promise.all([1,2].map(() => request('/precios-participacion/general', 'tesoreria', { ...valores, versionActual: original.id })));
  assert.deepEqual(versiones.map(x => x.status).sort(), [200,409]);
  const vigente = (await request('/precios-participacion/general', 'tesoreria')).data.actual;
  const historialAntes = tables.TarifarioGeneral.length;
  assert.equal((await request('/precios-participacion/general', 'tesoreria', { ...valores, versionActual: vigente.id })).status, 200);
  assert.equal(tables.TarifarioGeneral.length, historialAntes);
  assert.equal((await request('/precios-participacion/general', 'deportista')).data.historial.length, 0);
  for (const [id, disciplina, modalidad] of [[51,'Libre','Individual'],[52,'Figuras Obligatorias','Individual'],[53,'Parejas','Parejas'],[54,'Precisión','Show'],[55,'Precisión','Cuarteto']]) {
    await db.PerfilDeportivo.create({ id, usuarioId: 1, activa: true, disciplina, modalidad, club: 'Club A' });
  }
  async function eventoMixto() {
    const e = await db.Evento.create({ titulo: 'Mixto', inscripcionRequierePago: true, inscripcionDesde: at(-90000), inscripcionHasta: at(-80000), abmDesde: at(-70000), abmHasta: at(-60000), pagoDesde: at(-50000), pagoHasta: at(500000) });
    for (const id of [51,52,53,54,55]) await db.UsuarioEventos.create({ EventoId: e.id, UsuarioId: 1, perfilDeportivoId: id, estadoInscripcion: 'provisoria' });
    return e;
  }
  const primero = await eventoMixto();
  assert.equal((await request(`/eventos/${primero.id}/confirmar-inscripciones`, 'administrador', {})).status, 200);
  const cargo = tables.CargoInscripcion.find(c => c.eventoId === primero.id);
  assert.equal(cargo.montoBase, '160000.00');
  assert.equal(cargo.montoTotal, '160000.00');
  assert.equal(cargo.liquidacionSnapshot.tarifarioId, vigente.id);
  assert.equal(cargo.liquidacionSnapshot.detalle.find(x => x.concepto === 'conjunto').cantidad, 2);
  const revision = await request('/precios-participacion/general', 'tesoreria', { ...valores, individual2: 66000, versionActual: vigente.id });
  assert.equal(revision.status, 200);
  const segundo = await eventoMixto();
  assert.equal((await request(`/eventos/${segundo.id}/confirmar-inscripciones`, 'administrador', {})).status, 200);
  assert.equal(tables.CargoInscripcion.find(c => c.eventoId === segundo.id).montoTotal, '161000.00');
  assert.equal(cargo.montoTotal, '160000.00');
  assert.equal(cargo.liquidacionSnapshot.tarifarioId, vigente.id);
  assert.equal((await request(`/eventos/${primero.id}/confirmar-inscripciones`, 'administrador', {})).status, 200);
  assert.equal(tables.CargoInscripcion.filter(c => c.eventoId === primero.id).length, 1);
});


test('perfil deportivo: guarda la última disciplina, actualiza origen sin cambiar identidad y conserva inscripciones', async () => {
  await db.Usuario.create({ id: 1200, rol: 'deportista', aprobado: true, estado: 'aprobado' });
  const borrador = { usuarioId: 1200, disciplina: 'Figuras Obligatorias', origenCategoria: 'CAP', categoria: 'Tercera' };
  Object.assign(borrador, { disciplina: 'Danza', categoria: 'Básico · Infantil · Combinada', divisional: 'Danza Nacional', licencia: 'Nacional' });
  const creado = await request('/perfiles-deportivos', 'deportista', borrador, 'POST', 1200);
  assert.equal(creado.status, 201);
  assert.equal(creado.data.disciplina, 'Danza');
  const id = creado.data.id;
  const perfilDb = await db.PerfilDeportivo.findByPk(id);
  await perfilDb.update({ clubSedeId: 77 });
  const sinSede = await request(`/perfiles-deportivos/${id}`, 'deportista', { clubSedeId: null }, 'PUT', 1200);
  assert.equal(sinSede.status, 200);
  assert.equal(sinSede.data.clubSedeId, null, 'Una sede retirada no reaparece al guardar');
  const registro = await db.UsuarioEventos.create({ EventoId: 1200, UsuarioId: 1200, perfilDeportivoId: id, disciplina: 'Danza', categoria: borrador.categoria, estadoInscripcion: 'provisoria' });
  const actualizado = await request(`/perfiles-deportivos/${id}`, 'deportista', { origenCategoria: 'PROMOS_FEMPA' }, 'PUT', 1200);
  assert.equal(actualizado.status, 200);
  assert.equal(actualizado.data.origenCategoria, 'PROMOS_FEMPA');
  assert.equal(actualizado.data.disciplina, 'Danza');
  assert.equal(actualizado.data.id, id);
  assert.equal((await request(`/perfiles-deportivos/${id}`, 'deportista', { disciplina: 'Libre' }, 'PUT', 4)).status, 403);
  assert.equal(registro.disciplina, 'Danza');
  assert.equal(registro.categoria, borrador.categoria);
});

test('circuito informa habilitación de asistencia solo con inscripción propia confirmada y pago conciliado', async()=>{
  const uid=2200,eid=2200;
  await db.Usuario.create({id:uid,rol:'deportista',aprobado:true,estado:'aprobado'});
  const ev=await db.Evento.create({id:eid,inscripcionRequierePago:true,inscripcionesConfirmadasAt:'2026-10-29'});
  const consultar=async()=>{const r=await request(`/eventos/${eid}/circuito`,'deportista',undefined,'GET',uid);assert.equal(r.status,200);return r.data.asistenciaDisponible;};
  const ins=await db.UsuarioEventos.create({EventoId:eid,UsuarioId:uid,estadoInscripcion:'confirmada',perfilDeportivoId:2200});
  await db.CargoInscripcion.create({eventoId:eid,usuarioId:1,estado:'pagado'});
  assert.equal(await consultar(),false,'El pago de otra cuenta no habilita la cámara');
  const cargo=await db.CargoInscripcion.create({eventoId:eid,usuarioId:uid,estado:'adeudado'});
  assert.equal(await consultar(),false);
  await cargo.update({estado:'pagado'});assert.equal(await consultar(),true);
  await ins.update({estadoInscripcion:'baja'});assert.equal(await consultar(),false);
  await ins.update({estadoInscripcion:'provisoria'});assert.equal(await consultar(),false);
  await ins.update({estadoInscripcion:'confirmada'});
  await ev.update({inscripcionesConfirmadasAt:null,inscripcionRequierePago:false});assert.equal(await consultar(),false);
  await ev.update({inscripcionesConfirmadasAt:'2026-10-29'});assert.equal(await consultar(),true);
});

test('técnica: solo club actual, ABM y auditoría; delegada sin escritura', async () => {
  await db.Club.create({id:810,nombre:'Club gestión',activo:true});
  const tecnico=await db.Usuario.create({id:810,rol:'tecnico',estado:'aprobado',aprobado:true,club:'Club gestión'});
  await db.Usuario.create({id:811,rol:'deportista',estado:'aprobado',aprobado:true,club:'Club gestión'});
  await db.Usuario.create({id:812,rol:'deportista',estado:'aprobado',aprobado:true,club:'Otro'});
  await db.Usuario.create({id:813,rol:'delegado',estado:'aprobado',aprobado:true,club:'Club gestión'});
  const evento=await db.Evento.create({id:810,nombre:'ABM club',inscripcionRequierePago:false,inscripcionDesde:at(-90000),inscripcionHasta:at(-60000),abmDesde:at(-50000),abmHasta:at(90000),pagoDesde:at(100000),pagoHasta:at(200000)});
  await db.PerfilDeportivo.create({id:810,usuarioId:811,activa:true,disciplina:'Libre'});
  await db.PerfilDeportivo.create({id:811,usuarioId:812,activa:true,disciplina:'Libre'});
  const url='/eventos/810/deportistas/811/inscripcion';
  assert.equal((await request(url,'tecnico',{perfilDeportivoIds:[810],seleccionAnterior:[]},'PUT',810)).status,200);
  const log=tables.CambioInscripcion.at(-1);assert.equal(log.actorId,810);assert.equal(log.usuarioId,811);assert.equal(log.accion,'seleccion_tecnica');
  assert.equal((await request(url,'delegado',{perfilDeportivoIds:[810],seleccionAnterior:[]},'PUT',813)).status,403);
  assert.equal((await request('/eventos/810/deportistas/812/inscripcion','tecnico',{perfilDeportivoIds:[811],seleccionAnterior:[810]},'PUT',810)).status,403);
  assert.equal((await request(url,'tecnico',{perfilDeportivoIds:[811],seleccionAnterior:[810]},'PUT',810)).status,403);
  tecnico.club='Otro';assert.equal((await request(url,'tecnico',{perfilDeportivoIds:[810],seleccionAnterior:[]},'PUT',810)).status,403);tecnico.club='Club gestión';
  evento.abmHasta=at(-1);assert.equal((await request(url,'tecnico',{perfilDeportivoIds:[810],seleccionAnterior:[]},'PUT',810)).status,409);
  evento.abmHasta=at(90000);evento.inscripcionesConfirmadasAt=new Date();assert.equal((await request(url,'tecnico',{perfilDeportivoIds:[810],seleccionAnterior:[]},'PUT',810)).status,409);
});

test('panel club: delegada consulta documentos propios; perfil fuera de ABM con catálogo, versión e historial',async()=>{
  const C=require('../services/circuito');
  require.cache[require.resolve('../services/cuenta')]={exports:{Usuario:db.Usuario,R:C.R,wrap:C.wrap,historial:async(u,actorId,accion,motivo)=>{tables.historialClub ||= [];tables.historialClub.push({usuarioId:u.id,actorId,accion,detalle:motivo.startsWith('{')?JSON.parse(motivo):motivo});}}};
  require.cache[require.resolve('../services/cuenta-archivos')]={exports:{existe:async()=>false}};
  require.cache[require.resolve('../services/alcance-evaluaciones')]={exports:{deportistas:async()=>[]}};
  for(const [file,key] of [['club','Club'],['usuarioevento','UsuarioEventos'],['evento','Evento']])require.cache[require.resolve('../models/'+file+'.model')]={exports:db[key]};
  app.use('/tecnica',require('../routes/tecnica.router'));
  const evento=await db.Evento.findByPk(810);evento.inscripcionesConfirmadasAt=null;evento.abmHasta=at(90000);
  const panel=await request('/tecnica/panel','delegado',undefined,'GET',813);
  assert.equal(panel.status,200);assert.deepEqual(panel.data.deportistas.map(x=>x.usuarioId),[811]);
  assert.equal((await request('/tecnica/deportistas/811/documentos','delegado',undefined,'GET',813)).status,200);
  assert.equal((await request('/tecnica/deportistas/811/archivo/dniFrente','delegado',undefined,'GET',813)).status,404);
  assert.equal((await request('/tecnica/deportistas/812/perfiles','delegado',undefined,'GET',813)).status,403);
  assert.equal((await request('/tecnica/deportistas/812/documentos','delegado',undefined,'GET',813)).status,403);
  assert.equal((await request('/tecnica/deportistas/812/archivo/dniFrente','delegado',undefined,'GET',813)).status,403);
  const listado=await request('/tecnica/deportistas/811/perfiles','tecnico',undefined,'GET',810);
  assert.equal(listado.status,200);const version=listado.data[0].versionToken;
  const url='/tecnica/deportistas/811/perfiles/810';const body={version,cambios:{disciplina:'Libre',origenCategoria:'CAP',licencia:'Nacional',modalidad:'Individual',divisional:'Sub Divisional B',categoria:'Tercera',temporada:'2027'}};
  evento.abmHasta=at(-1); // Editar el perfil no requiere ningún evento abierto.
  const snapshot=JSON.stringify(tables.UsuarioEventos);
  assert.equal((await request(url,'delegado',body,'PATCH',813)).status,403);
  assert.equal((await request(url,'tecnico',{...body,cambios:{usuarioId:'812'}},'PATCH',810)).status,400);
  assert.equal((await request(url,'tecnico',body,'PATCH',810)).status,200);
  assert.equal((await db.PerfilDeportivo.findByPk(810)).categoria,'Tercera');
  assert.equal(JSON.stringify(tables.UsuarioEventos),snapshot);
  const log=tables.historialClub.at(-1);assert.equal(log.accion,'perfil_tecnica');assert.equal(log.actorId,810);assert.equal(log.usuarioId,811);assert.equal(log.detalle.despues.categoria,'Tercera');
  assert.equal((await request(url,'tecnico',body,'PATCH',810)).status,409);
  assert.equal((await request('/tecnica/deportistas/811/perfiles/811','tecnico',body,'PATCH',810)).status,403);
  const fresh=await request('/tecnica/deportistas/811/perfiles','tecnico',undefined,'GET',810);
  assert.equal((await request(url,'tecnico',{...body,version:fresh.data[0].versionToken,cambios:{categoria:'C3era'}},'PATCH',810)).status,400);
  assert.equal((await db.PerfilDeportivo.findByPk(810)).categoria,'Tercera');
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'club-doc-'));
  const file=path.join(dir,'ficticio.pdf');fs.writeFileSync(file,'%PDF-1.4 Documento ficticio de prueba');
  const F=require('../services/cuenta-archivos');F.existe=async()=>true;F.fullpath=()=>file;
  try {
   assert.equal((await request('/tecnica/deportistas/811/archivo/dniFrente','delegado',undefined,'GET',813)).status,200);
   const logDoc=tables.historialClub.at(-1);assert.equal(logDoc.actorId,813);assert.equal(logDoc.accion,'documento_consultado_por_delegada');
   assert.equal((await request('/tecnica/deportistas/812/archivo/dniFrente','delegado',undefined,'GET',813)).status,403);
  } finally {F.existe=async()=>false;fs.rmSync(dir,{recursive:true,force:true});}
});

test('configuración de licencias: solo tesorería escribe, revisión y auditoría',async()=>{
 const Config=model('LicenciaConfiguracion'),Audit=model('LicenciaConfiguracionHistorial');Config.sequelize=db.sequelize;
 require.cache[require.resolve('../models/licenciaconfiguracion.model')]={exports:{Config,Audit}};
 const datos=structuredClone(require('../services/licencias/propuesta').inicial);
 await Config.create({id:2027,revision:0,datos});
 app.use('/licencias-config',require('../routes/licencias-config.router'));
 const body={revision:0,datos,motivo:'Propuesta revisada por Tesorería'};
 assert.equal((await request('/licencias-config','deportista')).status,403);
 assert.equal((await request('/licencias-config','delegado',undefined,'GET',813)).status,403);
 assert.equal((await request('/licencias-config','administrador')).status,200);
 assert.equal((await request('/licencias-config','administrador',body,'PUT')).status,403);
 assert.equal((await request('/licencias-config','tesoreria',{...body,revision:99},'PUT')).status,409);
 assert.equal((await request('/licencias-config','tesoreria',body,'PUT')).status,200);
 assert.equal((await Config.findByPk(2027)).revision,1);assert.equal(tables.LicenciaConfiguracionHistorial.length,1);assert.equal(tables.LicenciaConfiguracionHistorial[0].actorId,3);
 assert.equal((await request('/licencias-config','tesoreria',body,'PUT')).status,409);
 assert.equal((await request('/licencias-config','tesoreria')).data.cobrosHabilitados,false);
});

test('cotejo CSV exclusivo de tesorería; neutraliza fórmulas y no acredita pagos',async()=>{
 await db.Usuario.create({id:820,rol:'deportista',nombre:'=SUM(1;2)',dni:'12345678',club:'Club CSV',estado:'pendiente'});
 assert.equal((await request('/licencias-config/cotejo.csv','administrador')).status,403);
 assert.equal((await request('/licencias-config/cotejo.csv','delegado',undefined,'GET',813)).status,403);
 const csv=await request('/licencias-config/cotejo.csv','tesoreria');assert.equal(csv.status,200);
 assert.ok(csv.data.includes("'=SUM(1;2)"));assert.ok(csv.data.includes('no acredita pago'));assert.ok(!csv.data.includes('password'));
});


test('credencial: técnica y delegada acceden solo a su QR; crear es idempotente',async()=>{
 process.env.QR_SECRET='secreto-local-exclusivo-tests';
 require.cache[require.resolve('../services/cuenta-archivos')].exports.recibir=(_q,_s,next)=>next();
 require.cache[require.resolve('../models/rol.model')]={exports:{}};
 app.use('/usuarios',require('../routes/usuarios.router'));
 const u=await db.Usuario.findByPk(810);u.qrJti=null;
 assert.equal((await request('/usuarios/810/qr.png','tecnico',undefined,'GET',810)).status,404);
 const first=await request('/usuarios/810/qr','tecnico',{},'POST',810);assert.equal(first.status,200);
 const jti=u.qrJti;assert.ok(jti);
 assert.equal((await request('/usuarios/810/qr','tecnico',{},'POST',810)).status,200);assert.equal(u.qrJti,jti);
 assert.equal((await request('/usuarios/810/qr.png','tecnico',undefined,'GET',810)).status,200);
 assert.equal((await request('/usuarios/811/qr','tecnico',{},'POST',810)).status,403);
 assert.equal((await request('/usuarios/810/qr.png','delegado',undefined,'GET',813)).status,403);
 const d=await db.Usuario.findByPk(813);d.qrJti=null;
 assert.equal((await request('/usuarios/813/qr','delegado',{},'POST',813)).status,200);
 delete process.env.QR_SECRET;
 assert.equal((await request('/usuarios/810/qr.png','tecnico',undefined,'GET',810)).status,503);
});

test('tesorería: búsqueda y CSV de cotejo comparten filtros; aranceles no acreditan pagos',async()=>{
 const url='/licencias-config/cotejo?club=Club%20CSV&buscar=SUM';
 const r=await request(url,'tesoreria');assert.equal(r.status,200);assert.equal(r.data.registros.length,1);assert.equal(r.data.registros[0].id,820);assert.equal(r.data.registros[0].estadoPago,null);
 const csv=await request('/licencias-config/cotejo.csv?club=Club%20CSV&buscar=SUM','tesoreria');assert.equal(csv.status,200);assert.ok(csv.data.includes("'=SUM"));assert.ok(!csv.data.includes('Club gestión'));
 assert.equal((await request(url,'delegado',undefined,'GET',813)).status,403);
 assert.equal((await request('/licencias-config/cotejo?estado=inexistente','tesoreria')).status,400);
 const tarifas=await request('/licencias-config/aranceles.csv','tesoreria');assert.equal(tarifas.status,200);assert.ok(tarifas.data.includes('no acredita pagos'));assert.ok(tarifas.data.includes('115000'));
});
test('tesorería: temporadas independientes con revisión, nombres e historial separado',async()=>{
 const before=(await request('/licencias-config?temporada=2027','tesoreria')).data;
 const datos={...before.datos,temporada:2028,tramos:[{nombre:'Promocional',desde:'2027-11-01',hasta:'2027-12-01',vencimiento:'2028-01-01',importe:150000}]};
 assert.equal((await request('/licencias-config?temporada=2028','tesoreria')).data.datos.tramos.length,0);
 assert.equal((await request('/licencias-config?temporada=2028','administrador',{datos,revision:0,motivo:'Nueva temporada'},'PUT')).status,403);
 assert.equal((await request('/licencias-config?temporada=2028','tesoreria',{datos,revision:0,motivo:'Nueva temporada'},'PUT')).status,200);
 const after=(await request('/licencias-config?temporada=2027','tesoreria')).data;assert.deepEqual(after.datos,before.datos);assert.equal(after.revision,before.revision);
 const historial=await request('/licencias-config/historial?temporada=2028','tesoreria');assert.equal(historial.data.length,1);assert.equal(historial.data[0].despues.temporada,2028);
 assert.equal((await request('/licencias-config?temporada=2028','tesoreria',{datos,revision:0,motivo:'Cambiar otra vez'},'PUT')).status,409);
 assert.equal((await request('/licencias-config?temporada=2027','tesoreria',{datos,revision:after.revision,motivo:'Temporada distinta'},'PUT')).status,400);
 assert.equal((await request('/licencias-config?temporada=xyz','tesoreria')).status,400);
 const csv=await request('/licencias-config/aranceles.csv?temporada=2028','tesoreria');assert.ok(csv.data.includes('Promocional'));assert.ok(csv.data.includes('150000'));
});

test('Freestyle HTTP: solo deportistas, perfiles aislados por deporte y cambio cruzado rechazado',async()=>{
 await db.Usuario.create({id:1400,rol:'deportista',estado:'aprobado',aprobado:true});
 const data={usuarioId:1400,deporte:'ROLLER FREESTYLE',disciplina:'STREET',categoria:'JUNIOR FEMENINO',temporada:'2026',origenCategoria:'CAP'};
 assert.equal((await request('/perfiles-deportivos','tesoreria',{...data,usuarioId:3},'POST')).status,403);
 assert.equal((await request('/perfiles-deportivos','administrador',{...data,usuarioId:3},'POST')).status,403);
 assert.equal((await request('/perfiles-deportivos','deportista',{...data,divisional:'World Skate / Internacional'},'POST',1400)).status,400);
 const r=await request('/perfiles-deportivos','deportista',data,'POST',1400);assert.equal(r.status,201);assert.equal(r.data.deporte,'ROLLER FREESTYLE');
 assert.equal((await request('/perfiles-deportivos/'+r.data.id,'deportista',{disciplina:'Libre'},'PUT',1400)).status,400);
 assert.equal((await request('/perfiles-deportivos/'+r.data.id,'deportista',{deporte:'PATINAJE ARTÍSTICO',disciplina:'Libre'},'PUT',1400)).status,409);
 assert.equal((await request('/perfiles-deportivos/'+r.data.id,'deportista',{disciplina:'PARK (BOWL)',categoria:'PRO FEMENINO'},'PUT',1400)).status,200);
 assert.equal((await request('/perfiles-deportivos/'+r.data.id,'deportista',{disciplina:'STREET'},'PUT',1200)).status,403);
});
