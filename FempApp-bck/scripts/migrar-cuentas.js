require('dotenv').config();
const {DataTypes:D}=require('sequelize');
const sequelize=require('../config/database');
const Usuario=require('../models/usuario.model');
const Historial=require('../models/cuentahistorial.model');
const Correo=require('../models/cuentacorreo.model');
const Reset=require('../models/cuentareset.model');
async function main(){
  await sequelize.authenticate();
  const qi=sequelize.getQueryInterface(),table=Usuario.getTableName();
  const columns=await qi.describeTable(table);
  const additions={certificadoAntecedentesFecha:{type:D.DATEONLY,allowNull:true},certificadoWada:{type:D.STRING,allowNull:true},fichaMedicaFecha:{type:D.DATEONLY,allowNull:true},wadaFecha:{type:D.DATEONLY,allowNull:true},certificadoAntecedentes:{type:D.STRING,allowNull:true},sessionVersion:{type:D.INTEGER,allowNull:false,defaultValue:0},revision:{type:D.INTEGER,allowNull:false,defaultValue:0},correcciones:{type:D.TEXT,allowNull:true},camposCorregir:{type:D.JSON,allowNull:true},solicitaLicenciaProvincial:{type:D.BOOLEAN,allowNull:false,defaultValue:false}};
  for(const [name,def] of Object.entries(additions))if(!columns[name])await qi.addColumn(table,name,def);
  if(!String(columns.estado.type).includes('requiere_correcciones'))await qi.changeColumn(table,'estado',{type:D.ENUM('pendiente','requiere_correcciones','aprobado','bloqueado'),defaultValue:'pendiente'});
  // sync sin alter/force SOLO crea estas tablas nuevas; jamás recrea Usuarios.
  await require('../models/documentoaviso.model').sync();await Historial.sync();await Correo.sync();await Reset.sync();
  for(const [table,fields,name] of [['CuentaHistorial',['usuarioId','id'],'cuenta_historial_usuario'],['CuentaCorreo',['estado','disponibleAt'],'cuenta_correo_pendientes'],['CuentaReset',['usuarioId','createdAt'],'cuenta_reset_usuario']]){
    const indexes=await qi.showIndex(table);if(!indexes.some(i=>i.name===name))await qi.addIndex(table,fields,{name});
  }
  await require('./migrar-roles').migrar(sequelize);
  console.log('Migración completa. Estados, pagos y evaluaciones conservados.');
}
main().catch(e=>{console.error('Migración fallida:',e.name,e.message);process.exitCode=1;}).finally(()=>sequelize.close());
