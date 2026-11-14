'use strict';
const {fail}=require('./cuenta-reglas');
function service({Permiso,Historial,Usuario,Catalogo}){
 async function acceso(auth){
  if(auth.rol==='administrador')return{general:true,deportes:[]};
  const row=await Permiso.findByPk(auth.id);
  return{general:false,deportes:row?.deportes||[]};
 }
 function permitir(a,nombre){if(!a.general&&!a.deportes.includes(nombre))fail(403,'No tenés permiso para administrar este deporte.');}
 async function guardar(body,actorId){
  if(!Number.isSafeInteger(body.usuarioId)||body.usuarioId<=0||!Number.isInteger(body.revision)||body.revision<0||!Array.isArray(body.deportes)||body.deportes.length>40||body.deportes.some(d=>typeof d!=='string'||d.length>80)||new Set(body.deportes).size!==body.deportes.length)fail(400,'Permiso inválido.');
  if(typeof body.motivo!=='string'||body.motivo.trim().length<5||body.motivo.length>500)fail(400,'Indicá el motivo del permiso.');
  return Permiso.sequelize.transaction(async transaction=>{
   const u=await Usuario.findByPk(body.usuarioId,{transaction,lock:transaction.LOCK.UPDATE});
   if(!u||u.estado!=='aprobado'||!u.aprobado)fail(400,'Elegí una cuenta aprobada.');
   for(const d of body.deportes)if(d==='PATINAJE ARTÍSTICO'||!await Catalogo.findByPk(d,{transaction}))fail(400,'Asigná únicamente deportes del catálogo administrable.');
   const row=await Permiso.findByPk(body.usuarioId,{transaction,lock:transaction.LOCK.UPDATE});
   if((row?.revision||0)!==body.revision)fail(409,'El permiso cambió. Volvé a consultar la cuenta.');
   const antes=row?.toJSON()||null,despues={usuarioId:body.usuarioId,deportes:body.deportes,revision:body.revision+1};
   const saved=row?await row.update(despues,{transaction}):await Permiso.create(despues,{transaction});
   await Historial.create({usuarioId:body.usuarioId,actorId,antes,despues,motivo:body.motivo.trim()},{transaction});
   return saved;
  });
 }
 return{acceso,permitir,guardar};
}
module.exports={service};
