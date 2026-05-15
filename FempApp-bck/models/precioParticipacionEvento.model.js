// models/precioParticipacionEvento.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PrecioParticipacionEvento = sequelize.define('PrecioParticipacionEvento', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  eventoId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  cantidadParticipaciones: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  monto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },

  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'precios_participacion_evento',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['eventoId', 'cantidadParticipaciones']
    }
  ]
});

module.exports = PrecioParticipacionEvento;