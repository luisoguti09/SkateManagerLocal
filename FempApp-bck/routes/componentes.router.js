const express = require('express');
const router = express.Router();
const Evento = require('../models/evento.model');
const Componente = require('../models/componente.model');
const {authMiddleware} = require('../middleware/auth.middleware');

// Obtener todos los patinadores (authMiddleware)
router.get('/', async (req, res) => {
  try {
    const componentes = await Componente.findAll();
    res.json(componentes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los componentes' });
  }
});

// Crear un nuevo componente
router.post('/', async (req, res) => {
  try {
    const { nombre, categoria, valor } = req.body;
    const nuevoComponente = await Componente.create({ nombre, categoria, valor });
    res.status(201).json(nuevoComponente);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el componente' });
  }
});

// eventos
// Inscribir un componente en un evento
router.post('/:componenteId/eventos/:eventoId', async (req, res) => {
    try {
      const { componenteId, eventoId } = req.params;
      const componente = await Componente.findByPk(componenteId);
      const evento = await Evento.findByPk(eventoId);
  
      if (!componente || !evento) {
        return res.status(404).json({ error: 'Componente o evento no encontrado' });
      }
  
      await componente.addEvento(evento);
      res.status(200).json({ message: 'Componente inscripto en el evento con éxito' });
    } catch (error) {
      res.status(500).json({ error: 'Error al inscribir al elemento en el evento' });
    }
  });

// Obtener todos los elementos segun los eventos
router.get('/:componenteId/eventos', async (req, res) => {
    try {
      const { componenteId } = req.params;
      const componente = await Componente.findByPk(componenteId, {
        include: Evento
      });
  
      if (!componente) {
        return res.status(404).json({ error: 'Componente no encontrado' });
      }
  
      res.json(componente.Eventos);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener los Componentes en el Evento' });
    }
  });
  

module.exports = router;