'use strict';
// Datos de entrada: registros del servidor y respuesta GET /v1/payments/:id.
// Nunca usar req.body, query de retorno o el cuerpo del webhook como pago verificado.
const { createHmac, timingSafeEqual } = require('node:crypto');
function fail(code) { const e = new Error(code); e.code = code; throw e; }
function id(value) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) fail('ID_INVALIDO');
  if (!['number', 'string'].includes(typeof value) || !/^[1-9]\d{0,19}$/.test(String(value))) fail('ID_INVALIDO');
  return String(value);
}
function centavos(value) {
  if (!['string', 'number'].includes(typeof value)) fail('IMPORTE_INVALIDO');
  const text = String(value);
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) fail('IMPORTE_INVALIDO');
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) fail('IMPORTE_INVALIDO');
  return result;
}
function instante(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)) fail('FECHA_INVALIDA');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail('FECHA_INVALIDA');
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  const calendar = new Date(Date.UTC(y, m - 1, d));
  if (calendar.getUTCFullYear() !== y || calendar.getUTCMonth() !== m - 1 || calendar.getUTCDate() !== d) fail('FECHA_INVALIDA');
  return ms;
}
function mismo(a, b) { try { return id(a) === id(b); } catch { return false; } }
function seleccionar(registros, cicloId, ahora) {
  const candidates = registros.filter(x => mismo(x.cicloId, cicloId) && x.estado === 'aprobado' && instante(x.desde) <= ahora);
  candidates.sort((a, b) => instante(b.desde) - instante(a.desde));
  if (candidates.length > 1 && instante(candidates[0].desde) === instante(candidates[1].desde)) fail('PROGRAMACION_AMBIGUA');
  return candidates[0] || null;
}
function cotizar({ cicloId, aranceles, promociones = [], ahora, avisoDias = 7 }) {
  id(cicloId);
  const now = instante(ahora);
  if (!Number.isInteger(avisoDias) || avisoDias < 0 || avisoDias > 365) fail('AVISO_INVALIDO');
  const arancel = seleccionar(aranceles, cicloId, now);
  if (!arancel) fail('ARANCEL_NO_CONFIGURADO');
  const base = centavos(arancel.importe);
  if (!base) fail('ARANCEL_INVALIDO');
  const promo = seleccionar(promociones.filter(p => !p.hasta || instante(p.hasta) > now), cicloId, now);
  const puntos = promo ? centavos(promo.porcentaje) : 0;
  if (puntos > 10000) fail('DESCUENTO_INVALIDO');
  if (promo && (!promo.hasta || instante(promo.hasta) <= instante(promo.desde))) fail('VIGENCIA_PROMOCION_INVALIDA');
  // Enteros + BigInt evitan errores de coma flotante al calcular el porcentaje.
  const descuento = Number((BigInt(base) * BigInt(puntos) + 5000n) / 10000n);
  const total = base - descuento;
  const aviso = (fecha) => fecha && instante(fecha) <= now + avisoDias * 86400000;
  return Object.freeze({
    cicloId: id(cicloId), arancelId: id(arancel.id), promocionId: promo ? id(promo.id) : null,
    moneda: 'ARS', baseCentavos: base, descuentoPuntos: puntos, descuentoCentavos: descuento,
    totalCentavos: total, comisionPlataformaCentavos: 0,
    requiereBonificacion: total === 0, cotizadoAt: ahora,
    // El fin orientativo del arancel alerta: no corta pagos ni borra el último precio.
    avisos: Object.freeze([
      ...(aviso(arancel.hasta) ? ['REVISAR_VIGENCIA_ARANCEL'] : []),
      ...(promo && aviso(promo.hasta) ? ['PROMOCION_POR_FINALIZAR'] : []),
    ]),
  });
}
function validarPago(payment, intento, { collectorId, liveMode }) {
  if (typeof liveMode !== 'boolean') fail('AMBIENTE_NO_CONFIGURADO');
  id(collectorId); id(payment.id);
  if (!mismo(payment.collector_id, collectorId)) fail('RECEPTOR_INCORRECTO');
  if (payment.live_mode !== liveMode) fail('AMBIENTE_INCORRECTO');
  if (typeof intento.externalReference !== 'string' || !intento.externalReference || payment.external_reference !== intento.externalReference) fail('REFERENCIA_INCORRECTA');
  if (payment.currency_id !== 'ARS' || intento.moneda !== 'ARS') fail('MONEDA_INCORRECTA');
  if (!Number.isSafeInteger(intento.totalCentavos) || intento.totalCentavos <= 0 || centavos(payment.transaction_amount) !== intento.totalCentavos) fail('IMPORTE_INCORRECTO');
  const actualizado = instante(payment.date_last_updated);
  const reintegrado = centavos(payment.transaction_amount_refunded);
  const validos = ['approved', 'pending', 'in_process', 'authorized', 'rejected', 'cancelled', 'refunded', 'charged_back'];
  if (!validos.includes(payment.status)) fail('ESTADO_DESCONOCIDO');
  return Object.freeze({
    paymentId: id(payment.id), estado: payment.status, actualizado,
    aprobado: payment.status === 'approved' && reintegrado === 0,
    enProceso: ['pending', 'in_process', 'authorized'].includes(payment.status),
    requiereRevision: reintegrado > 0 || ['refunded', 'charged_back'].includes(payment.status),
    reintegradoCentavos: reintegrado,
  });
}
// Aplicar bajo bloqueo transaccional de la licencia y con paymentId único en DB.
// Operaciones incluye TODOS los intentos de esa licencia, no solo el último.
function resolverOperaciones(operaciones) {
  const latest = new Map();
  for (const op of operaciones) {
    const key = id(op.paymentId);
    if (!Number.isFinite(op.actualizado)) fail('FECHA_INVALIDA');
    const old = latest.get(key);
    if (!old || op.actualizado > old.actualizado) latest.set(key, op);
    else if (op.actualizado === old.actualizado && (op.estado !== old.estado || op.reintegradoCentavos !== old.reintegradoCentavos)) fail('OPERACION_CONFLICTIVA');
  }
  const values = [...latest.values()];
  if (values.some(x => x.requiereRevision)) return 'requiere_revision';
  const approved = values.filter(x => x.aprobado);
  if (approved.length > 1) return 'pago_duplicado';
  if (approved.length === 1) return 'conciliado';
  if (values.some(x => x.enProceso)) return 'en_proceso';
  return values.length ? 'sin_pago_aprobado' : 'sin_iniciar';
}
// La firma autentica el ID de query. El controlador debe consultar ese mismo ID
// mediante la API; nunca usar body.data.id para elegir el pago a acreditar.
function verificarFirma({ dataId, requestId, signature, secret, now = Date.now(), toleranciaMs = 300000 }) {
  if (typeof secret !== 'string' || !secret.trim() || typeof signature !== 'string' || signature.length > 512) return false;
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{1,200}$/.test(requestId)) return false;
  try { dataId = id(dataId); } catch { return false; }
  const parts = signature.split(',').map(s => s.trim().split('='));
  if (parts.length !== 2 || parts.some(p => p.length !== 2)) return false;
  const fields = Object.fromEntries(parts);
  if (!/^(\d{10}|\d{13})$/.test(fields.ts || '') || !/^[a-fA-F0-9]{64}$/.test(fields.v1 || '')) return false;
  const timestamp = Number(fields.ts) * (fields.ts.length === 10 ? 1000 : 1);
  if (!Number.isFinite(now) || !Number.isFinite(toleranciaMs) || toleranciaMs < 0 || Math.abs(now - timestamp) > toleranciaMs) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${fields.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(fields.v1, 'hex'));
}
module.exports = { centavos, cotizar, validarPago, resolverOperaciones, verificarFirma };
