const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define('CuentaHistorial', { usuarioId: D.INTEGER, actorId: D.INTEGER, accion: D.STRING(50), estado: D.STRING(40), motivo: D.TEXT, revision: D.INTEGER }, { tableName: 'CuentaHistorial', timestamps: true });
