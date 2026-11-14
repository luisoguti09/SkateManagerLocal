'use strict';
const {DataTypes:D}=require('sequelize'),db=require('../config/database');
const Catalogo=db.define('DeporteCatalogo',{nombre:{type:D.STRING(80),primaryKey:true},activo:{type:D.BOOLEAN,allowNull:false,defaultValue:true},fuente:{type:D.STRING(1000),allowNull:false,defaultValue:''},disciplinas:{type:D.JSON,allowNull:false},revision:{type:D.INTEGER,allowNull:false,defaultValue:0}},{tableName:'deportes_catalogo'});
const Historial=db.define('DeporteCatalogoHistorial',{deporte:{type:D.STRING(80),allowNull:false},actorId:{type:D.INTEGER,allowNull:false},antes:D.JSON,despues:{type:D.JSON,allowNull:false},motivo:{type:D.STRING(500),allowNull:false}},{tableName:'deportes_catalogo_historial'});
module.exports={Catalogo,Historial};
