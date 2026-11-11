'use strict';
const {DataTypes: D} = require('sequelize');
const db = require('../config/database');
const Connection = db.define('MpOauthConexion', {
  id: {type: D.STRING(32), primaryKey: true}, revision: {type: D.INTEGER, allowNull: false, defaultValue: 0},
  clientId: D.STRING(32), collectorId: D.STRING(32), live: D.BOOLEAN, nickname: D.STRING(255),
  fingerprint: D.STRING(64), tokens: D.TEXT, expiresAt: D.DATE, verifiedAt: D.DATE, actorId: D.INTEGER
}, {tableName: 'mp_oauth_conexiones', timestamps: true});
const Attempt = db.define('MpOauthIntento', {
  id: {type: D.STRING(64), primaryKey: true}, actorId: {type: D.INTEGER, allowNull: false}, sessionVersion: {type: D.INTEGER, allowNull: false},
  fingerprint: {type: D.STRING(64), allowNull: false}, connectionRevision: {type: D.INTEGER, allowNull: false},
  status: {type: D.STRING(24), allowNull: false}, secret: D.TEXT, expiresAt: {type: D.DATE, allowNull: false},
  nickname: D.STRING(255), collectorId: D.STRING(32)
}, {tableName: 'mp_oauth_intentos', timestamps: true, indexes: [{fields: ['expiresAt']}]});
const Audit = db.define('MpOauthHistorial', {
  id: {type: D.INTEGER, primaryKey: true, autoIncrement: true}, actorId: D.INTEGER,
  action: {type: D.STRING(40), allowNull: false}, collectorId: D.STRING(32), revision: D.INTEGER
}, {tableName: 'mp_oauth_historial', timestamps: true});
module.exports = {db, Connection, Attempt, Audit};
