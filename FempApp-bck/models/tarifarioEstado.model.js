const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define('TarifarioEstado', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  tarifarioId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'tarifario_estado', timestamps: false });
