const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { wrap, sesion, roles, evento, R, db } = require('../services/circuito');
router.use(verifyToken, sesion);
router.get(
  '/evento/:eventoId',
  roles('administrador', 'tesoreria', 'deportista'),
  wrap(async (req, res) => {
    await evento(req.params.eventoId);
    res.json(
      await db.PrecioParticipacionEvento.findAll({
        where: { eventoId: R.id(req.params.eventoId) },
        order: [['cantidadParticipaciones', 'ASC']],
      }),
    );
  }),
);
function validar(body) {
  const n = R.id(body.cantidadParticipaciones);
  if (n > 100) R.fail(400, 'Cantidad inválida.');
  if (R.centavos(body.monto) <= 0)
    R.fail(400, 'El arancel debe ser mayor a cero.');
  if (body.activo !== undefined && typeof body.activo !== 'boolean')
    R.fail(400, 'Estado inválido.');
  return {
    cantidadParticipaciones: n,
    monto: body.monto,
    activo: body.activo ?? true,
  };
}
router.post(
  '/',
  roles('tesoreria'),
  wrap(async (req, res) => {
    const data = validar(req.body);
    const precio = await db.sequelize.transaction(async (t) => {
      const ev = await evento(req.body.eventoId, t);
      const [p] = await db.PrecioParticipacionEvento.findOrCreate({
        where: {
          eventoId: ev.id,
          cantidadParticipaciones: data.cantidadParticipaciones,
        },
        defaults: data,
        transaction: t,
      });
      await p.update(data, { transaction: t });
      return p;
    });
    res.json({ precio });
  }),
);
router.patch(
  '/:id',
  roles('tesoreria'),
  wrap(async (req, res) => {
    const precio = await db.sequelize.transaction(async (t) => {
      const p = await db.PrecioParticipacionEvento.findByPk(
        R.id(req.params.id),
        { transaction: t },
      );
      if (!p) R.fail(404, 'Arancel inexistente.');
      await evento(p.eventoId, t);
      const data = validar({ ...p.toJSON(), ...req.body });
      if (data.cantidadParticipaciones !== p.cantidadParticipaciones)
        R.fail(400, 'Creá otro arancel para una cantidad distinta.');
      await p.update(data, { transaction: t });
      return p;
    });
    res.json({ precio });
  }),
);
router.delete(
  '/:id',
  roles('tesoreria'),
  wrap(async (req, res) => {
    await db.sequelize.transaction(async (t) => {
      const p = await db.PrecioParticipacionEvento.findByPk(
        R.id(req.params.id),
        { transaction: t },
      );
      if (!p) R.fail(404, 'Arancel inexistente.');
      await evento(p.eventoId, t);
      await p.update({ activo: false }, { transaction: t });
    });
    res.json({ ok: true });
  }),
);
module.exports = router;
