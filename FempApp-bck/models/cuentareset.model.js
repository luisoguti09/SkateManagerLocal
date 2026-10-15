const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define('CuentaReset', { usuarioId: D.INTEGER, tokenHash: { type: D.STRING(64), unique: true }, venceAt: D.DATE, usadoAt: D.DATE }, { tableName: 'CuentaReset', timestamps: true });
