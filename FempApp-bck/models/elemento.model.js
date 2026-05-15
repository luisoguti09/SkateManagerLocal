const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Elemento = sequelize.define('Elemento', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  disciplina: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tipo: {
    type: DataTypes.ENUM('salto', 'trompo', 'secuencia', 'figura', 'danza', 'otro'),
    allowNull: false,
    defaultValue: 'otro'
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: true
  },
  valorBase: {
    type: DataTypes.DECIMAL(6, 2),
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
  tableName: 'elementos',
  timestamps: true
});

module.exports = Elemento;