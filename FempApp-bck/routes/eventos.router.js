const express = require('express');
const router = express.Router();

const Evento = require('../models/evento.model');
const Usuario = require('../models/usuario.model');
const Asistencia = require('../models/asistencias.model');
const UsuarioEventos = require('../models/usuarioevento.model');

const { sequelize } = require('../models'); // para queries crudos
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { sesion, roles, R, db } = require('../services/circuito');
router.use(require('./circuito.router'));

//const authOptional = (req, res, next) => next();

const authOptional = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return verifyToken(req, res, next);
  return next();
};

const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

function normalizarFecha(valor) {
  if (!valor) return null;

  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function mapEventoPayload(body = {}) {
  const titulo = body.titulo ?? body.nombre ?? null;
  const descripcion = body.descripcion ?? '';
  const fechaInicio = normalizarFecha(body.fechaInicio ?? body.fecha);
  const fechaFin = normalizarFecha(body.fechaFin);
  const lugar = body.lugar ?? null;

  return {
    titulo,
    descripcion,
    fechaInicio,
    fechaFin,
    lugar,
  };
}

function mapEventoResponse(evento) {
  if (!evento) return null;

  const plain = evento.toJSON ? evento.toJSON() : evento;

  return {
    ...plain,

    nombre: plain.titulo || plain.nombre || null,
    fecha: plain.fechaInicio || plain.fecha || null,
  };
}

// GET /eventos
router.get('/', async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      order: [
        ['fechaInicio', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    res.json(eventos.map(mapEventoResponse));
  } catch (error) {
    console.error('Error al obtener los eventos:', error);
    res.status(500).json({ error: 'Error al obtener los eventos' });
  }
});

// POST /eventos
router.post(
  '/',
  verifyToken,
  sesion,
  roles('administrador'),
  async (req, res) => {
    try {
      if ('precio' in req.body || 'preciosParticipacion' in req.body)
        return res
          .status(403)
          .json({ error: 'Los aranceles solo los modifica Tesorería.' });
      const payload = mapEventoPayload(req.body);

      if (!payload.titulo) {
        return res.status(400).json({ error: 'El título es obligatorio' });
      }

      if (!payload.lugar) {
        return res.status(400).json({ error: 'El lugar es obligatorio' });
      }

      const calendario = R.calendario(req.body);
      const nuevoEvento = await Evento.create({
        ...calendario,
        nombre: payload.titulo,
        titulo: payload.titulo,
        descripcion: payload.descripcion,
        fechaInicio: payload.fechaInicio,
        fechaFin: payload.fechaFin,
        lugar: payload.lugar,
        qrEventCode: uuidv4(),
        estado: 'publicado',
      });

      res.status(201).json(mapEventoResponse(nuevoEvento));
    } catch (error) {
      console.error('Error al crear el evento:', error);
      res
        .status(error.status || 500)
        .json({
          error: error.status ? error.message : 'Error al crear el evento',
        });
    }
  },
);

// GET /eventos/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evento = await Evento.findByPk(id);

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.json(mapEventoResponse(evento));
  } catch (error) {
    console.error('Error al obtener el evento:', error);
    res.status(500).json({ error: 'Error al obtener el evento' });
  }
});

// PUT /eventos/:id
router.put(
  '/:id',
  verifyToken,
  sesion,
  roles('administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const evento = await Evento.findByPk(id);

      if (!evento) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      if ('precio' in req.body || 'preciosParticipacion' in req.body)
        return res
          .status(403)
          .json({ error: 'Los aranceles solo los modifica Tesorería.' });
      const payload = mapEventoPayload(req.body);

      if (!payload.titulo) {
        return res.status(400).json({ error: 'El título es obligatorio' });
      }

      if (!payload.lugar) {
        return res.status(400).json({ error: 'El lugar es obligatorio' });
      }

      const actualizado = await db.sequelize.transaction(async (t) => {
        const locked = await Evento.findByPk(id, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        let calendario = {};
        if ('inscripcionRequierePago' in req.body) {
          if (locked.inscripcionesConfirmadasAt)
            R.fail(409, 'La nómina ya está confirmada.');
          if (
            await db.Pago.count({
              where: { eventoId: Number(id) },
              transaction: t,
            })
          )
            R.fail(
              409,
              'El evento tiene pagos anteriores; requiere revisión antes de migrarlo.',
            );
          calendario = R.calendario(req.body);
        }
        await locked.update(
          { ...calendario, nombre: payload.titulo, ...payload },
          { transaction: t },
        );
        return locked;
      });

      res.json(mapEventoResponse(actualizado));
    } catch (error) {
      console.error('Error al actualizar el evento:', error);
      res
        .status(error.status || 500)
        .json({
          error: error.status ? error.message : 'Error al actualizar el evento',
        });
    }
  },
);

// Recibir los eventos de un usuario (patinador)
router.get('/usuarios/:usuarioId/eventos', async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const usuario = await Usuario.findByPk(usuarioId, {
      include: {
        model: Evento,
        through: {
          attributes: [],
          where: { estadoInscripcion: { [db.Sequelize.Op.ne]: 'baja' } },
        },
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario.Eventos);
  } catch (error) {
    console.error('Error al obtener eventos del usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener inscriptos de un evento (solo admin/técnico)
router.get(
  '/:eventoId/usuarios',
  verifyToken,
  requireRole('administrador', 'tecnico'),
  async (req, res) => {
    try {
      const { eventoId } = req.params;
      const evento = await Evento.findByPk(eventoId, { include: Usuario });
      if (!evento)
        return res.status(404).json({ error: 'Evento no encontrado' });
      res.json(evento.Usuarios);
    } catch (error) {
      res
        .status(500)
        .json({ error: 'Error al obtener los usuarios del evento' });
    }
  },
);

// GET /eventos/:eventId/qr.png
router.get('/:eventId/qr.png', authOptional, async (req, res) => {
  const id = Number(req.params.eventId);
  const ev = await Evento.findByPk(id);
  if (!ev) return res.status(404).send('Evento no encontrado');

  // genera token si falta
  if (!ev.qrEventCode) {
    ev.qrEventCode = uuidv4();
    await ev.save();
  }

  const isDownload = String(req.query.dl) === '1';
  const payload = `FEMPAPP://checkin?e=${id}&t=${ev.qrEventCode}`;
  const png = await QRCode.toBuffer(payload, { width: 512, margin: 1 });

  if (isDownload) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="qr-evento-${id}.png"`,
    );
  } else {
    res.type('png');
  }
  res.send(png);
});

// POST /eventos/:eventId/qr
router.post('/:eventId/qr', authOptional, async (req, res) => {
  const id = Number(req.params.eventId);
  const ev = await Evento.findByPk(id);
  if (!ev) return res.status(404).send('Evento no encontrado');
  ev.qrEventCode = uuidv4();
  await ev.save();
  res.json({ ok: true, token: ev.qrEventCode });
});

// helpers
function haversineMeters(lat1, lon1, lat2, lon2) {
  /* ... */
}
function inWindow(ev) {
  if (!ev.checkinOpenAt || !ev.checkinCloseAt) return true;
  const now = new Date();
  return (
    now >= new Date(ev.checkinOpenAt) && now <= new Date(ev.checkinCloseAt)
  );
}

// POST /eventos/:eventId/checkin
router.post('/:eventId/checkin', authOptional, async (req, res) => {
  const id = Number(req.params.eventId);
  const token = String(req.body?.token || '');
  const userId = req.user?.id || req.body?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const ev = await Evento.findByPk(id);
  if (!ev) return res.status(404).json({ error: 'Evento inexistente' });

  console.log('CHECKIN DEBUG →', {
    eventId: id,
    tokenFromBody: token,
    tokenInDb: ev.qrEventCode,
    equals: token === ev.qrEventCode,
  });

  if (!token || token !== ev.qrEventCode)
    return res.status(400).json({ error: 'QR inválido' });
  if (!inWindow(ev))
    return res.status(400).json({ error: 'Check-in fuera de horario' });

  // Geo opcional
  const requireGeo = !!ev.requireGeo;
  const radius = Number(ev.checkinRadius ?? ev.checkinRadiusM ?? 200);
  const lat = Number(req.body?.lat ?? req.body?.loc?.lat);
  const lng = Number(req.body?.lng ?? req.body?.loc?.lng);
  if (
    ev.lat &&
    ev.lng &&
    (requireGeo || (Number.isFinite(lat) && Number.isFinite(lng)))
  ) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (requireGeo)
        return res
          .status(400)
          .json({ error: 'Ubicación requerida en el lugar' });
    } else if (
      haversineMeters(Number(ev.lat), Number(ev.lng), lat, lng) > radius
    ) {
      return res.status(400).json({ error: 'Fuera de la sede' });
    }
  }

  // Inscripción
  const ue = await UsuarioEventos.findOne({
    where: {
      EventoId: id,
      UsuarioId: userId,
      estadoInscripcion: { [db.Sequelize.Op.ne]: 'baja' },
    },
  });
  if (!ue) return res.status(400).json({ error: 'No inscripto' });

  // Asistencia
  try {
    await Asistencia.create({
      eventoId: id,
      usuarioId: userId,
      checkedAt: new Date(),
    });
    res.json({ created: true });
  } catch {
    res.json({ created: false }); // duplicado
  }
});

module.exports = router;
