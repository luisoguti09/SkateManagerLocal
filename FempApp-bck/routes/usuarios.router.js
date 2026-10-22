const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario.model');
const Rol = require('../models/rol.model');
const Evento = require('../models/evento.model');
const multer = require('multer');

const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const {v4:uuidv4}=require('uuid');
const C=require('../services/cuenta');
const F=require('../services/cuenta-archivos');
const {limite}=require('../middleware/cuenta-limites');

const path = require('path');
const fs = require('fs');
const db = require('../models');
const { Op } = require('sequelize');

function normalizarDni(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatearDniConPuntos(value) {
  const limpio = normalizarDni(value);

  if (!limpio) return '';

  return limpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// === Configuración de Multer para carga de imágenes ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/patinador/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `patinador_${req.params.dni}${ext}`);
  },
});

router.get(
  '/admin/usuarios',
  verifyToken,
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { estado, rol, q } = req.query;

      const rawAttrs =
        (Usuario.getAttributes?.() ?? Usuario.rawAttributes) || {};
      const has = (k) => !!rawAttrs[k];

      const where = {};

      if (estado && has('estado')) where.estado = estado;
      if (rol && has('rol')) where.rol = rol;

      if (q) {
        const or = [];

        if (has('nombre')) {
          or.push({ nombre: { [Op.like]: `%${q}%` } });
        }

        if (has('apellido')) {
          or.push({ apellido: { [Op.like]: `%${q}%` } });
        }

        if (has('email')) {
          or.push({ email: { [Op.like]: `%${q}%` } });
        }

        if (has('dni')) {
          or.push({ dni: { [Op.like]: `%${q}%` } });
        }

        if (or.length) where[Op.or] = or;
      }

      const attributes = [];

      [
        'id',
        'dni',
        'nombre',
        'apellido',
        'email',
        'rol',
        'rolId',
        'aprobado',
        'estado',
        'createdAt',
      ].forEach((attr) => {
        if (has(attr)) attributes.push(attr);
      });

      const usuarios = await Usuario.findAll({
        where,
        order: [['createdAt', 'DESC']],
        attributes,
      });

      res.json(usuarios);
    } catch (e) {
      console.error('GET /usuarios/admin/usuarios error', e);
      res.status(500).json({ error: 'Error al listar usuarios' });
    }
  },
);

// GET /usuarios?aprobado=true|false
router.get(
  '/',
  verifyToken,
  requireRole('administrador', 'juez'),
  async (req, res) => {
    try {
      const { aprobado } = req.query;

      // Detecta atributos reales del modelo
      const rawAttrs =
        (Usuario.getAttributes?.() ?? Usuario.rawAttributes) || {};
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
        if (has('nombre')) attrs.push('nombre');
      }

      if (has('email')) attrs.push('email');
      if (has('rol')) attrs.push('rol');
      if (has('aprobado')) attrs.push('aprobado');
      if (has('estado')) attrs.push('estado');

      // Orden seguro
      const order = [];
      if (has('apellido')) order.push(['apellido', 'ASC']);
      if (has('nombre')) order.push(['nombre', 'ASC']);
      else if (has('displayName')) order.push(['displayName', 'ASC']);
      else if (has('email')) order.push(['email', 'ASC']);

      const usuarios = await Usuario.findAll({
        where,
        attributes: attrs,
        order,
      });
      res.json(usuarios);
    } catch (e) {
      console.error('GET /usuarios error', e);
      res.status(500).json({ error: 'Error al listar usuarios' });
    }
  },
);

router.put('/:dni/perfil', verifyToken, async (req, res) => {
  const { dni } = req.params;
  const permitidos = [
    'nombre',
    'edad',
    'club',
    'categoria',
    'nivel',
    'domicilio',
    'telefono',
    'fechaNacimiento',
    'instagram',
    'facebook',
    'tiktok',
  ];
  if (req.body.dni != null && String(req.body.dni) !== String(dni))
    return res
      .status(400)
      .json({ error: 'El DNI no se modifica desde el perfil.' });
  if (Object.keys(req.body).some((k) => k !== 'dni' && !permitidos.includes(k)))
    return res
      .status(400)
      .json({
        error: 'El perfil contiene campos no editables por este endpoint.',
      });
  const datos = Object.fromEntries(
    permitidos.filter((k) => k in req.body).map((k) => [k, req.body[k]]),
  );

  try {
    const usuario = await Usuario.findOne({ where: { dni } });
    if (!usuario)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    if (Number(usuario.id) !== Number(req.auth.id))
      return res.status(403).json({ error: 'Solo podés editar tu perfil.' });
    if('club' in datos && datos.club!==usuario.club)return res.status(403).json({error:'El cambio de club debe gestionarlo la Federación.'});
    const validados=C.R.perfil(datos);
    await Usuario.sequelize.transaction(async t=>{
      const locked=await Usuario.findByPk(usuario.id,{transaction:t,lock:t.LOCK.UPDATE});
      await locked.update({...validados,revision:locked.revision+1},{transaction:t});
    });
    res.status(200).json({ message: 'Datos actualizados correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});


const propia=(req,res,next)=>String(req.params.dni).replace(/\D/g,'')===String(req.auth.dni).replace(/\D/g,'')?next():res.status(403).json({error:'Solo podés modificar tu perfil.'});
router.get('/:dni/perfil',verifyToken,propia,C.wrap(async(req,res)=>res.json(C.R.safe(req.cuenta))));
router.post('/:dni/fotoPerfil',verifyToken,propia,limite('foto',30,3600000,req=>req.auth.id),F.recibir,C.wrap(async(req,res)=>{
  if(Object.keys(req.files || {}).some(k=>k!=='fotoPerfil'))C.R.fail(400,'Usá la sección Documentación para estos archivos.');
  const files=await F.guardar(req.auth.id,req.files,req.auth.id);
  const url=new URL(files.fotoPerfil,process.env.API_PUBLIC_URL+'/').href;
  res.json({url});
}));
router.delete('/:dni/fotoPerfil',verifyToken,propia,C.wrap(async(req,res)=>{
  let old;
  await Usuario.sequelize.transaction(async t=>{
    const u=await Usuario.findByPk(req.auth.id,{transaction:t,lock:t.LOCK.UPDATE});old=u.fotoPerfil;
    await u.update({fotoPerfil:null,revision:u.revision+1},{transaction:t});
  });await F.borrar(old,'fotoPerfil');res.json({message:'Foto eliminada.'});
}));
// Obteniene un usuario por DNI (retorna null si no existe)

router.get('/dni/:dni', limite('dni',30), async (req, res) => {
  try {
    const dniLimpio = normalizarDni(req.params.dni);
    const dniConPuntos = formatearDniConPuntos(dniLimpio);

    const usuario = await Usuario.findOne({
      where: {
        [Op.or]: [{ dni: dniLimpio }, { dni: dniConPuntos }],
      },
    });

    return res.json(usuario ? { existe: true } : null);
  } catch (e) {
    console.error('Error /usuarios/dni/:dni', e);
    res.status(500).json({ error: 'Error consultando usuario por DNI' });
  }
});

router.get('/:dni/eventos', verifyToken, propia, async (req, res) => {
  const { dni } = req.params;

  try {
    const usuario = await db.Usuario.findOne({
      where: { dni },
      include: [
        {
          model: db.Evento,
          through: {
            attributes: [],
            where: { estadoInscripcion: { [db.Sequelize.Op.ne]: 'baja' } },
          },
        },
      ],
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

router.post(
  '/:id/qr',
  verifyToken,
  requireRole('administrador', 'juez', 'deportista'),
  async (req, res) => {
    const { id } = req.params;
    if (+id !== req.user.id && req.user.rol !== 'administrador')
      return res.status(403).json({ error: 'No autorizado' });

    const u = await Usuario.findByPk(id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    u.qrJti = uuidv4();
    await u.save();

    const token = jwt.sign(
      { sub: u.id, jti: u.qrJti, typ: 'qr' },
      process.env.QR_SECRET,
      { algorithm: 'HS256' },
    );
    res.json({ token });
  },
);

router.get(
  '/:id/qr.png',
  verifyToken,
  requireRole('administrador', 'juez', 'deportista'),
  async (req, res) => {
    const { id } = req.params;
    const transparent = req.query.transparent === '1';
    if (+id !== req.user.id && req.user.rol !== 'administrador')
      return res.status(403).json({ error: 'No autorizado' });

    const u = await Usuario.findByPk(id);
    if (!u || !u.qrJti)
      return res.status(404).json({ error: 'Sin credencial' });
    const token = jwt.sign(
      { sub: u.id, jti: u.qrJti, typ: 'qr' },
      process.env.QR_SECRET,
      { algorithm: 'HS256' },
    );

    res.set('Content-Type', 'image/png');
    res.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const opts = {
      width: 512,
      margin: 1,
      ...(transparent ? { color: { dark: '#000000', light: '#0000' } } : {}),
    };
    QRCode.toFileStream(res, token, opts);
  },
);

router.post('/:id/solicitar-rol', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body;
  if(!['tecnico','juez','deportista','tesoreria'].includes(rol))return res.status(400).json({error:'Rol inválido.'});
  if (+id !== req.user.id)
    return res.status(403).json({ error: 'No autorizado' });
  const u = await Usuario.findByPk(id);
  if(!u)return res.status(404).json({error:'Usuario no encontrado.'});
  u.rolSolicitado = rol;
  await u.save();
  res.json({ ok: true });
});

// Evita que clientes antiguos omitan motivo, revisión y notificación.
router.patch('/:id/aprobar',verifyToken,requireRole('administrador'),(req,res)=>res.status(409).json({error:'Actualizá la aplicación y revisá la solicitud desde Usuarios.'}));
module.exports=router;
