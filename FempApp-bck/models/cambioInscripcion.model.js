const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define(
  'CambioInscripcion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    eventoId: { type: DataTypes.INTEGER, allowNull: false },
    usuarioId: { type: DataTypes.INTEGER, allowNull: false },
    actorId: { type: DataTypes.INTEGER, allowNull: false },
    accion: { type: DataTypes.STRING(30), allowNull: false },
    detalle: { type: DataTypes.JSON, allowNull: false },
  },
  { tableName: 'cambios_inscripcion', timestamps: true },
);
