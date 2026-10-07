const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define('TarifarioGeneral', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  individual1: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  individual2: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  individual3: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  pareja: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  conjunto: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  actorId: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'tarifarios_generales', timestamps: true });
