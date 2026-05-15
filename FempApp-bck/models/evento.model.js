const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Patinador = require('./patinador.model');

const Evento = sequelize.define('Evento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fechaIncripcion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lugar: {
    type: DataTypes.STRING,
    allowNull: false
  },
  qrEventCode: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  // Geo:
  lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  requireGeo: { type: DataTypes.BOOLEAN, defaultValue: false },
  checkinRadius: { type: DataTypes.INTEGER, allowNull: true },
  estado: {
  type: DataTypes.ENUM('borrador','publicado','inscripcion','en_curso','finalizado'),
  allowNull: false,
  defaultValue: 'publicado'
}
});

Evento.associate = (models) => {
  Evento.belongsToMany(models.Usuario, { through: 'UsuarioEventos' });
};


module.exports = Evento;
