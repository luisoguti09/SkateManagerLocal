const express = require('express');
const router = express.Router();
const Evento = require('../models/evento.model');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const {limite}=require('../middleware/cuenta-limites');
const Padron = require('../models/padron.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

function normalizarDni(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatearDniConPuntos(value) {
  const limpio = normalizarDni(value);

  if (!limpio) return '';

  return limpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Obtener todos los patinadores registrados (authMiddleware)
router.get('/', verifyToken, requireRole('administrador','tecnico','juez'), async (req, res) => {
  try {
    const padron = await require('../services/alcance-evaluaciones').deportistas(req.cuenta);
    res.json(padron);
  } catch (error) {
    res.status(500).json({ error: 'No se encuentra el DNI en la base de datos!' });
  }
});
// Obtener todos los patinadores registrados (authMiddleware)
router.get('/:dni', limite('padron',30), async (req, res) => {
  try {
    const dniLimpio = normalizarDni(req.params.dni);
    const dniConPuntos = formatearDniConPuntos(dniLimpio);

    const padron = await Padron.findOne({
      where: {
        [Op.or]: [
          { documentoN: dniLimpio },
          { documentoN: dniConPuntos }
        ]
      }
    });

    res.json(padron ? { apellidoYNombre:padron.apellidoYNombre, club:padron.club, categoria:padron.categoria } : null);
  } catch (error) {
    console.error('Error buscando DNI en padrón:', error);
    res.status(500).json({ error: 'No se encuentra el DNI en la base de datos!' });
  }
});

// Crear un nuevo registro de deportista
router.post('/', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const {
      licNacionalNumero, documentoN, apellidoYNombre, fechadeNacimiento, sexo,
      nacionalidad, club, categoria, funcion, domicilio, cP, localidad,
      provincia, telefono, tipoLicencia, federeada
    } = req.body;
    const nuevoDeportista = await Padron.create({
      licNacionalNumero, documentoN, apellidoYNombre, fechadeNacimiento, sexo,
      nacionalidad, club, categoria, funcion, domicilio, cP, localidad,
      provincia, telefono, tipoLicencia, federeada
    });
    res.status(201).json(nuevoDeportista);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el deportista' });
  }
});

/**
 * Massive insert for padron model
 */
// Crear un nuevo registro de deportista
router.post('/massive-insert', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    /*const { 
        licNacionalNumero, documentoN, apellidoYNombre, fechadeNacimiento, sexo, 
        nacionalidad, club, categoria, funcion, domicilio, cP, localidad,
        provincia, telefono, tipoLicencia, federeada
    } = req.body;*/

    const fullPadron = req.body;
    if(!Array.isArray(fullPadron) || fullPadron.length>1000)return res.status(400).json({error:'Enviá hasta 1000 filas.'});
    await Padron.sequelize.transaction(async transaction=>{
    for(const p of fullPadron) {
      const {
        licNacionalNumero, documentoN, apellidoYNombre, fechadeNacimiento, sexo,
        nacionalidad, club, categoria, funcion, domicilio, cP, localidad,
        provincia, telefono, tipoLicencia, federeada
      } = p;
      const nuevoDeportista = await Padron.create({
        licNacionalNumero, documentoN, apellidoYNombre, fechadeNacimiento, sexo,
        nacionalidad, club, categoria, funcion, domicilio, cP, localidad,
        provincia, telefono, tipoLicencia, federeada
      },{transaction});
    }
    });

    const finalize = { "success": true };
    res.status(201).json(finalize);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el deportista' });
  }
});

// Storage de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `patinador_${req.params.id}${ext}`);
  }
});

const upload = multer({ storage });

// Subir foto de perfil
router.post('/:id/upload', verifyToken, requireRole('administrador'), upload.single('fotoPerfil'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.status(200).json({ url: fileUrl });
});

// Obtener foto de perfil
router.get('/:id/profile-picture', verifyToken, requireRole('administrador'), (req, res) => {
  const filename = `patinador_${req.params.id}`;
  const dir = path.join(__dirname, '../uploads');
  const files = fs.readdirSync(dir);
  const matchedFile = files.find(f => f.startsWith(filename));

  if (matchedFile) {
    res.sendFile(path.join(dir, matchedFile));
  } else {
    res.status(404).json({ error: 'Foto de perfil no encontrada' });
  }
});

// Eliminar foto de perfil
router.delete('/:id/profile-picture', verifyToken, requireRole('administrador'), (req, res) => {
  const filename = `patinador_${req.params.id}`;
  const dir = path.join(__dirname, '../uploads');
  const files = fs.readdirSync(dir);
  const matchedFile = files.find(f => f.startsWith(filename));

  if (matchedFile) {
    fs.unlinkSync(path.join(dir, matchedFile));
    res.status(200).json({ message: 'Foto eliminada exitosamente' });
  } else {
    res.status(404).json({ error: 'Foto de perfil no encontrada' });
  }
});



module.exports = router;
