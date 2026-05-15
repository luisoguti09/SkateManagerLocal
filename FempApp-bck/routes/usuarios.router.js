const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario.model');
const Rol = require('../models/rol.model');
const Evento = require('../models/evento.model');
const multer = require('multer');
const upload = require('../middleware/upload.middleware');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const authOptional = (req, res, next) => next();

const path = require('path');
const fs = require('fs');
const db = require('../models');
const { Op } = require('sequelize');



// === Configuración de Multer para carga de imágenes ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/patinador/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `patinador_${req.params.dni}${ext}`);
  }
});

router.get('/admin/usuarios',
  verifyToken,
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { estado, rol, q } = req.query;

      const where = {};

      if (estado) where.estado = estado;
      if (rol) where.rol = rol;

      if (q) {
        where[Op.or] = [
          { nombre: { [Op.like]: `%${q}%` } },
          { apellido: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
          { dni: { [Op.like]: `%${q}%` } },
        ];
      }

      const usuarios = await Usuario.findAll({
        where,
        order: [['createdAt', 'DESC']],
        attributes: ['id','dni','nombre','apellido','email','rol','aprobadoEstado','createdAt']
      });

      res.json(usuarios);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al listar usuarios' });
    }
  }
);


// GET /usuarios?aprobado=true|false
router.get('/',
  verifyToken,
  requireRole('administrador', 'tecnico'),
  async (req, res) => {
    try {
      const { aprobado } = req.query;

      // Detecta atributos reales del modelo
      const rawAttrs = (Usuario.getAttributes?.() ?? Usuario.rawAttributes) || {};
      const has = (k) => !!rawAttrs[k];

      const where = {};
      if (typeof aprobado !== 'undefined' && has('aprobado')) {
        where.aprobado = String(aprobado).toLowerCase() === 'true' ? 1 : 0;
      }

      // Columns a devolver (solo las que existan)
      const attrs = [];
      // orden sugerido
      if (has('id')) attrs.push('id');
      if (has('dni')) attrs.push('dni');

      // nombre para mostrar
      if (has('displayName')) {
        attrs.push('displayName');
      } else {
        if (has('apellido')) attrs.push('apellido');
        if (has('nombre'))   attrs.push('nombre');
      }

      if (has('email'))     attrs.push('email');
      if (has('rol'))       attrs.push('rol');
      if (has('aprobado'))  attrs.push('aprobado');
      if (has('estado'))    attrs.push('estado');

      // Orden seguro
      const order = [];
      if (has('apellido'))       order.push(['apellido', 'ASC']);
      if (has('nombre'))         order.push(['nombre', 'ASC']);
      else if (has('displayName')) order.push(['displayName', 'ASC']);
      else if (has('email'))     order.push(['email', 'ASC']);

      const usuarios = await Usuario.findAll({ where, attributes: attrs, order });
      res.json(usuarios);
    } catch (e) {
      console.error('GET /usuarios error', e);
      res.status(500).json({ error: 'Error al listar usuarios' });
    }
  }
);

router.put('/:dni/perfil', async (req, res) => {
  const { dni } = req.params;
  const datos = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { dni } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    await usuario.update(datos);
    res.status(200).json({ message: 'Datos actualizados correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// === SUBIR foto de perfil ===
router.post('/:dni/fotoPerfil', upload.single('fotoPerfil'), async (req, res) => {
  try {
    const { dni } = req.params;
    const usuario = await Usuario.findOne({ where: { dni } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    // ✅ Guarda la ruta relativa en la BD
    usuario.fotoPerfil = `uploads/usuarios/${req.file.filename}`;
    await usuario.save();

    // ✅ Devuelve la URL completa para el frontend
    res.status(200).json({
      message: 'Foto de perfil actualizada',
      url: `${req.protocol}://${req.get('host')}/uploads/usuarios/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error al subir foto de perfil:', error);
    res.status(500).json({ error: 'Error al subir foto de perfil' });
  }
});

// === ELIMINAR foto de perfil ===
router.delete('/:dni/fotoPerfil', async (req, res) => {
  try {
    const { dni } = req.params;
    const usuario = await Usuario.findOne({ where: { dni } });
    if (!usuario || !usuario.fotoPerfil) return res.status(404).json({ error: 'Foto no encontrada' });

    // Borra archivo físico
    const filePath = path.join(__dirname, '..', usuario.fotoPerfil);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    usuario.fotoPerfil = null;
    await usuario.save();

    res.status(200).json({ message: 'Foto de perfil eliminada' });
  } catch (error) {
    console.error('Error al eliminar foto de perfil:', error);
    res.status(500).json({ error: 'Error al eliminar foto de perfil' });
  }
});

// Obteniene un usuario por DNI (retorna null si no existe)


router.get('/dni/:dni', async (req, res) => {
  try {
    const { dni } = req.params;
    const usuario = await Usuario.findOne({ where: { dni } });
    return res.json(usuario || null);
  } catch (e) {
    console.error('Error /usuarios/dni/:dni', e);
    res.status(500).json({ error: 'Error consultando usuario por DNI' });
  }
});

router.get('/:dni/eventos', async (req, res) => {
  const { dni } = req.params;

  try {
    const usuario = await db.Usuario.findOne({
      where: { dni },
      include: [{
        model: db.Evento,
        through: { attributes: [] }
      }]
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario.Eventos);
  } catch (error) {
    console.error('Error al buscar eventos del usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


router.post('/:id/qr', verifyToken,  
  requireRole('administrador','tecnico','deportista'), async (req, res) => {
    const { id } = req.params;
    if (+id !== req.user.id && req.user.rol !== 'administrador')
      return res.status(403).json({ error: 'No autorizado' });

    const u = await Usuario.findByPk(id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    u.qrJti = uuidv4();
    await u.save();

    const token = jwt.sign({ sub: u.id, jti: u.qrJti, typ: 'qr' },
      process.env.QR_SECRET, { algorithm: 'HS256' });
    res.json({ token });
  });

router.get('/:id/qr.png', verifyToken,  
  requireRole('administrador','tecnico','deportista'), async (req, res) => {
    const { id } = req.params;
    const transparent = req.query.transparent === '1';
    if (+id !== req.user.id && req.user.rol !== 'administrador')
      return res.status(403).json({ error: 'No autorizado' });

    const u = await Usuario.findByPk(id);
    if (!u || !u.qrJti) return res.status(404).json({ error: 'Sin credencial' });
    const token = jwt.sign({ sub: u.id, jti: u.qrJti, typ: 'qr' },
      process.env.QR_SECRET, { algorithm: 'HS256' });

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const opts = { 
      width: 512, margin: 1,
       ...(transparent ? { color: { dark:'#000000', light:'#0000' } } : {}) 
      };
    QRCode.toFileStream(res, token, opts);
  });

router.post('/:id/solicitar-rol', verifyToken, async (req, res) => {
  const { id } = req.params; const { rol } = req.body; // 'tecnico'|'deportista'
  if (+id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  const u = await Usuario.findByPk(id);
  u.rolSolicitado = rol; await u.save();
  res.json({ ok: true });
});

// === Aprobar usuario por ID ===

router.patch('/:id/aprobar', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { aprobar, rol } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (aprobar) {
      usuario.estado = 'aprobado';
      usuario.aprobado = true;
      if (rol) usuario.rol = rol;
    } else {
      usuario.estado = 'bloqueado';
      usuario.aprobado = false;
    }

    await usuario.save();

    return res.status(200).json({
      ok: true,
      usuario: {
        id: usuario.id,
        dni: usuario.dni,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estado: usuario.estado,
        aprobado: usuario.aprobado
      }
    });
  } catch (error) {
    console.error('PATCH /usuarios/:id/aprobar error', error);
    return res.status(500).json({ error: 'Error al actualizar aprobación del usuario' });
  }
});
// GET /eventos/:id/qr.png  => PNG del QR del evento (único)
router.get('/:eventId/qr.png', authOptional, async (req, res) => {
  const id = Number(req.params.eventId);
  const ev = await Evento.findByPk(id);
  if (!ev) return res.status(404).send('Evento no encontrado');

  if (!ev.qrEventCode) { ev.qrEventCode = uuidv4(); await ev.save(); }

  const payload = `FEMPAPP://checkin?e=${id}&t=${ev.qrEventCode}`;
  const png = await QRCode.toBuffer(payload, { width: 256 });
  res.type('png').send(png);
});

// POST /eventos/:id/qr  => regenerar el token del evento
router.post('/:eventId/qr', authOptional, async (req, res) => {
  const id = Number(req.params.eventId);
  const ev = await Evento.findByPk(id);
  if (!ev) return res.status(404).send('Evento no encontrado');
  ev.qrEventCode = uuidv4();
  await ev.save();
  res.json({ ok: true, token: ev.qrEventCode });
});

// POST /eventos/:id/checkin  => atleta escanea QR del evento con su app
router.post('/:eventId/checkin', authOptional, async (req, res) => {
  const id = Number(req.params.eventId);
  const token = String(req.body?.token || req.query?.token || '');
  const userId = req.user?.id || req.auth?.id || req.body?.userId; // si usás JWT, tomalo de ahí

  const ev = await Evento.findByPk(id);
  if (!ev || !token || token !== ev.qrEventCode) {
    return res.status(400).json({ error: 'QR inválido' });
  }

  // validar inscripción (UsuarioEventos)
  const ue = await UsuarioEventos.findOne({ where: { EventoId: id, UsuarioId: userId }});
  if (!ue) return res.status(400).json({ error: 'No inscripto' });

  try {
    // registrar asistencia (índice único evita duplicados)
    await Asistencia.create({ eventoId: id, usuarioId: userId, checkedAt: new Date() });
    return res.json({ created: true });
  } catch (err) {
    // ER_DUP_ENTRY = ya estaba
    return res.json({ created: false });
  }
});

module.exports = router;

