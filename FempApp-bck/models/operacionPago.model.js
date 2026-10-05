const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define(
  'OperacionPago',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    pagoId: { type: DataTypes.INTEGER, allowNull: false },
    paymentId: { type: DataTypes.STRING, allowNull: false, unique: true },
    estado: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    actualizadoProveedor: { type: DataTypes.DATE, allowNull: false },
    rawPayment: { type: DataTypes.JSON, allowNull: false },
  },
  { tableName: 'operaciones_pago', timestamps: true },
);
