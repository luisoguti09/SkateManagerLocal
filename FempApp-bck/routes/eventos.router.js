const express = require('express');
const router = express.Router();

const Evento = require('../models/evento.model');
const Usuario = require('../models/usuario.model');
const Asistencia = require('../models/asistencias.model');
const UsuarioEventos = require('../models/usuarioevento.model');

const { sequelize } = require('../models'); // para queries crudos
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
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

  return parsed;
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
    lugar
  };
}

function mapEventoResponse(evento) {
  if (!evento) return null;

  const plain = evento.toJSON ? evento.toJSON() : evento;

  return {
    ...plain,

    nombre: plain.titulo ?? null,
    fecha: plain.fechaInicio ?? null
  };
}

// GET /eventos
router.get('/', async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      order: [['fechaInicio', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json(eventos.map(mapEventoResponse));
  } catch (error) {
    console.error('Error al obtener los eventos:', error);
    res.status(500).json({ error: 'Error al obtener los eventos' });
  }
});

// POST /eventos
router.post('/', async (req, res) => {
  try {
    const payload = mapEventoPayload(req.body);

    if (!payload.titulo) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }

    if (!payload.lugar) {
      return res.status(400).json({ error: 'El lugar es obligatorio' });
    }

    const nuevoEvento = await Evento.create({
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      fechaInicio: payload.fechaInicio,
      fechaFin: payload.fechaFin,
      lugar: payload.lugar,
      qrEventCode: uuidv4(),
      estado: 'publicado'
    });

    res.status(201).json(mapEventoResponse(nuevoEvento));
  } catch (error) {
    console.error('Error al crear el evento:', error);
    res.status(500).json({ error: 'Error al crear el evento' });
  }
});

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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evento = await Evento.findByPk(id);

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const payload = mapEventoPayload(req.body);

    if (!payload.titulo) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }

    if (!payload.lugar) {
      return res.status(400).json({ error: 'El lugar es obligatorio' });
    }

    await evento.update({
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      fechaInicio: payload.fechaInicio,
      fechaFin: payload.fechaFin,
      lugar: payload.lugar
    });

    res.json(mapEventoResponse(evento));
  } catch (error) {
    console.error('Error al actualizar el evento:', error);
    res.status(500).json({ error: 'Error al actualizar el evento' });
  }
});



// Recibir los eventos de un usuario (patinador)
router.get('/usuarios/:usuarioId/eventos', async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const usuario = await Usuario.findByPk(usuarioId, {
      include: {
        model: Evento,
        through: { attributes: [] }
      }
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


// POST /eventos/:eventoId/inscribir
// Permite una o varias participaciones deportivas en el mismo evento.
// Regla de duplicado: EventoId + UsuarioId + perfilDeportivoId.
router.post('/:eventoId/inscribir', async (req, res) => {
  console.log('[INSCRIPCION MULTIPERFIL] endpoint nuevo activo');
  try {
    const { eventoId } = req.params;
    const { usuarioId, perfilDeportivoId, perfilDeportivoIds } = req.body;

    if (!usuarioId) {
      return res.status(400).json({
        error: 'Falta usuarioId'
      });
    }

    const perfilesIds = Array.isArray(perfilDeportivoIds)
      ? perfilDeportivoIds
      : perfilDeportivoId
        ? [perfilDeportivoId]
        : [];

    const perfilesIdsNormalizados = perfilesIds
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && id > 0);

    if (!perfilesIdsNormalizados.length) {
      return res.status(400).json({
        error: 'Debe seleccionar al menos un perfil deportivo',
        version: 'multiperfil'
      });
    }

    const usuario = await Usuario.findByPk(usuarioId);
    const evento = await Evento.findByPk(eventoId);

    if (!usuario || !evento) {
      return res.status(404).json({
        error: 'Usuario o evento no encontrado'
      });
    }

    const inscripcionesCreadas = [];
    const inscripcionesExistentes = [];

    for (const perfilId of perfilesIdsNormalizados) {
      const perfil = await sequelize.models.PerfilDeportivo.findByPk(perfilId);

      if (!perfil) {
        return res.status(404).json({
          error: `Perfil deportivo no encontrado: ${perfilId}`
        });
      }

      if (Number(perfil.usuarioId) !== Number(usuarioId)) {
        return res.status(403).json({
          error: `El perfil deportivo ${perfilId} no pertenece al usuario`
        });
      }

      if (perfil.activa === false || perfil.activa === 0) {
        return res.status(400).json({
          error: `El perfil deportivo ${perfilId} está inactivo`
        });
      }

      const existeInscripcion = await UsuarioEventos.findOne({
        where: {
          EventoId: Number(eventoId),
          UsuarioId: Number(usuarioId),
          perfilDeportivoId: Number(perfilId)
        }
      });

      if (existeInscripcion) {
        inscripcionesExistentes.push(existeInscripcion);
        continue;
      }

      const inscripcion = await UsuarioEventos.create({
        EventoId: Number(eventoId),
        UsuarioId: Number(usuarioId),
        perfilDeportivoId: Number(perfilId),

        disciplina: perfil.disciplina,
        categoria: perfil.categoria,
        division: perfil.divisional,
        grupo: null,
        rol: 'deportista'
      });

      inscripcionesCreadas.push(inscripcion);
    }

    return res.status(201).json({
      mensaje: 'Inscripción procesada correctamente',
      creadas: inscripcionesCreadas.length,
      existentes: inscripcionesExistentes.length,
      inscripcionesCreadas,
      inscripcionesExistentes
    });

  } catch (error) {
    console.error('Error al inscribirse:', error);
    return res.status(500).json({
      error: 'Error al inscribirse al evento',
      detail: error.message
    });
  }
});


// Obtener inscriptos de un evento (solo admin/técnico)
router.get('/:eventoId/usuarios',
  verifyToken,
  requireRole('administrador', 'tecnico'),
  async (req, res) => {
    try {
      const { eventoId } = req.params;
      const evento = await Evento.findByPk(eventoId, { include: Usuario });
      if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
      res.json(evento.Usuarios);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener los usuarios del evento' });
    }
  }
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
    res.setHeader('Content-Disposition', `attachment; filename="qr-evento-${id}.png"`);
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
function haversineMeters(lat1, lon1, lat2, lon2) { /* ... */ }
function inWindow(ev) {
  if (!ev.checkinOpenAt || !ev.checkinCloseAt) return true;
  const now = new Date();
  return now >= new Date(ev.checkinOpenAt) && now <= new Date(ev.checkinCloseAt);
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
    equals: token === ev.qrEventCode
  });


  if (!token || token !== ev.qrEventCode) return res.status(400).json({ error: 'QR inválido' });
  if (!inWindow(ev)) return res.status(400).json({ error: 'Check-in fuera de horario' });

  // Geo opcional
  const requireGeo = !!ev.requireGeo;
  const radius = Number(ev.checkinRadius ?? ev.checkinRadiusM ?? 200);
  const lat = Number(req.body?.lat ?? req.body?.loc?.lat);
  const lng = Number(req.body?.lng ?? req.body?.loc?.lng);
  if (ev.lat && ev.lng && (requireGeo || (Number.isFinite(lat) && Number.isFinite(lng)))) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (requireGeo) return res.status(400).json({ error: 'Ubicación requerida en el lugar' });
    } else if (haversineMeters(Number(ev.lat), Number(ev.lng), lat, lng) > radius) {
      return res.status(400).json({ error: 'Fuera de la sede' });
    }
  }

  // Inscripción
  const ue = await UsuarioEventos.findOne({ where: { EventoId: id, UsuarioId: userId } });
  if (!ue) return res.status(400).json({ error: 'No inscripto' });

  // Asistencia
  try {
    await Asistencia.create({ eventoId: id, usuarioId: userId, checkedAt: new Date() });
    res.json({ created: true });
  } catch {
    res.json({ created: false }); // duplicado
  }
});

// GET /eventos/:eventId/inscripciones.csv
router.get('/:eventId/inscripciones.csv', authOptional, async (req, res) => {
  try {
    const id = Number(req.params.eventId);

    // columnas que el front podría pedir (?cols=a,b,c)
    const asked = String(req.query.cols || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // SQL tolerante: intenta varios nombres de columna posibles
    const [rows] = await sequelize.query(
      `
      SELECT
        ue.UsuarioId AS usuarioId,
        u.dni                       AS dni,
        /* nombre "amigable" (fallbacks) */
        COALESCE(
          TRIM(CONCAT(u.apellido, ' ', u.nombre)),
          TRIM(CONCAT(u.apellidos, ' ', u.nombres)),
          TRIM(u.displayName),
          TRIM(u.nombre),
          TRIM(u.apellido),
          ''
        )                           AS displayName,
        /* por si querés separar después */
        u.apellido                  AS apellido,
        u.nombre                    AS nombre,
        COALESCE(u.sexo, u.genero)  AS genero,
        CASE
          WHEN u.fechaNacimiento IS NULL THEN NULL
          ELSE TIMESTAMPDIFF(YEAR, u.fechaNacimiento, CURDATE())
        END                         AS edad,
        ue.categoria                AS categoria,
        ue.disciplina               AS disciplina,
        ue.division                 AS division,
        ue.grupo                    AS grupo,
        ue.rol                      AS rol,
        ue.createdAt                AS inscriptoEn
      FROM usuarioeventos ue
      LEFT JOIN usuarios u ON u.id = ue.UsuarioId
      WHERE ue.EventoId = ?
      ORDER BY displayName
      `,
      { replacements: [id] }
    );

    // mapa -> nombre final en CSV
    const fields = {
      usuarioId: 'usuarioId',
      dni: 'dni',
      displayName: 'nombreCompleto',
      apellido: 'apellido',
      nombre: 'nombre',
      genero: 'genero',
      edad: 'edad',
      categoria: 'categoria',
      disciplina: 'disciplina',
      division: 'division',
      grupo: 'grupo',
      rol: 'rol',
      inscriptoEn: 'inscriptoEn',
    };


    const headerKeys =
      asked.length > 0
        ? asked.filter(k => fields[k])
        : ['apellido', 'nombre', 'dni', 'genero', 'edad', 'division', 'grupo', 'rol'];


    const derive = (r, key) => {
      if (key === 'apellido' && !r.apellido && r.displayName) {
        const parts = r.displayName.trim().split(/\s+/);
        return parts.length > 1 ? parts[parts.length - 1] : r.displayName;
      }
      if (key === 'nombre' && !r.nombre && r.displayName) {
        const parts = r.displayName.trim().split(/\s+/);
        return parts.length > 1 ? parts.slice(0, parts.length - 1).join(' ') : r.displayName;
      }
      return r[key];
    };

    const csvHeaders = headerKeys.map(k => fields[k]);
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = rows
      .map(r => headerKeys.map(k => esc(derive(r, k))).join(','))
      .join('\n');

    res
      .type('text/csv')
      .attachment(`inscripciones_evento_${id}.csv`)
      .send(csvHeaders.join(',') + '\n' + body + '\n');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo generar el CSV' });
  }
});




module.exports = router;
