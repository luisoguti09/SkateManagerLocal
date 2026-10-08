const express = require('express');
const router = express.Router();
const mercadopago = require('mercadopago');
const { randomUUID } = require('crypto');
const { verifyToken } = require('../middleware/auth.middleware');
const {
  wrap,
  sesion,
  roles,
  evento,
  datoCargo,
  R,
  db,
  Op,
} = require('../services/circuito');
const { conciliar } = require('../services/pagos-conciliacion');
mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
const auth = [verifyToken, sesion];
const tesoreria = [...auth, roles('tesoreria')];
const FRONT_BASE = (
  process.env.FRONT_BASE_URL ||
  process.env.FRONT_BASE ||
  'http://localhost:4200'
).replace(/\/$/, '');
const BACK_BASE = (
  process.env.BACK_BASE_URL ||
  process.env.BACK_BASE ||
  'http://localhost:3000'
).replace(/\/$/, '');
function mpConfigurado() {
  if (
    !process.env.MP_ACCESS_TOKEN ||
    !process.env.MP_COLLECTOR_ID ||
    !process.env.MP_WEBHOOK_SECRET
  )
    R.fail(503, 'La integración de pagos todavía no está configurada.');
}
function fechaMercadoPago(valor) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    throw new Error('Fecha inválida para crear el checkout.');
  }

  return new Date(fecha.getTime() - 3 * 60 * 60 * 1000)
    .toISOString()
    .replace('Z', '-03:00');
}
function datosCheckout(pago) {
  let raw = pago.rawPreference;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (!raw?.init_point || !pago.preferenceId)
    R.fail(
      409,
      'Hay una solicitud en proceso o pendiente de revisión. No se creará otro cobro.',
    );
  return {
    id: pago.preferenceId,
    init_point: raw.init_point,
    sandbox_init_point: raw.sandbox_init_point,
    pagoId: pago.id,
    montoBase: pago.montoBase,
    montoComision: pago.montoComision,
    montoTotal: pago.montoTotal,
  };
}
router.post(
  '/crear-preferencia',
  ...auth,
  roles('deportista'),
  wrap(async (req, res) => {
    mpConfigurado();
    const eventoId = R.id(req.body.eventoId),
      usuarioId = req.auth.id;
    if (req.body.usuarioId != null && Number(req.body.usuarioId) !== usuarioId)
      R.fail(403, 'Solo podés pagar tu inscripción.');
    if (req.body.quantity != null && req.body.quantity !== 1)
      R.fail(400, 'El pago comprende una inscripción completa.');
    const prepared = await db.sequelize.transaction(async (t) => {
      const ev = await evento(eventoId, t);
      if (R.etapa(ev) !== 'pago')
        R.fail(409, 'El pago no está habilitado para este evento.');
      const cargo = await db.CargoInscripcion.findOne({
        where: { eventoId, usuarioId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!cargo) R.fail(409, 'Tu inscripción no tiene un cargo confirmado.');
      if (['pagado', 'sin_cargo', 'requiere_revision'].includes(cargo.estado))
        R.fail(
          409,
          'La inscripción ya está pagada, es gratuita o requiere revisión de Tesorería.',
        );
      if (
        req.body.perfilDeportivoIds &&
        JSON.stringify(R.ids(req.body.perfilDeportivoIds)) !==
        JSON.stringify(cargo.perfilDeportivoIds)
      )
        R.fail(409, 'El pago debe incluir todos los perfiles confirmados.');
      const existente = await db.Pago.findOne({
        where: { cargoId: cargo.id },
        transaction: t,
      });
      if (R.centavos(cargo.montoComision) !== 0 || R.centavos(cargo.montoTotal) !== R.centavos(cargo.montoBase) ||
        (existente && (R.centavos(existente.montoComision) !== 0 || R.centavos(existente.montoTotal) !== R.centavos(cargo.montoBase))))
        R.fail(409, 'Tesorería debe revisar este cargo anterior antes de habilitar el pago.');
      if (existente) return { nuevo: false, pago: existente };
      const snapshots = cargo.participacionesSnapshot;
      const clubs = [...new Set(snapshots.map((x) => x.club).filter(Boolean))];
      const clubIds = [...new Set(snapshots.map((x) => x.clubId))];
      const sedes = [...new Set(snapshots.map((x) => x.sede).filter(Boolean))];
      const sedeIds = [...new Set(snapshots.map((x) => x.clubSedeId))];
      const pago = await db.Pago.create(
        {
          cargoId: cargo.id,
          usuarioId,
          eventoId,
          perfilDeportivoIds: cargo.perfilDeportivoIds,
          cantidadParticipaciones: cargo.perfilDeportivoIds.length,
          externalReference: `cargo_${cargo.id}_${randomUUID()}`,
          preferenceId: '',
          montoBase: cargo.montoBase,
          montoComision: cargo.montoComision,
          montoTotal: cargo.montoTotal,
          porcentajeComision: 0,
          tipoComision: 'sin_recargo_deportista',
          estadoPago: 'creando',
          estadoConciliacion: 'pendiente',
          deportistaNombreSnapshot: snapshots[0]?.nombre,
          deportistaDniSnapshot: snapshots[0]?.dni,
          eventoNombreSnapshot:
            snapshots[0]?.eventoNombre || ev.titulo || ev.nombre,
          clubId: clubIds.length === 1 ? clubIds[0] : null,
          clubSedeId: sedeIds.length === 1 ? sedeIds[0] : null,
          clubSnapshot: clubs.join(' / ') || null,
          clubSedeSnapshot: sedes.join(' / ') || null,
        },
        { transaction: t },
      );
      return { nuevo: true, pago, ev };
    });
    if (!prepared.nuevo) return res.json(datosCheckout(prepared.pago));
    const { pago, ev } = prepared;
    const pref = {
      items: [
        {
          title: `Inscripción ${ev.titulo || ev.nombre}`,
          quantity: 1,
          unit_price: Number(pago.montoTotal),
          currency_id: 'ARS',
          description: `Inscripción: $${pago.montoBase}`,
        },
      ],
      external_reference: pago.externalReference,
      metadata: {
        cargo_id: pago.cargoId,
        usuario_id: usuarioId,
        evento_id: eventoId,
        perfil_deportivo_ids: pago.perfilDeportivoIds,
        tipo_comision: 'sin_recargo_deportista',
      },
      expires: true,
      expiration_date_from: fechaMercadoPago(new Date()),
      expiration_date_to: fechaMercadoPago(ev.pagoHasta),
      ...(FRONT_BASE.startsWith('https://') && {
        back_urls: {
          success: `${FRONT_BASE}/pago-exitoso`,
          failure: `${FRONT_BASE}/pago-fallido`,
          pending: `${FRONT_BASE}/pago-pendiente`,
        },
        auto_return: 'approved',
      }),
      ...(BACK_BASE.startsWith('https://') && {
        notification_url: `${BACK_BASE}/pagos/webhook`,
      }),
      statement_descriptor: 'SKATE MANAGER',
    };
    try {
      const mp = await mercadopago.preferences.create(pref);
      await pago.update({
        preferenceId: mp.body.id,
        rawPreference: mp.body,
        estadoPago: 'pendiente',
      });
      res.json(datosCheckout(pago));
    } catch (error) {
      // Registrar el diagnóstico sin imprimir credenciales,
      // encabezados, datos del comprador ni la respuesta completa.
      const limpiar = (valor) => {
        let texto = String(valor ?? '');
        for (const secreto of [
          process.env.MP_ACCESS_TOKEN,
          process.env.MP_WEBHOOK_SECRET,
        ]) {
          if (secreto) texto = texto.split(secreto).join('[OCULTO]');
        }
        return texto.slice(0, 600);
      };

      console.error('[MP_CHECKOUT_ERROR]', {
        pagoId: pago.id,
        cargoId: pago.cargoId,
        nombre: limpiar(error?.name),
        estado: limpiar(error?.status || error?.statusCode),
        codigo: limpiar(error?.code || error?.error),
        mensaje: limpiar(error?.message),
        causas: Array.isArray(error?.cause)
          ? error.cause.map((causa) => ({
            codigo: limpiar(causa?.code),
            descripcion: limpiar(causa?.description),
          }))
          : [],
      });

      await pago.update({
        estadoPago: 'error_creacion',
        estadoConciliacion: 'requiere_revision',
      });
      R.fail(
        502,
        'No pudimos confirmar la creación del checkout. Tesorería debe revisar la operación antes de reintentar.',
      );
    }
  }),
);
router.get(
  '/confirmar',
  ...auth,
  roles('deportista', 'tesoreria'),
  wrap(async (req, res) => {
    mpConfigurado();
    const paymentId = R.id(req.query.payment_id);
    const payment = (await mercadopago.payment.get(paymentId)).body;
    const local = await db.Pago.findOne({
      where: { externalReference: String(payment.external_reference || '') },
    });
    if (
      !local ||
      (req.auth.rol !== 'tesoreria' && Number(local.usuarioId) !== req.auth.id)
    )
      R.fail(404, 'Pago no encontrado.');
    const pago = await conciliar(payment);
    res.json({
      id: payment.id,
      status: pago.estadoPago,
      estadoConciliacion: pago.estadoConciliacion,
      transaction_amount: pago.montoTotal,
      currency_id: 'ARS',
      pagoActualizado: true,
    });
  }),
);
router.post(
  '/webhook',
  wrap(async (req, res) => {
    mpConfigurado();
    if (!R.firmaValida(req.query, req.headers, process.env.MP_WEBHOOK_SECRET))
      R.fail(401, 'Firma inválida.');
    if ((req.query.type || req.body?.type) !== 'payment')
      return res.sendStatus(200);
    const paymentId = R.id(req.query['data.id']);
    const payment = (await mercadopago.payment.get(paymentId)).body;
    await conciliar(payment);
    res.sendStatus(200);
  }),
);
router.get(
  '/cargos',
  ...tesoreria,
  wrap(async (req, res) => {
    const where = {};
    if (req.query.eventoId) where.eventoId = R.id(req.query.eventoId);
    const cargos = await db.CargoInscripcion.findAll({
      where,
      order: [['id', 'DESC']],
    });
    const result = [];
    for (const c of cargos) result.push(datoCargo(c, await evento(c.eventoId)));
    res.json(result);
  }),
);
function queryNumber(value) {
  return value == null ||
    value === '' ||
    value === 'null' ||
    value === 'undefined'
    ? null
    : R.id(value);
}
function queryText(value) {
  return value == null ||
    value === '' ||
    value === 'null' ||
    value === 'undefined'
    ? null
    : String(value).trim();
}
const inicioDiaArgentina = R.inicioDiaArgentina;

router.get('/', ...tesoreria, async (req, res) => {
  try {
    const {
      eventoId,
      clubId,
      clubSedeId,
      estado,
      buscar,
      fechaDesde,
      fechaHasta,
    } = req.query;

    const where = {};

    const eventoIdNumber = queryNumber(eventoId);
    const clubIdNumber = queryNumber(clubId);
    const clubSedeIdNumber = queryNumber(clubSedeId);

    if (eventoIdNumber !== null) {
      where.eventoId = eventoIdNumber;
    }

    if (clubIdNumber !== null) {
      where.clubId = clubIdNumber;
    }

    if (clubSedeIdNumber !== null) {
      where.clubSedeId = clubSedeIdNumber;
    }

    const estadoText = queryText(estado);
    const buscarText = queryText(buscar);
    const fechaDesdeText = queryText(fechaDesde);
    const fechaHastaText = queryText(fechaHasta);

    const desde = fechaDesdeText ? inicioDiaArgentina(fechaDesdeText) : null;
    const hasta = fechaHastaText ? inicioDiaArgentina(fechaHastaText) : null;
    if ((fechaDesdeText && !desde) || (fechaHastaText && !hasta)) {
      return res
        .status(400)
        .json({
          error: 'Las fechas deben ser validas y tener formato AAAA-MM-DD.',
        });
    }
    if (desde && hasta && desde > hasta) {
      return res
        .status(400)
        .json({ error: 'La fecha Desde no puede ser posterior a Hasta.' });
    }

    const condiciones = [];

    if (estadoText) {
      if (estadoText === 'pagado') {
        where.estadoPago = 'approved';
        where.estadoConciliacion = 'ok';
      }

      if (estadoText === 'pendiente') {
        where.estadoPago = { [Op.in]: ['pendiente', 'pending', 'creando'] };
      }

      if (estadoText === 'observado') {
        condiciones.push({
          [Op.or]: [
            { estadoConciliacion: 'requiere_revision' },
            {
              estadoPago: {
                [Op.in]: ['rejected', 'cancelled', 'refunded', 'charged_back'],
              },
            },
          ],
        });
      }
    }

    if (buscarText) {
      condiciones.push({
        [Op.or]: [
          { deportistaNombreSnapshot: { [Op.like]: `%${buscarText}%` } },
          { deportistaDniSnapshot: { [Op.like]: `%${buscarText}%` } },
          { externalReference: { [Op.like]: `%${buscarText}%` } },
          { preferenceId: { [Op.like]: `%${buscarText}%` } },
          { paymentId: { [Op.like]: `%${buscarText}%` } },
        ],
      });
    }

    if (condiciones.length) where[Op.and] = condiciones;

    if (fechaDesdeText || fechaHastaText) {
      where.createdAt = {};

      if (desde) {
        where.createdAt[Op.gte] = desde;
      }

      if (hasta) {
        where.createdAt[Op.lt] = new Date(
          hasta.getTime() + 24 * 60 * 60 * 1000,
        );
      }
    }

    const pagos = await db.Pago.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    return res.json(pagos);
  } catch (error) {
    console.error('[GET /pagos error]', error);

    return res
      .status(error.status || 500)
      .json({
        error: error.status
          ? error.message
          : 'No se pudieron obtener los pagos',
      });
  }
});

router.get('/resumen/evento/:eventoId', ...tesoreria, async (req, res) => {
  try {
    const { eventoId } = req.params;

    const pagos = await db.Pago.findAll({
      where: {
        eventoId: Number(eventoId),
      },
    });

    const resumen = pagos.reduce(
      (acc, pago) => {
        const montoBase = Number(pago.montoBase || 0);
        const montoComision = Number(pago.montoComision || 0);
        const montoTotal = Number(pago.montoTotal || 0);

        acc.totalPagos += 1;
        acc.totalInscripcion += montoBase;
        acc.totalComisionSkateManager += montoComision;
        acc.totalGeneral += montoTotal;

        if (
          pago.estadoPago === 'approved' &&
          pago.estadoConciliacion === 'ok'
        ) {
          acc.pagados += 1;
        } else if (
          ['pendiente', 'pending', 'creando'].includes(pago.estadoPago)
        ) {
          acc.pendientes += 1;
        } else {
          acc.observados += 1;
        }

        return acc;
      },
      {
        eventoId: Number(eventoId),
        totalPagos: 0,
        pagados: 0,
        pendientes: 0,
        observados: 0,
        totalInscripcion: 0,
        totalComisionSkateManager: 0,
        totalGeneral: 0,
      },
    );

    return res.json(resumen);
  } catch (error) {
    console.error('[GET /pagos/resumen/evento/:eventoId error]', error);

    return res.status(500).json({
      error: 'No se pudo obtener el resumen del evento',
      detail: error.message,
    });
  }
});

router.get('/filtros/clubes', ...tesoreria, async (req, res) => {
  try {
    const { eventoId } = req.query;

    const where = {
      clubId: {
        [Op.ne]: null,
      },
    };

    const eventoIdNumber = queryNumber(eventoId);

    if (eventoIdNumber !== null) {
      where.eventoId = eventoIdNumber;
    }

    const pagos = await db.Pago.findAll({
      attributes: ['clubId', 'clubSnapshot', 'clubSedeId', 'clubSedeSnapshot'],
      where,
      order: [
        ['clubSnapshot', 'ASC'],
        ['clubSedeSnapshot', 'ASC'],
      ],
    });

    const mapa = new Map();

    for (const pago of pagos) {
      const key = `${pago.clubId || 'sin-club'}-${pago.clubSedeId || 'sin-sede'}`;

      if (!mapa.has(key)) {
        mapa.set(key, {
          clubId: pago.clubId,
          club: pago.clubSnapshot,
          clubSedeId: pago.clubSedeId,
          sede: pago.clubSedeSnapshot,
        });
      }
    }

    return res.json(Array.from(mapa.values()));
  } catch (error) {
    console.error('[GET /pagos/filtros/clubes error]', error);

    return res.status(500).json({
      error: 'No se pudieron obtener los clubes para filtros',
      detail: error.message,
    });
  }
});

module.exports = router;
