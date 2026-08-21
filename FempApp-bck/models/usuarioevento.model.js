const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UsuarioEventos = sequelize.define('UsuarioEventos', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  EventoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'EventoId'
  },

  UsuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'UsuarioId'
  },

  perfilDeportivoId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  categoria: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  disciplina: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  division: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  grupo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  rol: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'deportista'
  }
}, {
  tableName: 'usuarioeventos',
  timestamps: true
});

module.exports = UsuarioEventos;