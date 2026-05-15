const express = require('express');
const router = express.Router();
const Rol = require('../models/rol.model');

// Obtener todos los roles
router.get('/', async (req, res) => {
  try {
    const roles = await Rol.findAll();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los roles' });
  }
});

// Crear un nuevo rol (opcional, si no querés que sea solo manual en DB)
router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;
    const nuevoRol = await Rol.create({ nombre });
    res.status(201).json(nuevoRol);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el rol' });
  }
});

module.exports = router;
