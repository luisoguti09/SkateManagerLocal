const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClubSede = sequelize.define('ClubSede', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  clubId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },

  nombreNormalizado: {
    type: DataTypes.STRING,
    allowNull: false
  },

  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'club_sedes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['clubId', 'nombreNormalizado']
    }
  ]
});

module.exports = ClubSede;