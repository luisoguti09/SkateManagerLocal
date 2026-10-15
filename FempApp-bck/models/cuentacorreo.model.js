const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define('CuentaCorreo', { usuarioId: D.INTEGER, tipo: D.STRING(50), payload: D.TEXT('long'), estado: { type: D.STRING(20), defaultValue: 'pendiente' }, intentos: { type: D.INTEGER, defaultValue: 0 }, disponibleAt: D.DATE, leaseAt: D.DATE, leaseId: D.STRING(36), enviadoAt: D.DATE, error: D.STRING(200) }, { tableName: 'CuentaCorreo', timestamps: true });
