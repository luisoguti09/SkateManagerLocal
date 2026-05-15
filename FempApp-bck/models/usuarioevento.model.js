const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UsuarioEventos = sequelize.define('UsuarioEventos', {
  EventoId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: 'EventoId' },
  UsuarioId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: 'UsuarioId' },
  perfilDeportivoId: { type: DataTypes.INTEGER, allowNull: true },

  // campos opcionales adicionales a la inscripción
  categoria: { type: DataTypes.STRING(80), allowNull: true },
  disciplina: { type: DataTypes.STRING(80), allowNull: true },
  division: { type: DataTypes.STRING(20), allowNull: true },
  grupo: { type: DataTypes.STRING(50), allowNull: true },
  rol: { type: DataTypes.ENUM('deportista', 'coach', 'juez', 'staff', 'otro'), allowNull: true },
}, {
  tableName: 'usuarioeventos',
  timestamps: true,
});

module.exports = UsuarioEventos;
