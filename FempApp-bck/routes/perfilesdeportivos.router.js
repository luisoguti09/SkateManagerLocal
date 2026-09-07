const express = require('express');
const router = express.Router();
const db = require('../models');

const { PerfilDeportivo, Usuario, Club, ClubSede } = db;

function buildPerfilInclude() {
    return [
        {
            model: Club,
            as: 'clubEntidad',
            attributes: ['id', 'nombre', 'nombreNormalizado', 'activo']
        },
        {
            model: ClubSede,
            as: 'clubSede',
            attributes: ['id', 'clubId', 'nombre', 'nombreNormalizado', 'activo']
        }
    ];
}

async function validarClubYSede({ clubId, clubSedeId }) {
    if (!clubId) {
        return {
            ok: true,
            club: null,
            sede: null
        };
    }

    const club = await Club.findByPk(clubId);

    if (!club || !club.activo) {
        return {
            ok: false,
            status: 404,
            error: 'Club no encontrado o inactivo'
        };
    }

    if (!clubSedeId) {
        return {
            ok: true,
            club,
            sede: null
        };
    }

    const sede = await ClubSede.findByPk(clubSedeId);

    if (!sede || !sede.activo) {
        return {
            ok: false,
            status: 404,
            error: 'Sede / referente no encontrado o inactivo'
        };
    }

    if (Number(sede.clubId) !== Number(clubId)) {
        return {
            ok: false,
            status: 400,
            error: 'La sede / referente no pertenece al club seleccionado'
        };
    }

    return {
        ok: true,
        club,
        sede
    };
}

// GET /perfiles-deportivos/usuario/:usuarioId
router.get('/usuario/:usuarioId', async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const perfiles = await PerfilDeportivo.findAll({
            where: { usuarioId },
            include: buildPerfilInclude(),
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
            origenCategoria,
            clubId,
            clubSedeId,
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

        const validacionClub = await validarClubYSede({ clubId, clubSedeId });
        if (!validacionClub.ok) {
            return res.status(validacionClub.status).json({ error: validacionClub.error });
        }

        const nuevoPerfil = await PerfilDeportivo.create({
            usuarioId,
            disciplina,
            licencia: licencia ?? null,
            modalidad: modalidad ?? null,
            divisional: divisional ?? null,
            categoria: categoria ?? null,
            temporada: temporada ?? null,
            origenCategoria: origenCategoria ?? null,

            club: validacionClub.club?.nombre || req.body.club || null,

            clubId: clubId ?? null,
            clubSedeId: clubSedeId ?? null,

            activa: typeof activa === 'boolean' ? activa : true
        });

        const perfilCreado = await PerfilDeportivo.findByPk(nuevoPerfil.id, {
            include: buildPerfilInclude()
        });

        return res.status(201).json(perfilCreado);
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
            origenCategoria,
            licencia,
            modalidad,
            divisional,
            categoria,
            temporada,
            clubId,
            clubSedeId,
            activa
        } = req.body;

        const perfil = await PerfilDeportivo.findByPk(id);
        if (!perfil) {
            return res.status(404).json({ error: 'Perfil deportivo no encontrado' });
        }

        const nextClubId = clubId ?? perfil.clubId;
        const nextClubSedeId = clubSedeId ?? perfil.clubSedeId;

        const validacionClub = await validarClubYSede({
            clubId: nextClubId,
            clubSedeId: nextClubSedeId
        });

        if (!validacionClub.ok) {
            return res.status(validacionClub.status).json({ error: validacionClub.error });
        }

        await perfil.update({
            disciplina: disciplina ?? perfil.disciplina,
            origenCategoria: origenCategoria ?? perfil.origenCategoria,
            licencia: licencia ?? perfil.licencia,
            modalidad: modalidad ?? perfil.modalidad,
            divisional: divisional ?? perfil.divisional,
            categoria: categoria ?? perfil.categoria,
            temporada: temporada ?? perfil.temporada,

            club: validacionClub.club?.nombre || req.body.club || perfil.club || null,

            clubId: nextClubId ?? null,
            clubSedeId: nextClubSedeId ?? null,

            activa: typeof activa === 'boolean' ? activa : perfil.activa
        });

        const perfilActualizado = await PerfilDeportivo.findByPk(id, {
            include: buildPerfilInclude()
        });

        return res.status(200).json(perfilActualizado);
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