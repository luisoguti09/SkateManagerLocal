// Se invoca desde migrate:cuentas, después de crear CuentaHistorial.
const {DataTypes:D}=require('sequelize');
async function migrar(sequelize){
 const qi=sequelize.getQueryInterface();
 const columnas=await qi.describeTable('Usuarios');
 if(!String(columnas.rol.type).includes("'juez'"))await qi.changeColumn('Usuarios','rol',{type:D.ENUM('administrador','tecnico','juez','deportista','tesoreria'),allowNull:false});
 if(String(columnas.rolSolicitado.type).startsWith('ENUM') && !String(columnas.rolSolicitado.type).includes("'juez'"))await qi.changeColumn('Usuarios','rolSolicitado',{type:D.STRING(255),allowNull:true});
 const Rol=require('../models/rol.model');
 const Usuario=require('../models/usuario.model');
 const Historial=require('../models/cuentahistorial.model');
 const [tecnico,juez]=await Promise.all([Rol.findByPk(3),Rol.findByPk(4)]);
 if(tecnico?.nombre!=='tecnico' || juez?.nombre!=='juez')throw new Error('Los roles 3 y 4 no coinciden. Revisar antes de migrar.');
 const elegidos=[[11,'naty@gmail.com'],[15,'gerchu@me.com'],[23,'lauraherran@live.com.ar'],[26,'orita2008@hotmail.com'],[27,'bettylujan95@gmail.com'],[28,'marcelonarvaez1969@gmail.com']];
 await sequelize.transaction(async t=>{
  for(const [id,email] of elegidos){
   const u=await Usuario.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});
   // No aplicar IDs de producción a otras personas de una base local.
   if(!u || u.email.toLowerCase()!==email){console.log('Migración juez: ID omitido por identidad diferente o ausente:',id);continue;}
   if(u.rol==='juez' && u.rolId===4)continue;
   if(u.rol!=='tecnico' || u.rolId!==3)throw new Error('Rol inesperado en cuenta '+id);
   await u.update({rol:'juez',rolId:4,rolSolicitado:'juez',solicitaLicenciaProvincial:false,sessionVersion:u.sessionVersion+1,revision:u.revision+1},{transaction:t});
   await Historial.create({usuarioId:id,actorId:null,accion:'rol_juez_migrado',estado:u.estado,revision:u.revision,motivo:'Separación de funciones confirmada por la Federación.'},{transaction:t});
  }
 });
 console.log('Roles separados. Se conservaron aprobaciones, evaluaciones y pagos.');
}
module.exports={migrar};
