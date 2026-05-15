const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const db = require('../models');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /padron-import/importar-clubes?dryRun=true
router.post('/importar-clubes', upload.single('archivo'), async (req, res) => {
    try {
        const dryRun = String(req.query.dryRun || 'false') === 'true';

        if (!req.file) {
            return res.status(400).json({
                error: 'Debe adjuntar un archivo CSV en el campo "archivo"'
            });
        }

        const csvText = req.file.buffer
            .toString('utf8')
            .replace(/^\uFEFF/, '');

        const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
        });

        if (parsed.errors?.length) {
            return res.status(400).json({
                error: 'El CSV tiene errores de lectura',
                detalles: parsed.errors
            });
        }

        const rows = parsed.data || [];

        if (!rows.length) {
            return res.status(400).json({
                error: 'El CSV no contiene registros'
            });
        }

        const columnas = Object.keys(rows[0]);

        if (!columnas.includes('Club')) {
            return res.status(400).json({
                error: 'No se encontró la columna "Club" en el CSV',
                columnasDetectadas: columnas
            });
        }

        const mapaClubes = new Map();

        for (const row of rows) {
            const clubOriginal = limpiarTexto(row.Club);

            if (!clubOriginal) continue;

            const { clubNombre, sedeNombre } = separarClubYSede(clubOriginal);

            const clubNormalizado = normalizarTexto(clubNombre);

            if (!mapaClubes.has(clubNormalizado)) {
                mapaClubes.set(clubNormalizado, {
                    nombre: clubNombre,
                    nombreNormalizado: clubNormalizado,
                    totalRegistros: 0,
                    originales: new Set(),
                    sedes: new Map()
                });
            }

            const itemClub = mapaClubes.get(clubNormalizado);
            itemClub.totalRegistros += 1;
            itemClub.originales.add(clubOriginal);

            if (sedeNombre) {
                const sedeNormalizada = normalizarTexto(sedeNombre);

                if (!itemClub.sedes.has(sedeNormalizada)) {
                    itemClub.sedes.set(sedeNormalizada, {
                        nombre: sedeNombre,
                        nombreNormalizado: sedeNormalizada,
                        totalRegistros: 0
                    });
                }

                itemClub.sedes.get(sedeNormalizada).totalRegistros += 1;
            }
        }

        const clubesDetectados = Array.from(mapaClubes.values()).map((club) => ({
            nombre: club.nombre,
            nombreNormalizado: club.nombreNormalizado,
            totalRegistros: club.totalRegistros,
            originales: Array.from(club.originales),
            sedes: Array.from(club.sedes.values())
        }));

        if (dryRun) {
            return res.json({
                modo: 'dryRun',
                totalFilasCsv: rows.length,
                totalClubesDetectados: clubesDetectados.length,
                clubesDetectados
            });
        }

        const resumen = {
            totalFilasCsv: rows.length,
            totalClubesDetectados: clubesDetectados.length,
            clubesCreados: 0,
            clubesExistentes: 0,
            sedesCreadas: 0,
            sedesExistentes: 0,
            clubes: []
        };

        for (const clubDetectado of clubesDetectados) {
            const [club, clubCreado] = await db.Club.findOrCreate({
                where: {
                    nombreNormalizado: clubDetectado.nombreNormalizado
                },
                defaults: {
                    nombre: clubDetectado.nombre,
                    nombreNormalizado: clubDetectado.nombreNormalizado,
                    activo: true
                }
            });

            if (clubCreado) resumen.clubesCreados += 1;
            else resumen.clubesExistentes += 1;

            const sedesResultado = [];

            for (const sedeDetectada of clubDetectado.sedes) {
                const [sede, sedeCreada] = await db.ClubSede.findOrCreate({
                    where: {
                        clubId: club.id,
                        nombreNormalizado: sedeDetectada.nombreNormalizado
                    },
                    defaults: {
                        clubId: club.id,
                        nombre: sedeDetectada.nombre,
                        nombreNormalizado: sedeDetectada.nombreNormalizado,
                        activo: true
                    }
                });

                if (sedeCreada) resumen.sedesCreadas += 1;
                else resumen.sedesExistentes += 1;

                sedesResultado.push({
                    id: sede.id,
                    nombre: sede.nombre,
                    nombreNormalizado: sede.nombreNormalizado,
                    creado: sedeCreada
                });
            }

            resumen.clubes.push({
                id: club.id,
                nombre: club.nombre,
                nombreNormalizado: club.nombreNormalizado,
                creado: clubCreado,
                totalRegistros: clubDetectado.totalRegistros,
                originales: clubDetectado.originales,
                sedes: sedesResultado
            });
        }

        return res.json({
            mensaje: 'Importación de clubes finalizada correctamente',
            resumen
        });
    } catch (error) {
        console.error('[POST /padron-import/importar-clubes error]', error);

        return res.status(500).json({
            error: 'No se pudo importar clubes desde el padrón',
            detail: error.message
        });
    }
});

function limpiarTexto(value = '') {
    return String(value)
        .trim()
        .replace(/\s+/g, ' ');
}

function separarClubYSede(clubOriginal = '') {
    const limpio = limpiarTexto(clubOriginal);

    const match = limpio.match(/^(.+?)\s*\((.+?)\)\s*$/);

    if (!match) {
        return {
            clubNombre: limpio,
            sedeNombre: null
        };
    }

    return {
        clubNombre: limpiarTexto(match[1]),
        sedeNombre: limpiarTexto(match[2])
    };
}

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

function normalizarDocumento(value = '') {
    return String(value)
        .replace(/\D/g, '')
        .trim();
}

function parseEntero(value) {
    const limpio = String(value || '').replace(/\D/g, '');

    if (!limpio) return null;

    const numero = Number(limpio);

    return Number.isNaN(numero) ? null : numero;
}

function parseFecha(value) {
    const texto = limpiarTexto(value);

    if (!texto) return null;

    // Formato esperado común: DD/MM/YYYY
    const partes = texto.split('/');

    if (partes.length === 3) {
        const [dia, mes, anio] = partes;

        const fecha = new Date(
            Number(anio),
            Number(mes) - 1,
            Number(dia)
        );

        if (!Number.isNaN(fecha.getTime())) {
            return fecha;
        }
    }

    const fechaDirecta = new Date(texto);

    if (!Number.isNaN(fechaDirecta.getTime())) {
        return fechaDirecta;
    }

    return null;
}

function contarPorCampo(items, campo) {
    return items.reduce((acc, item) => {
        const valor = item[campo] || 'Sin dato';
        acc[valor] = (acc[valor] || 0) + 1;
        return acc;
    }, {});
}

// POST /padron-import/importar-padron?dryRun=true
// POST /padron-import/importar-padron?replace=true
router.post('/importar-padron', upload.single('archivo'), async (req, res) => {
    try {
        const dryRun = String(req.query.dryRun || 'false') === 'true';
        const replace = String(req.query.replace || 'false') === 'true';
        const temporada = req.query.temporada || '2026';

        if (!req.file) {
            return res.status(400).json({
                error: 'Debe adjuntar un archivo CSV en el campo "archivo"'
            });
        }

        const csvText = req.file.buffer
            .toString('utf8')
            .replace(/^\uFEFF/, '');

        const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
        });

        if (parsed.errors?.length) {
            return res.status(400).json({
                error: 'El CSV tiene errores de lectura',
                detalles: parsed.errors
            });
        }

        const rows = parsed.data || [];

        if (!rows.length) {
            return res.status(400).json({
                error: 'El CSV no contiene registros'
            });
        }

        const columnas = Object.keys(rows[0]);

        const columnasRequeridas = [
            'Documento Nº',
            'Apellido y Nombre',
            'Club'
        ];

        const faltantes = columnasRequeridas.filter(col => !columnas.includes(col));

        if (faltantes.length) {
            return res.status(400).json({
                error: 'Faltan columnas requeridas en el CSV',
                faltantes,
                columnasDetectadas: columnas
            });
        }

        const registrosProcesados = [];
        const errores = [];
        const clubesNoEncontrados = [];

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];

            const documentoOriginal = limpiarTexto(row['Documento Nº']);
            const documentoNormalizado = normalizarDocumento(documentoOriginal);
            const apellidoYNombre = limpiarTexto(row['Apellido y Nombre']);
            const clubOriginal = limpiarTexto(row['Club']);
            const categoriaOriginal = limpiarTexto(row['Categoria']);

            if (!documentoNormalizado) {
                errores.push({
                    fila: index + 2,
                    error: 'Documento vacío o inválido',
                    row
                });
                continue;
            }

            if (!apellidoYNombre) {
                errores.push({
                    fila: index + 2,
                    error: 'Apellido y Nombre vacío',
                    documentoOriginal,
                    row
                });
                continue;
            }

            const { clubNombre, sedeNombre } = separarClubYSede(clubOriginal);
            const clubNormalizado = normalizarTexto(clubNombre);
            const sedeNormalizada = sedeNombre ? normalizarTexto(sedeNombre) : null;

            let club = null;
            let sede = null;

            if (clubNormalizado) {
                club = await db.Club.findOne({
                    where: {
                        nombreNormalizado: clubNormalizado
                    }
                });
            }

            if (!club && clubOriginal) {
                clubesNoEncontrados.push({
                    fila: index + 2,
                    clubOriginal,
                    clubDetectado: clubNombre,
                    clubNormalizado
                });
            }

            if (club && sedeNormalizada) {
                sede = await db.ClubSede.findOne({
                    where: {
                        clubId: club.id,
                        nombreNormalizado: sedeNormalizada
                    }
                });
            }

            registrosProcesados.push({
                licNacionalNumero: limpiarTexto(row['CUIT N°']),
                documentoN: documentoOriginal,
                documentoNormalizado,
                apellidoYNombre,
                fechadeNacimiento: parseFecha(row['Fecha de Nacimiento']),
                sexo: limpiarTexto(row['Sexo']),
                nacionalidad: limpiarTexto(row['Nacionalidad']),
                club: clubNombre || clubOriginal,
                clubOriginal,
                clubId: club?.id || null,
                clubSedeId: sede?.id || null,
                categoria: categoriaOriginal,
                categoriaOriginal,
                funcion: limpiarTexto(row['Funcion']),
                domicilio: limpiarTexto(row['Domicilio']),
                cP: parseEntero(row['CP']),
                localidad: limpiarTexto(row['Localidad']),
                provincia: limpiarTexto(row['Provincia']),
                telefono: limpiarTexto(row['Telefono']),
                tipoLicencia: limpiarTexto(row['Tipo Licencia']),
                federeada: limpiarTexto(row['Federada']) || limpiarTexto(row['Federeada']),
                temporada,
                activo: true
            });
        }

        const resumen = {
            modo: dryRun ? 'dryRun' : 'importacion',
            temporada,
            totalFilasCsv: rows.length,
            totalProcesados: registrosProcesados.length,
            totalErrores: errores.length,
            clubesNoEncontrados: clubesNoEncontrados.length,
            totalConClubNormalizado: registrosProcesados.filter(r => r.clubId).length,
            totalSinClubNormalizado: registrosProcesados.filter(r => !r.clubId).length,
            totalConSedeNormalizada: registrosProcesados.filter(r => r.clubSedeId).length,
            funciones: contarPorCampo(registrosProcesados, 'funcion'),
            clubesDetectados: contarPorCampo(registrosProcesados, 'clubOriginal'),
            errores,
            clubesNoEncontradosDetalle: clubesNoEncontrados
        };

        if (dryRun) {
            return res.json(resumen);
        }

        if (replace) {
            await db.Padron.destroy({
                where: { temporada }
            });
        }

        await db.Padron.bulkCreate(registrosProcesados);

        return res.json({
            mensaje: 'Importación de padrón finalizada correctamente',
            resumen: {
                ...resumen,
                registrosInsertados: registrosProcesados.length,
                replace
            }
        });
    } catch (error) {
        console.error('[POST /padron-import/importar-padron error]', error);

        return res.status(500).json({
            error: 'No se pudo importar el padrón',
            detail: error.message
        });
    }
});

module.exports = router;