'use strict';
const C=require('./cuenta'),F=require('./cuenta-archivos'),P=require('./documentos-permisos');
async function corregir(id,revision,files){
 const keys=Object.keys(files||{});
 if(!keys.length||keys.some(k=>!P.identidad.includes(k)))C.R.fail(400,'Seleccioná solamente frente o dorso del DNI autorizado.');
 const prepared=await F.preparar(files),old={};
 try{
  await C.Usuario.sequelize.transaction(async t=>{
   const u=await C.Usuario.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});
   if(!u||u.estado!=='aprobado'||!u.aprobado)C.R.fail(403,'Esta corrección corresponde a una cuenta aprobada.');
   if(!Number.isInteger(revision)||revision!==u.revision)C.R.fail(409,'La cuenta cambió. Actualizá antes de guardar.');
   P.autorizarIdentidad(u,files);
   require('./cuenta-documentos').validarArchivos(u,files);
   for(const k of keys)old[k]=u[k];
   await u.update({...prepared,documentacionAprobada:false,camposCorregir:(u.camposCorregir||[]).filter(k=>!keys.includes(k)),revision:u.revision+1},{transaction:t});
   await C.historial(u,id,'identidad_corregida',keys.join(', '),t);
  });
 }catch(e){await Promise.all(Object.entries(prepared).map(([k,v])=>F.borrar(v,k)));throw e;}
 await Promise.all(Object.entries(old).map(([k,v])=>F.borrar(v,k)));
 return C.detalle(await C.Usuario.findByPk(id));
}
module.exports={corregir};
