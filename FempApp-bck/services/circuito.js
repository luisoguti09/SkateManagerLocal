const db = require('../models');
const R = require('./circuito-reglas');
const T = require('./tarifario-reglas');
const Tarifarios = require('./tarifario');
const { Op } = require('sequelize');
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    if (!e.status) console.error('[Circuito]', e.message);
    res
      .status(e.status || 500)
      .json({
        error: e.status ? e.message : 'No se pudo completar la operación.',
      });
  }
};
const sesion = wrap(async (req, res, next) => {
  const u = await db.Usuario.findByPk(R.id(req.auth?.id), {
    attributes: ['id', 'rol', 'aprobado', 'estado'],
  });
  if (!u || !u.aprobado || u.estado === 'bloqueado')
    R.fail(403, 'La cuenta debe estar aprobada y activa.');
  req.auth.rol = u.rol;
  req.auth.id = u.id;
  next();
});
function roles(...allowed) {
  return (req, res, next) =>
    allowed.includes(req.auth?.rol)
      ? next()
      : res
          .status(403)
          .json({ error: 'No tenés permiso para esta operación.' });
}
async function evento(id, t) {
  const ev = await db.Evento.findByPk(R.id(id), {
    transaction: t,
    ...(t && { lock: t.LOCK.UPDATE }),
  });
  if (!ev) R.fail(404, 'Evento no encontrado.');
  return ev;
}
async function audit(ev, user, actor, accion, detalle, t) {
  await db.CambioInscripcion.create(
    { eventoId: ev, usuarioId: user, actorId: actor, accion, detalle },
    { transaction: t },
  );
}
async function confirmar(eventoId, actor) {
  return db.sequelize.transaction(async (t) => {
    const ev = await evento(eventoId, t);
    if (ev.inscripcionesConfirmadasAt) return { confirmado: true };
    if (R.etapa(ev) !== 'por_confirmar')
      R.fail(409, 'La confirmación se realiza después del cierre de ABM.');
    // No aplicar reglas nuevas sobre preferencias/cobros previos sin conciliación explícita.
    if (await db.Pago.count({ where: { eventoId: ev.id }, transaction: t }))
      R.fail(
        409,
        'Este evento tiene operaciones anteriores. Requiere revisar sus pagos antes de migrarlo al nuevo circuito.',
      );
    const rows = await db.UsuarioEventos.findAll({
      where: { EventoId: ev.id, estadoInscripcion: 'provisoria' },
      transaction: t,
      order: [['id', 'ASC']],
    });
    const users = new Map();
    for (const row of rows) {
      if (!row.perfilDeportivoId)
        R.fail(409, 'Hay inscripciones antiguas sin perfil. Revisá la nómina.');
      const p = await db.PerfilDeportivo.findByPk(row.perfilDeportivoId, {
        transaction: t,
      });
      if (!p || !p.activa || Number(p.usuarioId) !== Number(row.UsuarioId))
        R.fail(
          409,
          'Hay perfiles inexistentes, inactivos o de otro usuario. Revisá la nómina.',
        );
      const u = await db.Usuario.findByPk(row.UsuarioId, {
        attributes: ['id', 'nombre', 'dni', 'aprobado', 'estado'],
        transaction: t,
      });
      if (!u?.aprobado || u.estado === 'bloqueado')
        R.fail(409, 'Hay participantes sin aprobación vigente.');
      const club = p.clubId
        ? await db.Club.findByPk(p.clubId, { transaction: t })
        : null;
      const sede = p.clubSedeId
        ? await db.ClubSede.findByPk(p.clubSedeId, { transaction: t })
        : null;
      if (sede && Number(sede.clubId) !== Number(p.clubId))
        R.fail(409, 'Un perfil tiene club y sede incompatibles.');
      const group = users.get(u.id) || [];
      group.push({
        eventoNombre: ev.titulo || ev.nombre,
        inscripcionId: row.id,
        perfilDeportivoId: p.id,
        nombre: u.nombre,
        dni: u.dni,
        disciplina: p.disciplina,
        modalidad: p.modalidad,
        categoria: row.categoria,
        division: row.division,
        grupo: row.grupo,
        clubId: p.clubId || null,
        clubSedeId: p.clubSedeId || null,
        club: club?.nombre || p.club || null,
        sede: sede?.nombre || null,
      });
      users.set(u.id, group);
    }
    // Un único tarifario para toda la nómina, bloqueado frente a actualizaciones concurrentes.
    const tarifario = ev.inscripcionRequierePago && users.size ? await Tarifarios.vigente(t) : null;
    const liquidaciones = [...users].map(([usuarioId, participaciones]) => ({
      usuarioId, participaciones, amounts: T.calcular(participaciones, tarifario, !!ev.inscripcionRequierePago),
    }));
    for (const { usuarioId, participaciones, amounts } of liquidaciones) {
      await db.CargoInscripcion.create(
        {
          eventoId: ev.id,
          usuarioId,
          perfilDeportivoIds: participaciones
            .map((p) => p.perfilDeportivoId)
            .sort((a, b) => a - b),
          participacionesSnapshot: participaciones,
          ...amounts,
          estado: ev.inscripcionRequierePago ? 'adeudado' : 'sin_cargo',
        },
        { transaction: t },
      );
    }
    await db.UsuarioEventos.update(
      { estadoInscripcion: 'confirmada' },
      {
        where: { EventoId: ev.id, estadoInscripcion: 'provisoria' },
        transaction: t,
      },
    );
    await ev.update(
      { inscripcionesConfirmadasAt: new Date() },
      { transaction: t },
    );
    await audit(
      ev.id,
      actor,
      actor,
      'confirmacion',
      { participaciones: rows.length },
      t,
    );
    return { confirmado: true, participaciones: rows.length }; // No datos financieros para admin.
  });
}
function datoCargo(c, ev) {
  const p = c.participacionesSnapshot || [];
  return {
    ...c.toJSON(),
    eventoNombre:
      p[0]?.eventoNombre || ev?.titulo || ev?.nombre || `Evento #${c.eventoId}`,
    deportista: p[0]?.nombre,
    dni: p[0]?.dni,
    vencido:
      c.estado === 'adeudado' &&
      ev?.pagoHasta &&
      Date.now() >= +new Date(ev.pagoHasta),
  };
}
module.exports = {
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
};
