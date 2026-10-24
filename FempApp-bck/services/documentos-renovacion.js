'use strict';
const C=require('./cuenta'),F=require('./cuenta-archivos'),V=require('./documentos-vigencia');
async function renovar(id,body,files){
 if(!body||typeof body!=='object'||Array.isArray(body))C.R.fail(400,'Datos inválidos.');
 if(Object.keys(files||{}).some(k=>!Object.hasOwn(V.campos,k)))C.R.fail(400,'Solo ficha médica y certificado WADA.');
 const data={};for(const c of Object.values(V.campos))if(Object.hasOwn(body,c.fecha))data[c.fecha]=body[c.fecha];
 if(!Object.keys(data).length)C.R.fail(400,'Ingresá la fecha del documento.');
 const prepared=Object.values(files||{}).some(v=>v?.length)?await F.preparar(files):{};
 const anteriores={};
 try{
  await C.Usuario.sequelize.transaction(async t=>{
   const u=await C.Usuario.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});
   if(!u||u.rol!=='deportista'||u.estado!=='aprobado')C.R.fail(403,'La renovación corresponde a deportistas con cuenta aprobada.');
   if(!Number.isInteger(body.revision)||body.revision!==u.revision)C.R.fail(409,'La documentación cambió. Actualizá la pantalla.');
   V.validar(u,data,prepared);
   for(const [campo,c] of Object.entries(V.campos))if(Object.hasOwn(data,c.fecha)&&!prepared[campo]&&!await F.existe(u[campo],campo))C.R.fail(400,'Volvé a cargar el archivo de '+c.label+'.');
   for(const k of Object.keys(prepared))anteriores[k]=u[k];
   await u.update({...data,...prepared,documentacionAprobada:false,revision:u.revision+1},{transaction:t});
   await C.historial(u,id,'documentos_renovados',null,t);
  });
 }catch(e){await Promise.all(Object.entries(prepared).map(([k,v])=>F.borrar(v,k)));throw e;}
 await Promise.all(Object.entries(anteriores).map(([k,v])=>F.borrar(v,k)));
 return C.detalle(await C.Usuario.findByPk(id));
}
module.exports={renovar};
