const {DataTypes:D}=require('sequelize');
const sequelize=require('../config/database');
module.exports=sequelize.define('DocumentoAviso',{clave:{type:D.STRING(180),primaryKey:true},usuarioId:{type:D.INTEGER,allowNull:false}},{tableName:'DocumentoAviso',timestamps:true});
