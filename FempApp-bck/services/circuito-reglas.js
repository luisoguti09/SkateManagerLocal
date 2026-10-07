const { createHmac, timingSafeEqual } = require('crypto');
const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
function id(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    fail(400, 'Identificador inválido.');
  return Number(value);
}
function ids(values) {
  if (!Array.isArray(values) || !values.length || values.length > 100)
    fail(400, 'Seleccioná los perfiles deportivos.');
  const result = values.map(id);
  if (new Set(result).size !== result.length)
    fail(400, 'Hay perfiles repetidos.');
  return result.sort((a, b) => a - b);
}
function centavos(value) {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(String(value)))
    fail(400, 'Importe inválido: hasta dos decimales.');
  const [a, b = ''] = String(value).split('.');
  return Number(a) * 100 + Number(b.padEnd(2, '0'));
}
function montos(base, conCosto) {
  const c = conCosto ? centavos(base) : 0;
  if (conCosto && c <= 0)
    fail(409, 'Falta un arancel positivo configurado por Tesorería.');
  return {
    montoBase: (c / 100).toFixed(2),
    montoComision: '0.00',
    montoTotal: (c / 100).toFixed(2),
  };
}
const camposFecha = [
  'inscripcionDesde',
  'inscripcionHasta',
  'abmDesde',
  'abmHasta',
  'pagoDesde',
  'pagoHasta',
];
function fecha(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  )
    fail(400, 'Las fechas deben incluir hora y zona horaria.');
  const d = new Date(value);
  const calendar = new Date(value.slice(0, 10) + 'T00:00:00Z');
  if (
    !Number.isFinite(d.getTime()) ||
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== value.slice(0, 10)
  )
    fail(400, 'Fecha inválida.');
  return d;
}
function calendario(body) {
  if (typeof body.inscripcionRequierePago !== 'boolean')
    fail(400, 'Indicá si el evento es con costo.');
  const out = { inscripcionRequierePago: body.inscripcionRequierePago };
  for (const key of camposFecha) out[key] = body[key] ? fecha(body[key]) : null;
  const {
    inscripcionDesde: a,
    inscripcionHasta: b,
    abmDesde: inicioAbm,
    abmHasta: c,
    pagoDesde: d,
    pagoHasta: e,
  } = out;
  if (!a || !b || !inicioAbm || !c || !(a < b && b <= inicioAbm && inicioAbm < c))
    fail(
      400,
      'Orden requerido: apertura de inscripción, cierre de inscripción, apertura de ABM, cierre de ABM. ABM puede abrir al cierre o después.',
    );
  if (out.inscripcionRequierePago && (!d || !e || !(c <= d && d < e)))
    fail(
      400,
      'El pago abre después de ABM y debe tener vencimiento posterior.',
    );
  if (!out.inscripcionRequierePago) out.pagoDesde = out.pagoHasta = null;
  return out;
}
function etapa(ev, now = new Date()) {
  if (
    !ev.inscripcionDesde ||
    !ev.inscripcionHasta ||
    !ev.abmHasta ||
    (!ev.abmDesde && !ev.inscripcionesConfirmadasAt) ||
    ev.inscripcionRequierePago == null
  )
    return 'sin_configurar';
  if (+now < +new Date(ev.inscripcionDesde)) return 'por_abrir';
  if (+now < +new Date(ev.inscripcionHasta)) return 'inscripcion';
  if (ev.abmDesde && +now < +new Date(ev.abmDesde)) return 'cuadernillo';
  if (+now < +new Date(ev.abmHasta)) return 'abm';
  if (!ev.inscripcionesConfirmadasAt) return 'por_confirmar';
  if (!ev.inscripcionRequierePago) return 'gratuito_confirmado';
  if (!ev.pagoDesde || !ev.pagoHasta) return 'sin_configurar';
  if (+now < +new Date(ev.pagoDesde)) return 'pago_por_abrir';
  if (+now >= +new Date(ev.pagoHasta)) return 'pago_cerrado';
  return 'pago';
}
function inicioDiaArgentina(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail(400, 'Fecha de filtro inválida.');
  return fecha(value + 'T00:00:00-03:00');
}
function firmaValida(query, headers, secret) {
  if (!secret) return false;
  const dataId = String(query['data.id'] || '').toLowerCase();
  const requestId = headers['x-request-id'];
  const parts = Object.fromEntries(
    String(headers['x-signature'] || '')
      .split(',')
      .map((x) => x.trim().split('=')),
  );
  if (
    !dataId ||
    !requestId ||
    !/^\d+$/.test(parts.ts || '') ||
    !/^[a-f0-9]{64}$/i.test(parts.v1 || '')
  )
    return false;
  const expected = createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${requestId};ts:${parts.ts};`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(parts.v1, 'hex'));
}
function conciliable(payment, pago) {
  return (
    payment.currency_id === 'ARS' &&
    String(payment.external_reference) === pago.externalReference &&
    centavos(payment.transaction_amount) === centavos(pago.montoTotal)
  );
}
module.exports = {
  fail,
  id,
  ids,
  centavos,
  montos,
  camposFecha,
  calendario,
  etapa,
  inicioDiaArgentina,
  firmaValida,
  conciliable,
};
