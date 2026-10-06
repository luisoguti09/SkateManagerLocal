const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  wrap,
  sesion,
  roles,
  evento,
  audit,
  confirmar,
  datoCargo,
  R,
  db,
  Op,
} = require('../services/circuito');
const auth = [verifyToken, sesion];
router.get(
  '/:id/circuito',
  ...auth,
  roles('administrador', 'deportista'),
  wrap(async (req, res) => {
    const ev = await evento(req.params.id);
    const result = {
      evento: ev,
      etapa: R.etapa(ev),
      inscripciones: [],
      perfiles: [],
      cargo: null,
    };
    if (req.auth.rol === 'deportista') {
      result.inscripciones = await db.UsuarioEventos.findAll({
        where: {
          EventoId: ev.id,
          UsuarioId: req.auth.id,
          estadoInscripcion: { [Op.ne]: 'baja' },
        },
      });
      result.perfiles = await db.PerfilDeportivo.findAll({
        where: { usuarioId: req.auth.id, activa: true },
      });
      const cargo = await db.CargoInscripcion.findOne({
        where: { eventoId: ev.id, usuarioId: req.auth.id },
      });
      result.cargo = cargo ? datoCargo(cargo, ev) : null;
    }
    res.json(result);
  }),
);
async function guardar(req, res, append = false) {
  const seleccion = append
    ? R.ids(req.body.perfilDeportivoIds || [req.body.perfilDeportivoId])
    : Array.isArray(req.body.perfilDeportivoIds) &&
        req.body.perfilDeportivoIds.length === 0
      ? []
      : R.ids(req.body.perfilDeportivoIds);
  if (req.body.usuarioId != null && Number(req.body.usuarioId) !== req.auth.id)
    R.fail(403, 'Solo podés gestionar tu inscripción.');
  await db.sequelize.transaction(async (t) => {
    const ev = await evento(req.params.id, t),
      stage = R.etapa(ev);
    if (
      !['inscripcion', 'abm'].includes(stage) ||
      ev.inscripcionesConfirmadasAt
    )
      R.fail(409, 'La inscripción o el período ABM no están abiertos.');
    const existentes = await db.UsuarioEventos.findAll({
      where: { EventoId: ev.id, UsuarioId: req.auth.id },
      transaction: t,
    });
    const vigentes = existentes.filter((x) => x.estadoInscripcion !== 'baja');
    const desired = append
      ? [
          ...new Set([
            ...vigentes.map((x) => x.perfilDeportivoId),
            ...seleccion,
          ]),
        ]
      : seleccion;
    if (vigentes.some((x) => !x.perfilDeportivoId))
      R.fail(
        409,
        'La inscripción antigua debe ser revisada por administración.',
      );
    if (
      stage !== 'abm' &&
      vigentes.some((x) => !desired.includes(x.perfilDeportivoId))
    )
      R.fail(409, 'Las bajas y modificaciones se realizan durante ABM.');
    const perfiles = [];
    for (const pId of desired) {
      const p = await db.PerfilDeportivo.findByPk(R.id(pId), {
        transaction: t,
      });
      if (!p || Number(p.usuarioId) !== req.auth.id || !p.activa)
        R.fail(403, 'Perfil no disponible para esta inscripción.');
      perfiles.push(p);
    }
    for (const row of vigentes)
      if (!desired.includes(row.perfilDeportivoId))
        await row.update({ estadoInscripcion: 'baja' }, { transaction: t });
    for (const p of perfiles) {
      const row = existentes.find((x) => x.perfilDeportivoId === p.id);
      const data = {
        EventoId: ev.id,
        UsuarioId: req.auth.id,
        perfilDeportivoId: p.id,
        estadoInscripcion: 'provisoria',
        categoria: p.categoria,
        disciplina: p.disciplina,
        division: p.divisional,
        grupo: null,
        rol: 'deportista',
      };
      if (!row) await db.UsuarioEventos.create(data, { transaction: t });
      else if (row.estadoInscripcion === 'baja' || stage === 'abm')
        await row.update(data, { transaction: t });
    }
    await audit(
      ev.id,
      req.auth.id,
      req.auth.id,
      'seleccion',
      { antes: vigentes.map((x) => x.perfilDeportivoId), despues: desired },
      t,
    );
  });
  res.json({
    mensaje:
      'Inscripción guardada. El pago se habilita después de ABM y confirmación.',
  });
}
router.put(
  '/:id/mi-inscripcion',
  ...auth,
  roles('deportista'),
  wrap((req, res) => guardar(req, res)),
);
router.post(
  '/:id/inscribir',
  ...auth,
  roles('deportista'),
  wrap((req, res) => guardar(req, res, true)),
);
router.post(
  '/:id/confirmar-inscripciones',
  ...auth,
  roles('administrador'),
  wrap(async (req, res) =>
    res.json(await confirmar(req.params.id, req.auth.id)),
  ),
);
router.put(
  '/:id/calendario',
  ...auth,
  roles('administrador'),
  wrap(async (req, res) => {
    const data = R.calendario(req.body);
    await db.sequelize.transaction(async (t) => {
      const ev = await evento(req.params.id, t);
      if (ev.inscripcionesConfirmadasAt)
        R.fail(
          409,
          'La nómina está confirmada. No se puede cambiar el calendario ni la condición de costo.',
        );
      if (await db.Pago.count({ where: { eventoId: ev.id }, transaction: t }))
        R.fail(
          409,
          'Hay pagos anteriores. Revisalos antes de migrar el evento.',
        );
      await ev.update(data, { transaction: t });
    });
    res.json({ ok: true });
  }),
);
router.get(
  '/:id/inscripciones.csv',
  ...auth,
  roles('administrador'),
  wrap(async (req, res) => {
    const csv = await db.sequelize.transaction(async (t) => {
      const ev = await evento(req.params.id, t);
      const final = !!ev.inscripcionesConfirmadasAt;
      let rows = [];
      if (final) {
        const cargos = await db.CargoInscripcion.findAll({
          where: { eventoId: ev.id },
          transaction: t,
        });
        rows = cargos.flatMap((c) => c.participacionesSnapshot);
      } else {
        const ins = await db.UsuarioEventos.findAll({
          where: { EventoId: ev.id, estadoInscripcion: { [Op.ne]: 'baja' } },
          transaction: t,
          order: [['id', 'ASC']],
        });
        for (const i of ins) {
          const u = await db.Usuario.findByPk(i.UsuarioId, {
            attributes: ['nombre', 'dni', 'club'],
            transaction: t,
          });
          rows.push({
            inscripcionId: i.id,
            perfilDeportivoId: i.perfilDeportivoId,
            nombre: u?.nombre,
            dni: u?.dni,
            club: u?.club,
            disciplina: i.disciplina,
            categoria: i.categoria,
            division: i.division,
            grupo: i.grupo,
          });
        }
      }
      const keys = [
        'inscripcionId',
        'perfilDeportivoId',
        'nombre',
        'dni',
        'club',
        'sede',
        'disciplina',
        'categoria',
        'division',
        'grupo',
      ];
      const esc = (v) =>
        '"' +
        String(v ?? '')
          .replace(/^[\s]*[=+@-]/, "'$&")
          .replace(/"/g, '""') +
        '"';
      const content =
        '\uFEFF' +
        keys.join(',') +
        '\r\n' +
        rows.map((r) => keys.map((k) => esc(r[k])).join(',')).join('\r\n');
      await audit(
        ev.id,
        req.auth.id,
        req.auth.id,
        final ? 'cuadernillo_final' : 'cuadernillo_provisorio',
        { filas: rows },
        t,
      );
      return {
        content,
        name: `cuadernillo_${final ? 'final' : 'provisorio'}_evento_${ev.id}.csv`,
      };
    });
    res.type('text/csv').attachment(csv.name).send(csv.content);
  }),
);
// Datos de la constancia: inscripción propia y pago conciliado; no exige asistencia.
router.get('/:id/certificado-datos', ...auth, roles('deportista'), wrap(async (req, res) => {
  const ev = await evento(req.params.id);
  const inscripciones = await db.UsuarioEventos.findAll({
    where: { EventoId: ev.id, UsuarioId: req.auth.id },
  });
  const vigentes = inscripciones.filter(i => i.estadoInscripcion !== 'baja');
  if (!vigentes.length) R.fail(403, 'Debés estar inscripto en este evento.');
  if (ev.inscripcionRequierePago == null)
    R.fail(409, 'Administración debe revisar la condición de inscripción de este evento.');
  const cargo = await db.CargoInscripcion.findOne({
    where: { eventoId: ev.id, usuarioId: req.auth.id },
  });
  if (ev.inscripcionRequierePago && cargo?.estado !== 'pagado')
    R.fail(403, 'El certificado estará disponible cuando el pago esté aprobado y conciliado.');
  const u = await db.Usuario.findByPk(req.auth.id);
  const clubes = [];
  const snapshots = cargo?.participacionesSnapshot || [];
  for (const i of vigentes) {
    const snapshot = snapshots.find(p => Number(p.perfilDeportivoId) === Number(i.perfilDeportivoId));
    if (snapshot?.club) { clubes.push(snapshot.club); continue; }
    const perfil = i.perfilDeportivoId ? await db.PerfilDeportivo.findByPk(i.perfilDeportivoId) : null;
    const club = perfil?.clubId ? await db.Club.findByPk(perfil.clubId) : null;
    clubes.push(club?.nombre || perfil?.club || u.club || '');
  }
  res.json({
    usuario: { nombre: u.nombre, dni: u.dni, club: [...new Set(clubes.filter(Boolean))].join(' / '), categoria: '' },
    evento: { titulo: ev.titulo || ev.nombre, fechaInicio: ev.fechaInicio || ev.fecha,
      fechaFin: ev.fechaFin, lugar: ev.lugar },
    emitidoAt: new Date().toISOString(),
  });
}));

module.exports = router;
