const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Padron = sequelize.define('Padron', {
  licNacionalNumero: {
    type: DataTypes.STRING,
    allowNull: true
  },

  documentoN: {
    type: DataTypes.STRING,
    allowNull: false
  },

  documentoNormalizado: {
    type: DataTypes.STRING,
    allowNull: true
  },

  apellidoYNombre: {
    type: DataTypes.STRING,
    allowNull: false
  },

  fechadeNacimiento: {
    type: DataTypes.DATE,
    allowNull: true
  },

  sexo: {
    type: DataTypes.STRING,
    allowNull: true
  },

  nacionalidad: {
    type: DataTypes.STRING,
    allowNull: true
  },

  club: {
    type: DataTypes.STRING,
    allowNull: true
  },

  clubOriginal: {
    type: DataTypes.STRING,
    allowNull: true
  },

  clubId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  clubSedeId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  categoria: {
    type: DataTypes.STRING,
    allowNull: true
  },

  categoriaOriginal: {
    type: DataTypes.STRING,
    allowNull: true
  },

  funcion: {
    type: DataTypes.STRING,
    allowNull: true
  },

  domicilio: {
    type: DataTypes.STRING,
    allowNull: true
  },

  cP: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  localidad: {
    type: DataTypes.STRING,
    allowNull: true
  },

  provincia: {
    type: DataTypes.STRING,
    allowNull: true
  },

  telefono: {
    type: DataTypes.STRING,
    allowNull: true
  },

  tipoLicencia: {
    type: DataTypes.STRING,
    allowNull: true
  },

  federeada: {
    type: DataTypes.STRING,
    allowNull: true
  },

  temporada: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '2026'
  },

  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'Padrons',
  timestamps: true
});

module.exports = Padron;