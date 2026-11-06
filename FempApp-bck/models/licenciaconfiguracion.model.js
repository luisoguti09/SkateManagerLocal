'use strict';
const {DataTypes:D}=require('sequelize');
const db=require('../config/database');
const Config=db.define('LicenciaConfiguracion',{id:{type:D.INTEGER,primaryKey:true},revision:{type:D.INTEGER,allowNull:false,defaultValue:0},datos:{type:D.JSON,allowNull:false}},{tableName:'licencias_configuracion'});
const Audit=db.define('LicenciaConfiguracionHistorial',{actorId:{type:D.INTEGER,allowNull:false},revision:{type:D.INTEGER,allowNull:false},antes:D.JSON,despues:{type:D.JSON,allowNull:false},motivo:{type:D.STRING(500),allowNull:false}},{tableName:'licencias_configuracion_historial'});
module.exports={Config,Audit};
