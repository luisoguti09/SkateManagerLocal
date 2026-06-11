const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const db = {};

// Cargar todas las instancias de modelos de esta carpeta
fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const model = require(path.join(__dirname, file)); // cada archivo exporta la instancia ya inicializada
    if (!model || !model.name) return;
    db[model.name] = model; // p.ej. Evento, Usuario, Asistencia, UsuarioEventos, etc.
  });

// Llamar associate UNA sola vez si el modelo lo define
Object.keys(db).forEach(modelName => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

// Instancia de sequelize disponible para queries crudos
db.sequelize = sequelize;
db.Sequelize = Sequelize;

/** Asociaciones explícitas **/
if (db.Usuario && db.Evento && db.UsuarioEventos) {
  db.Usuario.belongsToMany(db.Evento, {
    through: db.UsuarioEventos,
    foreignKey: 'UsuarioId',
    otherKey: 'EventoId',
  });
  db.Evento.belongsToMany(db.Usuario, {
    through: db.UsuarioEventos,
    foreignKey: 'EventoId',
    otherKey: 'UsuarioId',
  });
}

// Patinador <-> Evento
if (db.Patinador && db.Evento) {
  db.Patinador.belongsToMany(db.Evento, { through: 'PatinadorEventos', foreignKey: 'PatinadorId', otherKey: 'EventoId' });
  db.Evento.belongsToMany(db.Patinador, { through: 'PatinadorEventos', foreignKey: 'EventoId', otherKey: 'PatinadorId' });
}

// Relaciones de Asistencia
if (db.Asistencia && db.Evento && db.Usuario) {
  db.Asistencia.belongsTo(db.Evento, { foreignKey: 'eventoId' });
  db.Asistencia.belongsTo(db.Usuario, { foreignKey: 'usuarioId' });
  db.Asistencia.belongsTo(db.Usuario, { as: 'scanByUser', foreignKey: 'scanBy' });
}

// Usuario <-> PerfilDeportivo
if (db.Usuario && db.PerfilDeportivo) {
  db.Usuario.hasMany(db.PerfilDeportivo, {
    foreignKey: 'usuarioId',
    as: 'perfilesDeportivos'
  });

  db.PerfilDeportivo.belongsTo(db.Usuario, {
    foreignKey: 'usuarioId',
    as: 'usuario'
  });
}

// PerfilDeportivo -> Club / ClubSede
if (db.PerfilDeportivo && db.Club) {
  db.PerfilDeportivo.belongsTo(db.Club, {
    foreignKey: 'clubId',
    as: 'clubEntidad'
  });

  db.Club.hasMany(db.PerfilDeportivo, {
    foreignKey: 'clubId',
    as: 'perfilesDeportivos'
  });
}

if (db.PerfilDeportivo && db.ClubSede) {
  db.PerfilDeportivo.belongsTo(db.ClubSede, {
    foreignKey: 'clubSedeId',
    as: 'clubSede'
  });

  db.ClubSede.hasMany(db.PerfilDeportivo, {
    foreignKey: 'clubSedeId',
    as: 'perfilesDeportivos'
  });
}

// Relaciones de Evaluaciones
if (db.Evaluacion && db.EvaluacionElemento) {
  db.Evaluacion.hasMany(db.EvaluacionElemento, {
    foreignKey: 'evaluacionId',
    as: 'elementos'
  });

  db.EvaluacionElemento.belongsTo(db.Evaluacion, {
    foreignKey: 'evaluacionId',
    as: 'evaluacion'
  });
}

if (db.Evaluacion && db.EvaluacionComponente) {
  db.Evaluacion.hasMany(db.EvaluacionComponente, {
    foreignKey: 'evaluacionId',
    as: 'componentes'
  });

  db.EvaluacionComponente.belongsTo(db.Evaluacion, {
    foreignKey: 'evaluacionId',
    as: 'evaluacion'
  });
}

if (db.EvaluacionElemento && db.Elemento) {
  db.EvaluacionElemento.belongsTo(db.Elemento, {
    foreignKey: 'elementoId',
    as: 'elemento'
  });
}

if (db.EvaluacionComponente && db.Componente) {
  db.EvaluacionComponente.belongsTo(db.Componente, {
    foreignKey: 'componenteId',
    as: 'componente'
  });
}

// Relaciones de Pago
if (db.Pago && db.Usuario) {
  db.Pago.belongsTo(db.Usuario, {
    foreignKey: 'usuarioId',
    as: 'usuario'
  });

  db.Usuario.hasMany(db.Pago, {
    foreignKey: 'usuarioId',
    as: 'pagos'
  });
}

if (db.Pago && db.Evento) {
  db.Pago.belongsTo(db.Evento, {
    foreignKey: 'eventoId',
    as: 'evento'
  });

  db.Evento.hasMany(db.Pago, {
    foreignKey: 'eventoId',
    as: 'pagos'
  });
}

if (db.Pago && db.PerfilDeportivo) {
  db.Pago.belongsTo(db.PerfilDeportivo, {
    foreignKey: 'perfilDeportivoId',
    as: 'perfilDeportivo'
  });

  db.PerfilDeportivo.hasMany(db.Pago, {
    foreignKey: 'perfilDeportivoId',
    as: 'pagos'
  });
}

// Evento <-> Precios de participación
if (db.Evento && db.PrecioParticipacionEvento) {
  db.Evento.hasMany(db.PrecioParticipacionEvento, {
    foreignKey: 'eventoId',
    as: 'preciosParticipacion'
  });

  db.PrecioParticipacionEvento.belongsTo(db.Evento, {
    foreignKey: 'eventoId',
    as: 'evento'
  });
}

// Club <-> ClubSede
if (db.Club && db.ClubSede) {
  db.Club.hasMany(db.ClubSede, {
    foreignKey: 'clubId',
    as: 'sedes'
  });

  db.ClubSede.belongsTo(db.Club, {
    foreignKey: 'clubId',
    as: 'club'
  });
}

// Padron -> Club / ClubSede
if (db.Padron && db.Club) {
  db.Padron.belongsTo(db.Club, {
    foreignKey: 'clubId',
    as: 'clubNormalizado'
  });
}

if (db.Padron && db.ClubSede) {
  db.Padron.belongsTo(db.ClubSede, {
    foreignKey: 'clubSedeId',
    as: 'sedeNormalizada'
  });
}

module.exports = db;
