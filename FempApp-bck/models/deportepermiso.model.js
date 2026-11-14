'use strict';
const {DataTypes:D}=require('sequelize'),db=require('../config/database');
const Permiso=db.define('DeportePermiso',{usuarioId:{type:D.INTEGER,primaryKey:true},deportes:{type:D.JSON,allowNull:false},revision:{type:D.INTEGER,allowNull:false,defaultValue:0}},{tableName:'deportes_permisos'});
const Historial=db.define('DeportePermisoHistorial',{usuarioId:{type:D.INTEGER,allowNull:false},actorId:{type:D.INTEGER,allowNull:false},antes:D.JSON,despues:{type:D.JSON,allowNull:false},motivo:{type:D.STRING(500),allowNull:false}},{tableName:'deportes_permisos_historial'});
module.exports={Permiso,Historial};
