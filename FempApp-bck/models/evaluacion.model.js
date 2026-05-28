const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Evaluacion = sequelize.define('Evaluacion', {
    deportistaId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    eventoId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tipoEvaluacion: {
        type: DataTypes.ENUM('LIBRE', 'FO', 'DANZA'),
        allowNull: false,
        defaultValue: 'LIBRE'
    },
    origen: {
        type: DataTypes.ENUM('EVENTO', 'EVALUATIVO', 'TECNICA', 'CONTROL', 'CLINICA', 'MANUAL', 'OTRO'),
        allowNull: false,
        defaultValue: 'TECNICA'
    },
    fechaEvaluacion: {
        type: DataTypes.DATE,
        allowNull: true
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