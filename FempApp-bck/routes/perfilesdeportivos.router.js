const express = require('express');
const router = express.Router();
const db = require('../models');

const { PerfilDeportivo, Usuario } = db;

// GET /perfiles-deportivos/usuario/:usuarioId
router.get('/usuario/:usuarioId', async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const perfiles = await PerfilDeportivo.findAll({
            where: { usuarioId },
            order: [['createdAt', 'ASC']]
        });

        return res.status(200).json(perfiles);
    } catch (error) {
        console.error('Error al listar perfiles deportivos:', error);
        return res.status(500).json({ error: 'Error al listar perfiles deportivos' });
    }
});

// POST /perfiles-deportivos
router.post('/', async (req, res) => {
    try {
        const {
            usuarioId,
            disciplina,
            licencia,
            modalidad,
            divisional,
            categoria,
            temporada,
            club,
            activa
        } = req.body;

        if (!usuarioId || !disciplina) {
            return res.status(400).json({
                error: 'usuarioId y disciplina son obligatorios'
            });
        }

        const usuario = await Usuario.findByPk(usuarioId);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const nuevoPerfil = await PerfilDeportivo.create({
            usuarioId,
            disciplina,
            licencia: licencia ?? null,
            modalidad: modalidad ?? null,
            divisional: divisional ?? null,
            categoria: categoria ?? null,
            temporada: temporada ?? null,
            club: club ?? null,
            activa: activa ?? true
        });

        return res.status(201).json(nuevoPerfil);
    } catch (error) {
        console.error('Error al crear perfil deportivo:', error);
        return res.status(500).json({ error: 'Error al crear perfil deportivo' });
    }
});

// PUT /perfiles-deportivos/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            disciplina,
            licencia,
            modalidad,
            divisional,
            categoria,
            temporada,
            club,
            activa
        } = req.body;

        const perfil = await PerfilDeportivo.findByPk(id);
        if (!perfil) {
            return res.status(404).json({ error: 'Perfil deportivo no encontrado' });
        }

        await perfil.update({
            disciplina: disciplina ?? perfil.disciplina,
            licencia: licencia ?? perfil.licencia,
            modalidad: modalidad ?? perfil.modalidad,
            divisional: divisional ?? perfil.divisional,
            categoria: categoria ?? perfil.categoria,
            temporada: temporada ?? perfil.temporada,
            club: club ?? perfil.club,
            activa: typeof activa === 'boolean' ? activa : perfil.activa
        });

        return res.status(200).json(perfil);
    } catch (error) {
        console.error('Error al actualizar perfil deportivo:', error);
        return res.status(500).json({ error: 'Error al actualizar perfil deportivo' });
    }
});

// DELETE /perfiles-deportivos/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const perfil = await PerfilDeportivo.findByPk(id);
        if (!perfil) {
            return res.status(404).json({ error: 'Perfil deportivo no encontrado' });
        }

        await perfil.destroy();

        return res.status(200).json({ message: 'Perfil deportivo eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar perfil deportivo:', error);
        return res.status(500).json({ error: 'Error al eliminar perfil deportivo' });
    }
});

module.exports = router;