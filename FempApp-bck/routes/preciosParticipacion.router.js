const express = require('express');
const router = express.Router();
const db = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// GET /precios-participacion/evento/:eventoId
router.get('/evento/:eventoId', verifyToken, requireRole('administrador', 'tesoreria'), async (req, res) => {
  try {
    const { eventoId } = req.params;

    const precios = await db.PrecioParticipacionEvento.findAll({
      where: { eventoId },
      order: [['cantidadParticipaciones', 'ASC']]
    });

    return res.json(precios);
  } catch (error) {
    console.error('[PreciosParticipacion GET error]', error);
    return res.status(500).json({
      error: 'No se pudieron obtener los precios de participación',
      detail: error.message
    });
  }
});

// POST /precios-participacion
router.post('/', verifyToken, requireRole('administrador', 'tesoreria'), async (req, res) => {
  try {
    const {
      eventoId,
      cantidadParticipaciones,
      monto,
      activo = true
    } = req.body;

    if (!eventoId || !cantidadParticipaciones || !monto) {
      return res.status(400).json({
        error: 'Faltan datos obligatorios: eventoId, cantidadParticipaciones y monto'
      });
    }

    const evento = await db.Evento.findByPk(eventoId);

    if (!evento) {
      return res.status(404).json({
        error: 'Evento no encontrado'
      });
    }

    const [precio, creado] = await db.PrecioParticipacionEvento.findOrCreate({
      where: {
        eventoId,
        cantidadParticipaciones
      },
      defaults: {
        monto,
        activo
      }
    });

    if (!creado) {
      await precio.update({
        monto,
        activo
      });
    }

    return res.status(creado ? 201 : 200).json({
      mensaje: creado
        ? 'Precio de participación creado correctamente'
        : 'Precio de participación actualizado correctamente',
      precio
    });
  } catch (error) {
    console.error('[PreciosParticipacion POST error]', error);
    return res.status(500).json({
      error: 'No se pudo guardar el precio de participación',
      detail: error.message
    });
  }
});

// PATCH /precios-participacion/:id
router.patch('/:id', verifyToken, requireRole('administrador', 'tesoreria'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cantidadParticipaciones,
      monto,
      activo
    } = req.body;

    const precio = await db.PrecioParticipacionEvento.findByPk(id);

    if (!precio) {
      return res.status(404).json({
        error: 'Precio de participación no encontrado'
      });
    }

    await precio.update({
      ...(cantidadParticipaciones !== undefined && { cantidadParticipaciones }),
      ...(monto !== undefined && { monto }),
      ...(activo !== undefined && { activo })
    });

    return res.json({
      mensaje: 'Precio de participación actualizado correctamente',
      precio
    });
  } catch (error) {
    console.error('[PreciosParticipacion PATCH error]', error);
    return res.status(500).json({
      error: 'No se pudo actualizar el precio de participación',
      detail: error.message
    });
  }
});

// DELETE lógico /precios-participacion/:id
router.delete('/:id', verifyToken, requireRole('administrador', 'tesoreria'), async (req, res) => {
  try {
    const { id } = req.params;

    const precio = await db.PrecioParticipacionEvento.findByPk(id);

    if (!precio) {
      return res.status(404).json({
        error: 'Precio de participación no encontrado'
      });
    }

    await precio.update({ activo: false });

    return res.json({
      mensaje: 'Precio de participación desactivado correctamente',
      precio
    });
  } catch (error) {
    console.error('[PreciosParticipacion DELETE error]', error);
    return res.status(500).json({
      error: 'No se pudo desactivar el precio de participación',
      detail: error.message
    });
  }
});

module.exports = router;