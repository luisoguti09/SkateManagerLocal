const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const Usuario = require('../models/usuario.model');
const Rol = require('../models/rol.model');
const Padron = require('../models/padron.model');
const { Op } = require('sequelize');
const ROL_CANON = { admin: 'administrador', auditor: 'tecnico', deportista: 'deportista' };

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';

/**
 * POST /auth/register
 * Crea usuario con rol (usa hook beforeCreate para hashear password)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, dni, nombre, edad, rolId, categoria, nivel } = req.body;

    if (!email || !password || !dni || !rolId) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // email o dni ya usados
    const yaExiste = await Usuario.findOne({ where: { [Op.or]: [{ email }, { dni }] } });
    if (yaExiste) return res.status(400).json({ error: 'Ya existe un usuario con ese correo o DNI' });

    // rol válido
    const rol = await Rol.findByPk(rolId);
   
    if (!rol) return res.status(400).json({ error: 'Rol no válido' });
    const rolCanon = ROL_CANON[rol.nombre] || rol.nombre;
    const isTec = rolCanon === 'tecnico';
    const isDep = rolCanon === 'deportista';

    const nuevo = await Usuario.create({
      nombre,
      edad,
      email,
      password,          // hook beforeCreate hashea
      dni,
      rol: rolCanon,     // ENUM compatible
      rolId: rol.id,
      categoria: isDep ? (categoria ?? '') : '', // ← nunca null
      nivel:     isTec ? (nivel ?? '')     : '', // ← nunca null
      qrJti: uuidv4(),
      estado: 'pendiente'
    });

    const payload = { id: nuevo.id, dni: nuevo.dni, email: nuevo.email, rolId: nuevo.rolId, rol: nuevo.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    return res.status(201).json({
      token,
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
        rolSolicitado: nuevo.rolSolicitado ?? null,
        qrJti: nuevo.qrJti ?? null
      }
    });
  } catch (error) {
    console.error('[REGISTER] ERROR:', error?.name, error?.message, error?.errors?.[0]?.message);
    return res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

/**
 * POST /auth/login
 * Autentica y devuelve token + usuario normalizado
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(400).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(String(password ?? ''), String(usuario.password ?? ''));
    if (!ok) return res.status(400).json({ error: 'Credenciales inválidas' });

    // opcional: datos del padrón para enriquecer
    const padron = await Padron.findOne({ where: { documentoN: usuario.dni } });

    const payload = { id: usuario.id, dni: usuario.dni, email: usuario.email, rolId: usuario.rolId, rol: usuario.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    return res.status(200).json({
      token,
      rolId: usuario.rolId,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        dni: usuario.dni,
        rol: usuario.rol,
        club: padron ? padron.club : (usuario.club ?? null),
        categoria: padron ? padron.categoria : (usuario.categoria ?? null),
        estado: usuario.estado ?? null,
        aprobado: usuario.aprobado ?? (usuario.estado === 'aprobado'),
        rolSolicitado: usuario.rolSolicitado ?? null,
        qrJti: usuario.qrJti ?? null,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Error al autenticar el usuario' });
  }
});

module.exports = router;
