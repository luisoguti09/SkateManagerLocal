const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define(
  'CargoInscripcion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    eventoId: { type: DataTypes.INTEGER, allowNull: false },
    usuarioId: { type: DataTypes.INTEGER, allowNull: false },
    perfilDeportivoIds: { type: DataTypes.JSON, allowNull: false },
    participacionesSnapshot: { type: DataTypes.JSON, allowNull: false },
    montoBase: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    montoComision: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    montoTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    estado: { type: DataTypes.STRING(30), allowNull: false },
  },
  {
    tableName: 'cargos_inscripcion',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['eventoId', 'usuarioId'],
        name: 'uq_cargo_evento_usuario',
      },
    ],
  },
);
