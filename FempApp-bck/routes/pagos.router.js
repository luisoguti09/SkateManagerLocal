const express = require('express');
const router = express.Router();
const mercadopago = require('mercadopago');
const db = require('../models');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

const FRONT_BASE =
  process.env.FRONT_BASE_URL ||
  process.env.FRONT_BASE ||
  'http://localhost:4200';

const BACK_BASE =
  process.env.BACK_BASE_URL ||
  process.env.BACK_BASE ||
  'http://localhost:3000';

const isHttpsFront = FRONT_BASE.toLowerCase().startsWith('https://');
const isHttpsBack = BACK_BASE.toLowerCase().startsWith('https://');

function calcularMontos(montoBase, porcentajeComision = 5) {
  const base = Number(montoBase);
  const porcentaje = Number(porcentajeComision);

  if (!base || base <= 0) {
    throw new Error('El monto base debe ser mayor a 0');
  }

  const montoComision = Number((base * (porcentaje / 100)).toFixed(2));
  const montoTotal = Number((base + montoComision).toFixed(2));

  return {
    montoBase: base,
    porcentajeComision: porcentaje,
    montoComision,
    montoTotal,
  };
}

function crearExternalReference({ eventoId, usuarioId, perfilDeportivoIds }) {
  const perfiles = perfilDeportivoIds.join('-');
  const timestamp = Date.now();

  return `evento_${eventoId}_usuario_${usuarioId}_perfiles_${perfiles}_${timestamp}`;
}

router.post('/crear-preferencia', async (req, res) => {
  try {
    const {
      title = 'Inscripción',
      quantity = 1,
      usuarioId,
      eventoId,
      perfilDeportivoIds = [],
    } = req.body;

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({
        error: 'Falta configurar MP_ACCESS_TOKEN',
      });
    }

    if (!usuarioId || !eventoId) {
      return res.status(400).json({
        error: 'Faltan datos obligatorios: usuarioId y eventoId',
      });
    }

    if (!Array.isArray(perfilDeportivoIds) || perfilDeportivoIds.length === 0) {
      return res.status(400).json({
        error: 'Debe seleccionar al menos un perfil deportivo para la inscripción',
      });
    }

    const cantidadParticipaciones = perfilDeportivoIds.length;

    const evento = await db.Evento.findByPk(eventoId);

    if (!evento) {
      return res.status(404).json({
        error: 'Evento no encontrado',
      });
    }

    const usuario = await db.Usuario.findByPk(usuarioId);

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    const precioParticipacion = await db.PrecioParticipacionEvento.findOne({
      where: {
        eventoId,
        cantidadParticipaciones,
        activo: true,
      },
    });

    if (!precioParticipacion) {
      return res.status(400).json({
        error: `No hay precio configurado para ${cantidadParticipaciones} participación/es en este evento`,
      });
    }

    const porcentajeComision = 5;

    const montos = calcularMontos(
      precioParticipacion.monto,
      porcentajeComision
    );

    const externalReference = crearExternalReference({
      eventoId,
      usuarioId,
      perfilDeportivoIds,
    });

    const pref = {
      items: [
        {
          title,
          quantity: Number(quantity),
          unit_price: montos.montoTotal,
          currency_id: 'ARS',
          description: `Inscripción: $${montos.montoBase} + gestión Skate Manager: $${montos.montoComision}`,
        },
      ],

      external_reference: externalReference,

      metadata: {
        usuario_id: usuarioId,
        evento_id: eventoId,
        perfil_deportivo_ids: perfilDeportivoIds,
        cantidad_participaciones: cantidadParticipaciones,
        monto_base: montos.montoBase,
        porcentaje_comision: montos.porcentajeComision,
        monto_comision: montos.montoComision,
        monto_total: montos.montoTotal,
      },

      ...(isHttpsFront && {
        back_urls: {
          success: `${FRONT_BASE}/pago-exitoso`,
          failure: `${FRONT_BASE}/pago-fallido`,
          pending: `${FRONT_BASE}/pago-pendiente`,
        },
        auto_return: 'approved',
      }),

      ...(isHttpsBack && {
        notification_url: `${BACK_BASE}/pagos/webhook`,
      }),

      statement_descriptor: 'SKATE MANAGER',
    };

    const mpRes = await mercadopago.preferences.create(pref);

    let pagoCreado = null;

    if (db.Pago) {
      pagoCreado = await db.Pago.create({
        usuarioId,
        eventoId,
        perfilDeportivoId: null,

        cantidadParticipaciones,
        perfilDeportivoIds,

        externalReference,
        preferenceId: mpRes.body.id,

        montoBase: montos.montoBase,
        porcentajeComision: montos.porcentajeComision,
        montoComision: montos.montoComision,
        montoTotal: montos.montoTotal,

        estadoPago: 'pendiente',
        estadoConciliacion: 'pendiente',

        rawPreference: mpRes.body,
      });
    }

    return res.json({
      id: mpRes.body.id,
      init_point: mpRes.body.init_point,
      sandbox_init_point: mpRes.body.sandbox_init_point,

      pagoId: pagoCreado?.id || null,
      external_reference: externalReference,

      usuarioId,
      eventoId,
      perfilDeportivoIds,
      cantidadParticipaciones,

      montoBase: montos.montoBase,
      porcentajeComision: montos.porcentajeComision,
      montoComision: montos.montoComision,
      montoTotal: montos.montoTotal,
    });
  } catch (e) {
    console.error('[MP crear-preferencia error]', e?.response?.body || e);

    const detail =
      e?.response?.body?.message ||
      e?.message ||
      'unknown';

    return res.status(500).json({
      error: 'No se pudo crear la preferencia de pago',
      detail,
    });
  }
});

router.get('/confirmar', async (req, res) => {
  try {
    const paymentId = req.query.payment_id;

    if (!paymentId) {
      return res.status(400).json({
        error: 'Falta payment_id',
      });
    }

    const mpRes = await mercadopago.payment.get(paymentId);
    const payment = mpRes.body;

    const estadoConciliacion =
      payment.status === 'approved' ? 'ok' : 'requiere_revision';

    let pago = null;

    if (db.Pago && payment.external_reference) {
      pago = await db.Pago.findOne({
        where: {
          externalReference: payment.external_reference,
        },
      });

      if (pago) {
        await pago.update({
          paymentId: String(payment.id),
          estadoPago: payment.status,
          estadoConciliacion,
          payerEmail: payment.payer?.email || null,
          paymentMethodId: payment.payment_method_id || null,
          paymentTypeId: payment.payment_type_id || null,
          fechaAprobacion: payment.date_approved || null,
          rawPayment: payment,
        });
      }
    }

    return res.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
      currency_id: payment.currency_id,
      date_created: payment.date_created,
      date_approved: payment.date_approved,
      payment_method_id: payment.payment_method_id,
      payment_type_id: payment.payment_type_id,
      estadoConciliacion,
      pagoActualizado: !!pago,
      payer: {
        email: payment.payer?.email,
      },
      metadata: payment.metadata,
    });
  } catch (e) {
    console.error('[MP confirmar error]', e?.response?.body || e);

    const detail =
      e?.response?.body?.message ||
      e?.message ||
      'unknown';

    return res.status(500).json({
      error: 'No se pudo confirmar el pago',
      detail,
    });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    console.log('[MP webhook recibido]', {
      query: req.query,
      body: req.body,
    });

    const topic =
      req.query.type ||
      req.query.topic ||
      req.body?.type;

    const paymentId =
      req.query['data.id'] ||
      req.query.id ||
      req.body?.data?.id;

    if (topic === 'payment' && paymentId) {
      const mpRes = await mercadopago.payment.get(paymentId);
      const payment = mpRes.body;

      const estadoConciliacion =
        payment.status === 'approved' ? 'ok' : 'requiere_revision';

      if (db.Pago && payment.external_reference) {
        const pago = await db.Pago.findOne({
          where: {
            externalReference: payment.external_reference,
          },
        });

        if (pago) {
          await pago.update({
            paymentId: String(payment.id),
            estadoPago: payment.status,
            estadoConciliacion,
            payerEmail: payment.payer?.email || null,
            paymentMethodId: payment.payment_method_id || null,
            paymentTypeId: payment.payment_type_id || null,
            fechaAprobacion: payment.date_approved || null,
            rawPayment: payment,
          });
        }
      }

      console.log('[MP payment desde webhook]', {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference,
        amount: payment.transaction_amount,
        metadata: payment.metadata,
      });
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error('[MP webhook error]', e?.response?.body || e);
    return res.sendStatus(200);
  }
});

module.exports = router;