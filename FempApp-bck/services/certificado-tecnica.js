const C=require('./cuenta');
const F=require('./cuenta-archivos');
async function renovar(id,revision,files,fecha){
 const keys=Object.entries(files||{}).filter(([,v])=>v?.length).map(([k])=>k);
 if(keys.length!==1 || keys[0]!=='certificadoAntecedentes')C.R.fail(400,'Seleccioná únicamente el certificado de antecedentes penales.');
 const prepared=await F.preparar(files);let anterior;
 try{
  await C.Usuario.sequelize.transaction(async t=>{
   const u=await C.Usuario.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});
   if(!u || u.rol!=='tecnico' || u.estado!=='aprobado')C.R.fail(403,'Esta carga corresponde a técnicas con cuenta aprobada.');
   if(!Number.isInteger(revision) || revision!==u.revision)C.R.fail(409,'La documentación cambió. Actualizá la pantalla antes de enviar.');
   require('./antecedentes-fecha').validar(u,{certificadoAntecedentesFecha:fecha},prepared);
   anterior=u.certificadoAntecedentes;
   await u.update({...prepared,certificadoAntecedentesFecha:fecha,documentacionAprobada:false,revision:u.revision+1},{transaction:t});
   await C.historial(u,id,'certificado_antecedentes_actualizado',null,t);
  });
 }catch(e){await F.borrar(prepared.certificadoAntecedentes,'certificadoAntecedentes');throw e;}
 await F.borrar(anterior,'certificadoAntecedentes');
 return C.detalle(await C.Usuario.findByPk(id));
}
module.exports={renovar};
