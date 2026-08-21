const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Evento = sequelize.define('Evento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  titulo: {
    type: DataTypes.STRING,
    allowNull: false
  },

  descripcion: {
    type: DataTypes.STRING,
    allowNull: true
  },

  fechaInicio: {
    type: DataTypes.DATE,
    allowNull: true
  },

  fechaFin: {
    type: DataTypes.DATE,
    allowNull: true
  },

  lugar: {
    type: DataTypes.STRING,
    allowNull: false
  },

  qrEventCode: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  lat: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },

  lng: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },

  requireGeo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  checkinRadius: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  estado: {
    type: DataTypes.ENUM('borrador', 'publicado', 'inscripcion', 'en_curso', 'finalizado'),
    allowNull: false,
    defaultValue: 'publicado'
  }
}, {
  tableName: 'Eventos',
  timestamps: true
});

Evento.associate = (models) => {
  Evento.belongsToMany(models.Usuario, { through: 'UsuarioEventos' });
};

module.exports = Evento;