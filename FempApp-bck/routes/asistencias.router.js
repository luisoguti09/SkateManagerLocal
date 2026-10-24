// routes/asistencias.router.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Asistencia = require('../models/asistencias.model');
const Usuario = require('../models/usuario.model');
const Evento = require('../models/evento.model');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

router.post('/check-in', verifyToken, requireRole('juez', 'administrador'), async (req, res) => {
  try {
    const { eventoId, token } = req.body;
    if (!eventoId || !token) return res.status(400).json({ error: 'Datos incompletos' });

    const payload = jwt.verify(token, process.env.QR_SECRET, { algorithms: ['HS256'] });
    if (payload.typ !== 'qr') return res.status(400).json({ error: 'Token inválido' });

    const user = await Usuario.findByPk(payload.sub);
    if (!user || user.qrJti !== payload.jti) return res.status(400).json({ error: 'Credencial revocada' });
    if (user.estado !== 'aprobado') return res.status(403).json({ error: 'Usuario no aprobado' });

    const evento = await Evento.findByPk(eventoId);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    // (opcional) validar ventana horaria del evento

    const [row, created] = await Asistencia.findOrCreate({
      where: { eventoId, usuarioId: user.id },
      defaults: { scanBy: req.user.id, device: req.headers['user-agent'] }
    });

    res.json({ ok: true, created, usuarioId: user.id, nombre: user.apellidoYNombre || user.nombre });
  } catch (e) {
    return res.status(400).json({ error: 'Token inválido o expirado' });
  }
});

// Consultas agrupadas: el club se obtiene de la cuenta autenticada, nunca del navegador.
const consulta=require('../services/asistencias-consulta');
const consultaSegura=fn=>async(req,res)=>{
  try{res.set('Cache-Control','private, no-store');res.json(await fn(req));}
  catch(e){console.error('[ASISTENCIAS_CONSULTA]',e.name);res.status(e.status||500).json({error:e.status?e.message:'No se pudieron consultar las asistencias.'});}
};
router.get('/resumen',verifyToken,requireRole('administrador','juez','tecnico'),consultaSegura(req=>consulta.resumen(req.cuenta)));
router.get('/eventos/:id',verifyToken,requireRole('administrador','juez','tecnico'),consultaSegura(req=>consulta.detalle(req.cuenta,req.params.id,req.query)));

router.get('/', verifyToken, requireRole('administrador', 'juez'), async (req, res) => {
  try {
    const { eventoId } = req.query;

    const where = {};
    if (eventoId) where.eventoId = eventoId;

    const asistencias = await Asistencia.findAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'Usuario',
          attributes: ['id', 'nombre', 'dni', 'email']
        },
        {
          model: Evento,
          attributes: ['id', 'titulo', 'lugar', 'fechaInicio', 'fechaFin']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(asistencias);
  } catch (error) {
    console.error('Error listando asistencias:', error);
    res.status(500).json({ error: 'Error al listar asistencias' });
  }
});

module.exports = router;
