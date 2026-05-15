// models/patinador.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Evento = require('./evento.model');

const Patinador = sequelize.define('Patinador', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  edad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nivel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dni: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fotoPerfil: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Patinador;


