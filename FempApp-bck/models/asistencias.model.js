// models/asistencia.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Asistencia = sequelize.define('Asistencia', {
  eventoId: { type: DataTypes.INTEGER, allowNull: false },
  usuarioId: { type: DataTypes.INTEGER, allowNull: false },
  checkedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  scanBy: { type: DataTypes.INTEGER, allowNull: true },
  device: { type: DataTypes.STRING, allowNull: true },
}, { indexes: [{ unique: true, fields: ['eventoId','usuarioId'] }] });

module.exports = Asistencia;
