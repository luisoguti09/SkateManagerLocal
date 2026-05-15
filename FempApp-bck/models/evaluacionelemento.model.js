const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EvaluacionElemento = sequelize.define('EvaluacionElemento', {
    evaluacionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    elementoId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nota: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    }
}, {
    tableName: 'evaluacion_elementos',
    timestamps: true
});

module.exports = EvaluacionElemento;