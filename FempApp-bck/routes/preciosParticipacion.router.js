const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { wrap, sesion, roles, evento, db } = require('../services/circuito');
const Tarifarios = require('../services/tarifario');
router.use(verifyToken, sesion);
router.get('/general', roles('tesoreria', 'deportista'), wrap(async (req, res) => {
  const actual = await Tarifarios.vigente();
  const historial = req.auth.rol === 'tesoreria'
    ? await db.TarifarioGeneral.findAll({ order: [['id', 'DESC']], limit: 20 }) : [];
  res.json({ actual, historial });
}));
router.post('/general', roles('tesoreria'), wrap(async (req, res) => {
  const actual = await Tarifarios.publicar(req.body, req.auth.id);
  res.json({ actual });
}));
// Compatibilidad de lectura con pantallas anteriores. No se usan precios por evento.
router.get('/evento/:eventoId', roles('administrador', 'tesoreria', 'deportista'), wrap(async (req, res) => {
  await evento(req.params.eventoId);
  if (req.auth.rol === 'administrador') return res.json([]);
  const t = await Tarifarios.vigente();
  res.json(t ? [1,2,3].map(n => ({ cantidadParticipaciones: n, monto: t['individual' + n], activo: true })) : []);
}));
const retirado = (req, res) => res.status(410).json({ error: 'Los aranceles ahora se administran en Tarifario general. Actualizá la aplicación.' });
router.post('/', roles('tesoreria'), retirado);
router.patch('/:id', roles('tesoreria'), retirado);
router.delete('/:id', roles('tesoreria'), retirado);
module.exports = router;
