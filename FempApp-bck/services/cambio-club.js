'use strict';
const C=require('./cuenta'),Club=require('../models/club.model'),Perfil=require('../models/perfildeportivo.model');
const V=require('./documentos-vigencia');
async function cambiar(actorId,id,body){
 if(!Number.isSafeInteger(body.clubId)||body.clubId<1||!V.fechaValida(body.fecha)||body.fecha>V.hoyArgentina())C.R.fail(400,'Seleccioná un club y una fecha válida, hasta hoy.');
 await C.Usuario.sequelize.transaction(async t=>{
  const opts={transaction:t,lock:t.LOCK.UPDATE};
  const actor=await C.Usuario.findByPk(actorId,opts);
  if(!actor||actor.rol!=='administrador'||actor.estado!=='aprobado'||!actor.aprobado)C.R.fail(403,'Solo Administración puede cambiar el club.');
  const u=await C.Usuario.findByPk(id,opts);
  if(!u||u.rol!=='deportista')C.R.fail(400,'Seleccioná una cuenta de deportista.');
  if(!Number.isInteger(body.revision)||body.revision!==u.revision)C.R.fail(409,'La cuenta cambió. Actualizá el detalle.');
  const club=await Club.findByPk(body.clubId,opts);
  if(!club||!club.activo)C.R.fail(400,'El club destino debe estar activo.');
  if(u.club===club.nombre)C.R.fail(409,'La deportista ya pertenece a ese club.');
  const origen=u.club||'Sin club';
  await u.update({club:club.nombre,revision:u.revision+1},{transaction:t});
  await Perfil.update({club:club.nombre,clubId:club.id,clubSedeId:null},{where:{usuarioId:u.id,activa:true},transaction:t});
  await C.historial(u,actorId,'club_cambiado',JSON.stringify({origen,destino:club.nombre,clubDestinoId:club.id,fecha:body.fecha}),t);
 });
 return C.detalle(await C.Usuario.findByPk(id),true);
}
module.exports={cambiar};
