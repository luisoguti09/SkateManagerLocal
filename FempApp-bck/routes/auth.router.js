const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const Usuario = require('../models/usuario.model');
const Rol = require('../models/rol.model');
const Padron = require('../models/padron.model');
const { Op } = require('sequelize');
const ROL_CANON = {
  admin: 'administrador',
  administrador: 'administrador',
  auditor: 'tecnico',
  tecnico: 'tecnico',
  juez: 'tecnico',
  deportista: 'deportista',
  tesoreria: 'tesoreria',
  tesorero: 'tesoreria'
};

const { JWT_SECRET } = require('../config/auth');
const C = require('../services/cuenta');
const {limite} = require('../middleware/cuenta-limites');
const {verifySession} = require('../middleware/auth.middleware');
const Reset = require('../models/cuentareset.model');
const crypto = require('node:crypto');
const authLimit=limite('auth',120);
router.use((req,res,next)=>req.method==='POST'?authLimit(req,res,next):next());
router.post('/login',limite('login-email',20,900000,req=>String(req.body.email || '').trim().toLowerCase()));
router.get('/me',verifySession,C.wrap(async(req,res)=>res.json({usuario:C.R.safe(req.cuenta)})));


/**
 * POST /auth/register
 * Crea usuario con rol (usa hook beforeCreate para hashear password)
 */
router.post('/register', async (req, res) => {
  try {
    const { password, dni, edad, rolId, categoria, nivel, club } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const dniNormalizado = String(dni || '').replace(/\D/g, '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        !C.R.passwordValida(password) ||
        !/^\d{6,9}$/.test(dniNormalizado) || !Number.isInteger(Number(rolId)) || Number(rolId) < 1 ||
        !nombre || nombre.length > 255 || edad === null || edad === undefined || edad === '' ||
        !Number.isInteger(Number(edad)) || Number(edad) < 0 || Number(edad) > 120) {
      return res.status(400).json({ error: 'Revisá nombre, edad, DNI, rol, email y contraseña. La contraseña debe tener al menos 8 caracteres, una letra y un número, y hasta 72 bytes.' });
    }

    // email o dni ya usados
    const dniConPuntos = dniNormalizado.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const yaExiste = await Usuario.findOne({
      where: {
        [Op.or]: [
          { email },
          { dni: dniNormalizado },
          { dni: dniConPuntos }
        ]
      }
    });

    if (yaExiste) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese DNI o email. Ingresá con tu cuenta.' });
    }

    // rol válido
    const rol = await Rol.findByPk(rolId);

    if (!rol) return res.status(400).json({ error: 'Rol no válido' });

    const nombreRol = String(rol.nombre || '').trim().toLowerCase();
    const rolCanon = ROL_CANON[nombreRol];

    if (!rolCanon) {
      return res.status(400).json({
        error: 'Rol no reconocido',
        detalle: rol.nombre
      });
    }
    const isTec = rolCanon === 'tecnico';
    const isDep = rolCanon === 'deportista';
    // Toda alta pública requiere aprobación, incluso administradores.

    const nuevo = await Usuario.sequelize.transaction(async t => {
    const u = await Usuario.create({
      nombre,
      edad: Number(edad),
      email,
      password,
      dni: dniNormalizado,
      rol: rolCanon,
      rolId: rol.id,
      categoria: isDep ? (categoria ?? '') : '',
      nivel: isTec ? (nivel ?? '') : '',
      qrJti: uuidv4(),
      estado: 'pendiente',
      aprobado: false,
      club: typeof club === 'string' ? club.trim().slice(0, 255) : null,
      solicitaLicenciaProvincial: isDep || isTec,
      rolSolicitado: rolCanon
    },{transaction:t});
    await C.historial(u,u.id,'registro',null,t);
    // El aviso de solicitud se genera al pulsar Enviar, no al crear la cuenta.
    return u;
    });

    return res.status(201).json({
      code: 'ACCOUNT_PENDING_APPROVAL',
      message: 'Tu cuenta fue creada. Ingresá para completar los datos, cargar documentos y enviar tu solicitud a la Federación.',
      rolId: nuevo.rolId,
      usuario: {
        id: nuevo.id,
        nombre: nuevo.nombre,
        email: nuevo.email,
        dni: nuevo.dni,
        rol: nuevo.rol,
        club: nuevo.club ?? null,
        categoria: nuevo.categoria ?? null,
        estado: nuevo.estado ?? null,
        aprobado: nuevo.aprobado ?? null,
        rolSolicitado: nuevo.rolSolicitado ?? null,
        qrJti: nuevo.qrJti ?? null
      }
    });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese DNI o email.' });
    }
    console.error('[REGISTER]', error?.name);
    return res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

/**
 * POST /auth/login
 * Autentica y devuelve token + usuario normalizado
 */
router.post('/login', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const { password } = req.body;
  if (!email || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Ingresá email y contraseña.' });
  }

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) { await bcrypt.compare(password, '$2a$10$7EqJtq98hPqEX7fNZaFWoO5FwB3Kn0E4Ohwxeasb6h1dTjKDjR/CW'); return res.status(400).json({ error: 'Credenciales inválidas' }); }

    const ok = await bcrypt.compare(String(password ?? ''), String(usuario.password ?? ''));
    if (!ok) return res.status(400).json({ error: 'Credenciales inválidas' });

    if (usuario.estado === 'bloqueado') {
      return res.status(403).json({ code: 'ACCOUNT_BLOCKED', error: 'Tu cuenta está bloqueada. Contactá a la Federación.' });
    }
    if (!['pendiente','requiere_correcciones','aprobado'].includes(usuario.estado)) {
      return res.status(403).json({
        code: 'ACCOUNT_PENDING_APPROVAL',
        error: 'Tu cuenta todavía no fue aprobada.',
        message: 'Cuando un administrador la habilite, vas a poder ingresar.',
        estado: usuario.estado,
        rol: usuario.rol
      });
    }

    if (!Object.values(ROL_CANON).includes(usuario.rol)) {
      return res.status(403).json({ error: 'Rol no habilitado. Contactá a la Federación.' });
    }

    // opcional: datos del padrón para enriquecer


    const payload = { sv: usuario.sessionVersion, id: usuario.id, dni: usuario.dni, email: usuario.email, rolId: usuario.rolId, rol: usuario.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    return res.status(200).json({
      token,
      rolId: usuario.rolId,
      usuario: C.R.safe(usuario)
    });
  } catch (error) {
    console.error('[LOGIN]', error?.name);
    return res.status(500).json({ error: 'Error al autenticar el usuario' });
  }
});


router.post('/forgot-password',limite('reset-ip',5,3600000),C.wrap(async(req,res)=>{
  const email=typeof req.body.email==='string'?req.body.email.trim().toLowerCase():'';
  const generic={message:'Si el correo corresponde a una cuenta, recibirás un enlace para recuperar el acceso.'};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.json(generic);
  await Usuario.sequelize.transaction(async t=>{
    const u=await Usuario.findOne({where:{email},transaction:t,lock:t.LOCK.UPDATE});
    if(!u)return;
    const latest=await Reset.findOne({where:{usuarioId:u.id,createdAt:{[Op.gt]:new Date(Date.now()-60000)}},transaction:t});
    if(latest)return;
    const token=crypto.randomBytes(32).toString('hex'),expires=Date.now()+30*60000;
    await Reset.update({usadoAt:new Date()},{where:{usuarioId:u.id,usadoAt:null},transaction:t});
    await Reset.create({usuarioId:u.id,tokenHash:C.R.hashToken(token),venceAt:new Date(expires)},{transaction:t});
    await C.encolar(u,'reset',t,{token,expires});
  });res.json(generic);
}));
router.post('/reset-password',limite('reset-confirm',10),C.wrap(async(req,res)=>{
  const {token,password}=req.body;
  if(typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token))C.R.fail(400,'Enlace inválido o vencido.');
  if(!C.R.passwordValida(password))C.R.fail(400,'Usá al menos 8 caracteres, una letra y un número, y hasta 72 bytes.');
  const hashed=await bcrypt.hash(password,12);
  // Lock order is Usuario then Reset, matching the request route.
  const candidate=await Reset.findOne({where:{tokenHash:C.R.hashToken(token)}});
  if(!candidate)C.R.fail(400,'Enlace inválido o vencido.');
  await Usuario.sequelize.transaction(async t=>{
    const u=await Usuario.findByPk(candidate.usuarioId,{transaction:t,lock:t.LOCK.UPDATE});
    const reset=await Reset.findByPk(candidate.id,{transaction:t,lock:t.LOCK.UPDATE});
    if(!u || reset.usadoAt || new Date(reset.venceAt)<=new Date())C.R.fail(400,'Enlace inválido o vencido.');
    await u.update({password:hashed,sessionVersion:u.sessionVersion+1},{transaction:t});
    await Reset.update({usadoAt:new Date()},{where:{usuarioId:u.id,usadoAt:null},transaction:t});
    await C.historial(u,u.id,'password_actualizada',null,t);
  });res.json({message:'Contraseña actualizada. Iniciá sesión nuevamente.'});
}));
module.exports = router;
