const express = require('express');
const router = express.Router();
const db = require('../models');

// GET /clubes
router.get('/', async (req, res) => {
  try {
    const clubes = await db.Club.findAll({
      where: { activo: true },
      order: [['nombre', 'ASC']],
      include: [
        {
          model: db.ClubSede,
          as: 'sedes',
          where: { activo: true },
          required: false,
          order: [['nombre', 'ASC']]
        }
      ]
    });

    return res.json(clubes);
  } catch (error) {
    console.error('[GET /clubes error]', error);
    return res.status(500).json({
      error: 'No se pudieron obtener los clubes',
      detail: error.message
    });
  }
});

// GET /clubes/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const club = await db.Club.findByPk(id, {
      include: [
        {
          model: db.ClubSede,
          as: 'sedes',
          where: { activo: true },
          required: false
        }
      ]
    });

    if (!club) {
      return res.status(404).json({
        error: 'Club no encontrado'
      });
    }

    return res.json(club);
  } catch (error) {
    console.error('[GET /clubes/:id error]', error);
    return res.status(500).json({
      error: 'No se pudo obtener el club',
      detail: error.message
    });
  }
});

// POST /clubes
router.post('/', async (req, res) => {
  try {
    const { nombre, nombreNormalizado } = req.body;

    if (!nombre) {
      return res.status(400).json({
        error: 'El nombre del club es obligatorio'
      });
    }

    const normalizado = nombreNormalizado || normalizarTexto(nombre);

    const club = await db.Club.create({
      nombre,
      nombreNormalizado: normalizado,
      activo: true
    });

    return res.status(201).json({
      mensaje: 'Club creado correctamente',
      club
    });
  } catch (error) {
    console.error('[POST /clubes error]', error);
    return res.status(500).json({
      error: 'No se pudo crear el club',
      detail: error.message
    });
  }
});

// PATCH /clubes/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;

    const club = await db.Club.findByPk(id);

    if (!club) {
      return res.status(404).json({
        error: 'Club no encontrado'
      });
    }

    await club.update({
      ...(nombre !== undefined && {
        nombre,
        nombreNormalizado: normalizarTexto(nombre)
      }),
      ...(activo !== undefined && { activo })
    });

    return res.json({
      mensaje: 'Club actualizado correctamente',
      club
    });
  } catch (error) {
    console.error('[PATCH /clubes/:id error]', error);
    return res.status(500).json({
      error: 'No se pudo actualizar el club',
      detail: error.message
    });
  }
});

// GET /clubes/:clubId/sedes
router.get('/:clubId/sedes', async (req, res) => {
  try {
    const { clubId } = req.params;

    const sedes = await db.ClubSede.findAll({
      where: {
        clubId,
        activo: true
      },
      order: [['nombre', 'ASC']]
    });

    return res.json(sedes);
  } catch (error) {
    console.error('[GET /clubes/:clubId/sedes error]', error);
    return res.status(500).json({
      error: 'No se pudieron obtener las sedes del club',
      detail: error.message
    });
  }
});

// POST /clubes/:clubId/sedes
router.post('/:clubId/sedes', async (req, res) => {
  try {
    const { clubId } = req.params;
    const { nombre, nombreNormalizado } = req.body;

    if (!nombre) {
      return res.status(400).json({
        error: 'El nombre de la sede/referente es obligatorio'
      });
    }

    const club = await db.Club.findByPk(clubId);

    if (!club) {
      return res.status(404).json({
        error: 'Club no encontrado'
      });
    }

    const sede = await db.ClubSede.create({
      clubId,
      nombre,
      nombreNormalizado: nombreNormalizado || normalizarTexto(nombre),
      activo: true
    });

    return res.status(201).json({
      mensaje: 'Sede/referente creado correctamente',
      sede
    });
  } catch (error) {
    console.error('[POST /clubes/:clubId/sedes error]', error);
    return res.status(500).json({
      error: 'No se pudo crear la sede/referente',
      detail: error.message
    });
  }
});

// PATCH /clubes/sedes/:sedeId
router.patch('/sedes/:sedeId', async (req, res) => {
  try {
    const { sedeId } = req.params;
    const { nombre, activo } = req.body;

    const sede = await db.ClubSede.findByPk(sedeId);

    if (!sede) {
      return res.status(404).json({
        error: 'Sede/referente no encontrado'
      });
    }

    await sede.update({
      ...(nombre !== undefined && {
        nombre,
        nombreNormalizado: normalizarTexto(nombre)
      }),
      ...(activo !== undefined && { activo })
    });

    return res.json({
      mensaje: 'Sede/referente actualizada correctamente',
      sede
    });
  } catch (error) {
    console.error('[PATCH /clubes/sedes/:sedeId error]', error);
    return res.status(500).json({
      error: 'No se pudo actualizar la sede/referente',
      detail: error.message
    });
  }
});

function normalizarTexto(texto = '') {
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = router;