const express = require('express');
const router = express.Router();
const Patinador = require('../models/patinador.model');
const Evento = require('../models/evento.model');
const upload = require('../middleware/upload.middleware');
const path = require('path');
const fs = require('fs');

// ======================
// CRUD Básico Patinador
// ======================

// Obtener todos los patinadores
router.get('/', async (req, res) => {
  try {
    const patinadores = await Patinador.findAll();
    res.json(patinadores);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los patinadores' });
  }
});

// Obtener un patinador por ID
router.get('/:id', async (req, res) => {
  try {
    const patinador = await Patinador.findByPk(req.params.id);
    if (!patinador) {
      return res.status(404).json({ error: 'Patinador no encontrado' });
    }
    res.json(patinador);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el patinador' });
  }
});

// Crear nuevo patinador
router.post('/', async (req, res) => {
  try {
    const nuevo = await Patinador.create(req.body);
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el patinador' });
  }
});

// Actualizar patinador
router.put('/:id', async (req, res) => {
  try {
    const patinador = await Patinador.findByPk(req.params.id);
    if (!patinador) {
      return res.status(404).json({ error: 'Patinador no encontrado' });
    }

    await patinador.update(req.body);
    res.json({ message: 'Patinador actualizado', patinador });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el patinador' });
  }
});

// Eliminar patinador
router.delete('/:id', async (req, res) => {
  try {
    const patinador = await Patinador.findByPk(req.params.id);
    if (!patinador) {
      return res.status(404).json({ error: 'Patinador no encontrado' });
    }

    await patinador.destroy();
    res.json({ message: 'Patinador eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el patinador' });
  }
});


// ==============================
// Gestión de foto de perfil
// ==============================

// Subir foto
router.post('/:id/fotoPerfil', upload.single('fotoPerfil'), async (req, res) => {
  try {
    const patinador = await Patinador.findByPk(req.params.id);
    if (!patinador) {
      return res.status(404).json({ error: 'Patinador no encontrado' });
    }

    // Eliminar la anterior si existe
    if (patinador.fotoPerfil) {
      const previousPath = path.join(__dirname, '..', patinador.fotoPerfil);
      if (fs.existsSync(previousPath)) {
        fs.unlinkSync(previousPath);
      }
    }

    // Guardar nueva ruta
    patinador.fotoPerfil = path.join('uploads', req.file.filename);
    await patinador.save();

    res.json({ message: 'Foto de perfil actualizada', path: patinador.fotoPerfil });
  } catch (error) {
    console.error('Error al subir la foto:', error);
    res.status(500).json({ error: 'Error al subir la foto' });
  }
});

// Obtener foto de perfil
router.get('/:id/fotoPerfil', async (req, res) => {
  try {
    const patinador = await Patinador.findByPk(req.params.id);
    if (!patinador || !patinador.fotoPerfil) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    res.sendFile(path.resolve(patinador.fotoPerfil));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la foto' });
  }
});

// Eliminar foto de perfil
router.delete('/:id/fotoPerfil', async (req, res) => {
  try {
    const patinador = await Patinador.findByPk(req.params.id);
    if (!patinador || !patinador.fotoPerfil) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    const filePath = path.resolve(patinador.fotoPerfil);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    patinador.fotoPerfil = null;
    await patinador.save();

    res.json({ message: 'Foto eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la foto' });
  }
});

// Obtener eventos en los que está inscripto un patinador
router.get('/:dni/eventos', async (req, res) => {
  try {
    console.log('DNI del patinador:', req.params.dni);
    const patinador = await Patinador.findAll({where:{dni:req.params.dni}}, {
      include: {
        model: Evento,
        through: { attributes: [] }
      }
    }); 

    if (!patinador) {
      return res.status(404).json({ error: 'Patinador no encontrado' });
    }
    console.log(patinador,'patinador');
    console.log(patinador.Eventos,'Eventos');
    res.json(patinador.Eventos);
    
  } catch (error) {
    console.error('Error al obtener eventos del patinador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
