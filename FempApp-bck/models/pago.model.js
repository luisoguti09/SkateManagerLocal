
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pago = sequelize.define('Pago', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  eventoId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  perfilDeportivoId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  externalReference: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  preferenceId: {
    type: DataTypes.STRING,
    allowNull: false
  },

  paymentId: {
    type: DataTypes.STRING,
    allowNull: true
  },

  montoBase: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },

  porcentajeComision: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 5
  },

  montoComision: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },

  montoTotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },

  estadoPago: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pendiente'
  },

  cantidadParticipaciones: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },

  perfilDeportivoIds: {
    type: DataTypes.JSON,
    allowNull: true
  },

  estadoConciliacion: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pendiente'
  },

  payerEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },

  paymentMethodId: {
    type: DataTypes.STRING,
    allowNull: true
  },

  paymentTypeId: {
    type: DataTypes.STRING,
    allowNull: true
  },

  fechaAprobacion: {
    type: DataTypes.DATE,
    allowNull: true
  },

  rawPreference: {
    type: DataTypes.JSON,
    allowNull: true
  },

  deportistaNombreSnapshot: {
    type: DataTypes.STRING,
    allowNull: true
  },

  deportistaDniSnapshot: {
    type: DataTypes.STRING,
    allowNull: true
  },

  eventoNombreSnapshot: {
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

  clubSnapshot: {
    type: DataTypes.STRING,
    allowNull: true
  },

  clubSedeSnapshot: {
    type: DataTypes.STRING,
    allowNull: true
  },

  rawPayment: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'pagos',
  timestamps: true
});

module.exports = Pago;