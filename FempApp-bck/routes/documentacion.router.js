const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Usuario = require('../models/usuario.model');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documentos/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

router.put('/:id', upload.fields([
  { name: 'dniFrente', maxCount: 1 },
  { name: 'dniDorso', maxCount: 1 },
  { name: 'fichaMedica', maxCount: 1 }
]), async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { files } = req;

    if (files.dniFrente) usuario.dniFrente = files.dniFrente[0].path;
    if (files.dniDorso) usuario.dniDorso = files.dniDorso[0].path;
    if (files.fichaMedica) usuario.fichaMedica = files.fichaMedica[0].path;
    usuario.documentacionAprobada = false;

    await usuario.save();

    res.json({ mensaje: 'Documentación subida correctamente', usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir la documentación' });
  }
});

module.exports = router;
