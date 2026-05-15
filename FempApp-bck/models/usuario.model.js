const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');
const Padron = require('./padron.model');
const Evento = require('./evento.model');
const Role = require('./rol.model');
const { v4: uuidv4 } = require('uuid');
hooks: {
  beforeCreate: (u) => { if (!u.qrJti) u.qrJti = uuidv4(); }
}


const Usuario = sequelize.define('Usuario', {

  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  edad: { 
    type: DataTypes.INTEGER,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },

  dni: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  rol: {
    type: DataTypes.ENUM,
    values: ['administrador', 'tecnico', 'deportista'],
    allowNull: false
  },
  rolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Roles',
      key: 'id'
    }
  },
  fotoPerfil: {
    type: DataTypes.STRING,
    allowNull: true
  },
  aprobado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dniFrente: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dniDorso: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fichaMedica: {
    type: DataTypes.STRING,
    allowNull: true
  },
  documentacionAprobada: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  club: {
  type: DataTypes.STRING,
  allowNull: true
},
categoria: {
  type: DataTypes.STRING,
  allowNull: true
},
nivel: {
  type: DataTypes.STRING,
  allowNull: true
},
domicilio: {
  type: DataTypes.STRING,
  allowNull: true
},
telefono: {
  type: DataTypes.STRING,
  allowNull: true
},
fechaNacimiento: {
  type: DataTypes.DATEONLY,
  allowNull: true
},
instagram: {
  type: DataTypes.STRING,
  allowNull: true
},
facebook: {
  type: DataTypes.STRING,
  allowNull: true
},
tiktok: {
  type: DataTypes.STRING,
  allowNull: true
},
qrJti: {
  type: DataTypes.UUID,
  allowNull: true,
  defaultValue: () => uuidv4()
},
estado: {
  type: DataTypes.ENUM('pendiente','aprobado','bloqueado'),
  defaultValue: 'pendiente'
},
rolSolicitado: {
  type: DataTypes.ENUM('administrador','tecnico','deportista'),
  allowNull: true
},

});

// Hash de la contraseña antes de guardar
Usuario.beforeCreate(async (usuario) => {
  const salt = await bcrypt.genSalt(10);
  usuario.password = await bcrypt.hash(usuario.password, salt);
});

Usuario.associate = (models) => {
  Usuario.belongsToMany(models.Evento, { through: 'UsuarioEventos' });
};



 
module.exports = Usuario;
