const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Componente = sequelize.define('Componente', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  disciplina: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: true
  },
  puntajeMinimo: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true
  },
  puntajeMaximo: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'componentes',
  timestamps: true
});

module.exports = Componente;