const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EvaluacionComponente = sequelize.define('EvaluacionComponente', {
    evaluacionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    componenteId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nota: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    estadoTecnico: {
        type: DataTypes.ENUM(
            'NO_ADQUIRIDO',
            'EN_DESARROLLO',
            'CONSOLIDANDOSE',
            'LOGRADO',
            'DOMINADO'
        ),
        allowNull: true
    },
    observacion: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'evaluacion_componentes',
    timestamps: true
});

module.exports = EvaluacionComponente;