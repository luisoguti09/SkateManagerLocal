'use strict';
const {DataTypes:D}=require('sequelize');
const db=require('../config/database');
module.exports=db.define('LicenciaAviso',{clave:{type:D.STRING(64),primaryKey:true},usuarioId:{type:D.INTEGER,allowNull:false},temporada:{type:D.INTEGER,allowNull:false}},{tableName:'licencias_avisos'});
