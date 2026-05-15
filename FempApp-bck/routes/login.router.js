const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Padron = require('../models/padron.model');


// Login de usuario
router.post('/', async (req, res) => {

 const { email, password } = req.body;
  
    try {
      // Buscar usuario por email
      let usuario = await Usuario.findOne({ where: { email } });
      if (!usuario) {
        return res.status(400).json({ error: 'Credenciales inválidas' });
      }
      const padron = await Padron.findOne({where: { documentoN: usuario.dni }});
  
      // Comparar contraseñas
      const isMatch = await bcrypt.compare(password, usuario.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Credenciales inválidas' });
      }
  
      // Crear y devolver token JWT
      
      const payload = { id: usuario.id, rol: usuario.rol };
      const token = jwt.sign(payload, 'secret_key', { expiresIn: '1h' });
  
      res.status(200).json({ token , usuario: usuario, padron: padron });
    } catch (error) {
      res.status(500).json({ error: 'Error al autenticar el usuario' });
    }
  });

  module.exports = router;