const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PerfilDeportivo = sequelize.define('PerfilDeportivo', {
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Usuarios',
            key: 'id'
        }
    },
    disciplina: {
        type: DataTypes.STRING,
        allowNull: false
    },
    licencia: {
        type: DataTypes.STRING,
        allowNull: true
    },
    modalidad: {
        type: DataTypes.STRING,
        allowNull: true
    },
    divisional: {
        type: DataTypes.STRING,
        allowNull: true
    },
    categoria: {
        type: DataTypes.STRING,
        allowNull: true
    },
    temporada: {
        type: DataTypes.STRING,
        allowNull: true
    },
    club: {
        type: DataTypes.STRING,
        allowNull: true
    },
    activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'perfiles_deportivos',
    timestamps: true
});

module.exports = PerfilDeportivo;