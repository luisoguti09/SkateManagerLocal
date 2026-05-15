const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Evaluacion = sequelize.define('Evaluacion', {
    deportistaId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    elementoId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    componenteId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    notaElemento: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    notaComponente: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    observacion: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'evaluaciones',
    timestamps: true
});

module.exports = Evaluacion;