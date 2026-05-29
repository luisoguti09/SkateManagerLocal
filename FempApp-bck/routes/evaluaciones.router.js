const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');

const {
    Evaluacion,
    EvaluacionElemento,
    EvaluacionComponente,
    Elemento,
    Componente
} = db;

function calcularEstadoTecnico(nota) {
    const n = Number(nota);

    if (!Number.isFinite(n)) return null;

    if (n < 30) return 'NO_ADQUIRIDO';
    if (n < 60) return 'EN_DESARROLLO';
    if (n < 75) return 'CONSOLIDANDOSE';
    if (n < 90) return 'LOGRADO';

    return 'DOMINADO';
}

router.post('/', async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const {
            deportistaId,
            eventoId = null,
            tipoEvaluacion = 'LIBRE',
            origen = 'TECNICA',
            fechaEvaluacion = null,
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
            eventoId,
            tipoEvaluacion,
            origen,
            fechaEvaluacion: fechaEvaluacion || new Date(),
            observacion
        }, { transaction: t });

        const elementosFiltrados = elementos
            .filter(e => e.elementoId)
            .map(e => ({
                evaluacionId: evaluacion.id,
                elementoId: e.elementoId,
                nota: e.nota ?? null,
                estadoTecnico: calcularEstadoTecnico(e.nota),
                observacion: e.observacion ?? null
            }));

        const componentesFiltrados = componentes
            .filter(c => c.componenteId)
            .map(c => ({
                evaluacionId: evaluacion.id,
                componenteId: c.componenteId,
                nota: c.nota ?? null,
                estadoTecnico: calcularEstadoTecnico(c.nota),
                observacion: c.observacion ?? null
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

router.get('/evolucion/elemento', async (req, res) => {
    try {
        const { deportistaId, elementoId } = req.query;

        if (!deportistaId || !elementoId) {
            return res.status(400).json({
                error: 'deportistaId y elementoId son obligatorios'
            });
        }

        const registros = await EvaluacionElemento.findAll({
            where: {
                elementoId
            },
            include: [
                {
                    model: Evaluacion,
                    as: 'evaluacion',
                    where: {
                        deportistaId
                    },
                    attributes: [
                        'id',
                        'deportistaId',
                        'tipoEvaluacion',
                        'origen',
                        'fechaEvaluacion',
                        'createdAt'
                    ]
                },
                {
                    model: Elemento,
                    as: 'elemento',
                    attributes: [
                        'id',
                        'nombre',
                        'codigo',
                        'valorBase',
                        'disciplina',
                        'categoria'
                    ]
                }
            ],
            order: [[{ model: Evaluacion, as: 'evaluacion' }, 'createdAt', 'ASC']]
        });

        const data = registros.map((r) => {
            const nota = r.nota !== null ? Number(r.nota) : null;
            const valorBase = r.elemento?.valorBase !== null && r.elemento?.valorBase !== undefined
                ? Number(r.elemento.valorBase)
                : null;

            const valorEstimado =
                nota !== null && Number.isFinite(nota) && valorBase !== null && Number.isFinite(valorBase)
                    ? Number((valorBase * (nota / 100)).toFixed(2))
                    : null;

            return {
                evaluacionId: r.evaluacion?.id,
                fecha: r.evaluacion?.fechaEvaluacion || r.evaluacion?.createdAt,
                tipoEvaluacion: r.evaluacion?.tipoEvaluacion,
                origen: r.evaluacion?.origen,
                nota,
                estadoTecnico: r.estadoTecnico,
                observacion: r.observacion,
                elementoId: r.elemento?.id,
                elemento: r.elemento?.nombre,
                codigo: r.elemento?.codigo,
                valorBase,
                valorEstimado
            };
        });

        res.json(data);
    } catch (error) {
        console.error('Error obteniendo evolución por elemento:', error);
        res.status(500).json({
            error: 'Error obteniendo evolución por elemento'
        });
    }
});

router.get('/evolucion/componente', async (req, res) => {
    try {
        const { deportistaId, componenteId } = req.query;

        if (!deportistaId || !componenteId) {
            return res.status(400).json({
                error: 'deportistaId y componenteId son obligatorios'
            });
        }

        const registros = await EvaluacionComponente.findAll({
            where: {
                componenteId
            },
            include: [
                {
                    model: Evaluacion,
                    as: 'evaluacion',
                    where: {
                        deportistaId
                    },
                    attributes: [
                        'id',
                        'deportistaId',
                        'tipoEvaluacion',
                        'origen',
                        'fechaEvaluacion',
                        'createdAt'
                    ]
                },
                {
                    model: Componente,
                    as: 'componente',
                    attributes: [
                        'id',
                        'nombre',
                        'puntajeMinimo',
                        'puntajeMaximo',
                        'disciplina',
                        'categoria'
                    ]
                }
            ],
            order: [[{ model: Evaluacion, as: 'evaluacion' }, 'createdAt', 'ASC']]
        });

        const data = registros.map((r) => {
            const nota = r.nota !== null ? Number(r.nota) : null;

            return {
                evaluacionId: r.evaluacion?.id,
                fecha: r.evaluacion?.fechaEvaluacion || r.evaluacion?.createdAt,
                tipoEvaluacion: r.evaluacion?.tipoEvaluacion,
                origen: r.evaluacion?.origen,
                nota,
                estadoTecnico: r.estadoTecnico,
                observacion: r.observacion,
                componenteId: r.componente?.id,
                componente: r.componente?.nombre,
                puntajeMinimo: r.componente?.puntajeMinimo,
                puntajeMaximo: r.componente?.puntajeMaximo
            };
        });

        res.json(data);
    } catch (error) {
        console.error('Error obteniendo evolución por componente:', error);
        res.status(500).json({
            error: 'Error obteniendo evolución por componente'
        });
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

router.get('/', async (req, res) => {
    try {
        const {
            tipoEvaluacion,
            fechaDesde,
            fechaHasta
        } = req.query;

        const where = {};

        if (tipoEvaluacion) {
            where.tipoEvaluacion = tipoEvaluacion;
        }

        if (fechaDesde || fechaHasta) {
            where.createdAt = {};

            if (fechaDesde) {
                where.createdAt[Op.gte] = new Date(fechaDesde);
            }

            if (fechaHasta) {
                const hasta = new Date(fechaHasta);
                hasta.setHours(23, 59, 59, 999);
                where.createdAt[Op.lte] = hasta;
            }
        }

        const evaluaciones = await Evaluacion.findAll({
            where,
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
        console.error('Error listando evaluaciones:', error);
        res.status(500).json({ error: 'Error listando evaluaciones' });
    }
});

module.exports = router;