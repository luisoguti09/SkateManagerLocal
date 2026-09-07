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

  origenCategoria: {
    type: DataTypes.STRING(50),
    allowNull: true
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

  // Compatibilidad temporal con datos viejos.
  club: {
    type: DataTypes.STRING,
    allowNull: true
  },

  clubId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'clubes',
      key: 'id'
    }
  },

  clubSedeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'club_sedes',
      key: 'id'
    }
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