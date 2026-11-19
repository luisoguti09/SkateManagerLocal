const {fail}=require('./cuenta-reglas');
function validar(body){
 const limpiar=v=>typeof v==='string'?v.trim().replace(/\s+/g,' '):'';
 const apellido=limpiar(body.apellido),nombres=limpiar(body.nombres);
 if(!apellido||!nombres||apellido.length>120||nombres.length>120||/[\p{Cc}<>]/u.test(apellido+nombres))fail(400,'Completá apellidos y nombres (hasta 120 caracteres cada uno).');
 return {apellido,nombres,nombre:apellido+' '+nombres};
}
const autorizado=u=>Number(u?.id)===38&&u.rol==='administrador'&&u.estado==='aprobado'&&!!u.aprobado;
async function corregir(C,actorId,id,body){
 const data=validar(body);
 await C.Usuario.sequelize.transaction(async t=>{
  const opts={transaction:t,lock:t.LOCK.UPDATE};
  const actor=await C.Usuario.findByPk(actorId,opts);
  if(!autorizado(actor))fail(403,'No tenés permiso para corregir nombres.');
  const u=await C.Usuario.findByPk(id,opts);if(!u)fail(404,'Cuenta no encontrada.');
  if(!Number.isInteger(body.revision)||body.revision!==u.revision)fail(409,'La cuenta cambió. Actualizá el detalle.');
  const anterior={nombre:u.nombre,apellido:u.apellido,nombres:u.nombres};
  await u.update({...data,revision:u.revision+1},{transaction:t});
  await C.historial(u,actorId,'nombre_corregido',JSON.stringify({anterior,actual:data}),t);
 });
 return C.detalle(await C.Usuario.findByPk(id),true);
}
module.exports={validar,autorizado,corregir};
