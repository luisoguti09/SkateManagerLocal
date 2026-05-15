const express = require('express');
const router = express.Router();
const Evento = require('../models/evento.model');
const Elemento = require('../models/elemento.model');
const {authMiddleware} = require('../middleware/auth.middleware');

// Obtener todos los patinadores (authMiddleware)
router.get('/', async (req, res) => {
  try {
    const elementos = await Elemento.findAll();
    res.json(elementos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los elementos' });
  }
});

// Crear un nuevo elemento
router.post('/', async (req, res) => {
  try {
    const { nombre, categoria, valor } = req.body;
    const nuevoElemento = await Elemento.create({ nombre, categoria, valor });
    res.status(201).json(nuevoElemento);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el elemento' });
  }
});

// eventos
// Inscribir un elemento en un evento
router.post('/:elementoId/eventos/:eventoId', async (req, res) => {
    try {
      const { elementoId, eventoId } = req.params;
      const elemento = await Elemento.findByPk(elementoId);
      const evento = await Evento.findByPk(eventoId);
  
      if (!elemento || !evento) {
        return res.status(404).json({ error: 'Elemento o evento no encontrado' });
      }
  
      await elemento.addEvento(evento);
      res.status(200).json({ message: 'Elemento inscripto en el evento con éxito' });
    } catch (error) {
      res.status(500).json({ error: 'Error al inscribir al elemento en el evento' });
    }
  });

// Obtener todos los elementos segun los eventos
router.get('/:elementoId/eventos', async (req, res) => {
    try {
      const { elementoId } = req.params;
      const elemento = await Elemento.findByPk(elementoId, {
        include: Evento
      });
  
      if (!elemento) {
        return res.status(404).json({ error: 'Elemento no encontrado' });
      }
  
      res.json(elemento.Eventos);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener los elementos en el Evento' });
    }
  });
  

module.exports = router;