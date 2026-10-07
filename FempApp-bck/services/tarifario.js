const db = require('../models');
const R = require('./circuito-reglas');
const T = require('./tarifario-reglas');
async function estado(t) {
  const row = await db.TarifarioEstado.findByPk(1, { transaction: t, ...(t && { lock: t.LOCK.UPDATE }) });
  if (!row) R.fail(503, 'Falta aplicar la migración del tarifario general.');
  return row;
}
async function vigente(t) {
  const s = await estado(t);
  return s.tarifarioId ? db.TarifarioGeneral.findByPk(s.tarifarioId, { transaction: t }) : null;
}
async function publicar(body, actorId) {
  const valores = T.validar(body);
  if (!Object.prototype.hasOwnProperty.call(body, 'versionActual')) R.fail(400, 'Falta la versión consultada. Actualizá la pantalla.');
  const version = body.versionActual === null ? null : R.id(body.versionActual);
  return db.sequelize.transaction(async t => {
    const s = await estado(t);
    if ((s.tarifarioId || null) !== version) R.fail(409, 'Otro usuario actualizó el tarifario. Recargá antes de guardar.');
    const actual = s.tarifarioId ? await db.TarifarioGeneral.findByPk(s.tarifarioId, { transaction: t }) : null;
    if (actual && T.campos.every(c => R.centavos(actual[c]) === R.centavos(valores[c]))) return actual;
    const nuevo = await db.TarifarioGeneral.create({ ...valores, actorId }, { transaction: t });
    await s.update({ tarifarioId: nuevo.id }, { transaction: t });
    return nuevo;
  });
}
module.exports = { vigente, publicar };
