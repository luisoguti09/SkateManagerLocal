const express = require('express');
const router = express.Router();
const db = require('../models');

const {
    Evaluacion,
    EvaluacionElemento,
    EvaluacionComponente,
    Elemento,
    Componente
} = db;

router.post('/', async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const {
            deportistaId,
            observacion,
            elementos = [],
            componentes = []
        } = req.body;

        if (!deportistaId) {
            await t.rollback();
            return res.status(400).json({ error: 'deportistaId es obligatorio' });
        }

        const evaluacion = await Evaluacion.create({
            deportistaId,
            observacion
        }, { transaction: t });

        const elementosFiltrados = elementos
            .filter(e => e.elementoId)
            .map(e => ({
                evaluacionId: evaluacion.id,
                elementoId: e.elementoId,
                nota: e.nota ?? null
            }));

        const componentesFiltrados = componentes
            .filter(c => c.componenteId)
            .map(c => ({
                evaluacionId: evaluacion.id,
                componenteId: c.componenteId,
                nota: c.nota ?? null
            }));

        if (elementosFiltrados.length) {
            await EvaluacionElemento.bulkCreate(elementosFiltrados, { transaction: t });
        }

        if (componentesFiltrados.length) {
            await EvaluacionComponente.bulkCreate(componentesFiltrados, { transaction: t });
        }

        await t.commit();

        const evaluacionCompleta = await Evaluacion.findByPk(evaluacion.id, {
            include: [
                {
                    model: EvaluacionElemento,
                    as: 'elementos',
                    include: [{ model: Elemento, as: 'elemento' }]
                },
                {
                    model: EvaluacionComponente,
                    as: 'componentes',
                    include: [{ model: Componente, as: 'componente' }]
                }
            ]
        });

        res.status(201).json(evaluacionCompleta);

    } catch (error) {
        await t.rollback();
        console.error('Error creando evaluación:', error);
        res.status(500).json({ error: 'Error creando evaluación' });
    }
});

router.get('/deportista/:deportistaId', async (req, res) => {
    try {
        const evaluaciones = await Evaluacion.findAll({
            where: {
                deportistaId: req.params.deportistaId
            },
            include: [
                {
                    model: EvaluacionElemento,
                    as: 'elementos',
                    include: [{ model: Elemento, as: 'elemento' }]
                },
                {
                    model: EvaluacionComponente,
                    as: 'componentes',
                    include: [{ model: Componente, as: 'componente' }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(evaluaciones);

    } catch (error) {
        console.error('Error obteniendo evaluaciones:', error);
        res.status(500).json({ error: 'Error obteniendo evaluaciones' });
    }
});

module.exports = router;