'use strict';
const {randomUUID}=require('node:crypto');
const {fail}=require('../cuenta-reglas'),P=require('./propuesta'),B=require('./becas'),R=require('./cobro-reglas'),V=require('../documentos-vigencia');
function temporada(value){const n=Number(value);if(!Number.isInteger(n)||n<2020||n>2100)fail(400,'Temporada inválida.');return n;}
function documentos(u,hoy){return u?.rol==='deportista'&&u.estado==='aprobado'&&u.aprobado===true&&u.documentacionAprobada===true&&V.resumen(u,hoy).every(d=>d.vence&&d.dias>=0);}
function permisoCobro(env,usuarioId,year){if(year!==Number(env.MP_LICENCIAS_TEMPORADA||2027))fail(403,'El cobro de esta temporada no está abierto.');if(env.MP_LICENCIAS_ENABLED!=='true')fail(503,'El cobro de licencias todavía no está habilitado.');if(env.MP_LICENCIAS_PILOTO_USUARIO_ID&&String(usuarioId)!==env.MP_LICENCIAS_PILOTO_USUARIO_ID)fail(403,'El cobro está en verificación inicial. Tesorería avisará cuando se habilite.');}
function exentaVigente(l,b){return l.estado==='exenta'&&b?.activa===true&&b.porcentaje===100&&b.usuarioId===l.usuarioId&&b.temporada===l.temporada&&b.id===l.exencion?.becaId;}
function service({Licencia,Intento,Operacion,Historial,Usuario,Config,Beca,provider,env=process.env,now=Date.now}){
 const fecha=()=>V.hoyArgentina(new Date(now()));
 const transaction=fn=>Licencia.sequelize.transaction(fn);
 const audit=(l,actorId,accion,datos,t)=>Historial.create({licenciaId:l.id,actorId,accion,datos},{transaction:t});
 async function usuario(id,t){const u=await Usuario.findByPk(id,t?{transaction:t,lock:t.LOCK.UPDATE}:{});if(!u||u.rol!=='deportista')fail(404,'Deportista no encontrado.');return u;}
 const beca=(id,year,t)=>Beca.findOne({where:{usuarioId:id,temporada:year},...(t?{transaction:t,lock:t.LOCK.UPDATE}:{})});
 async function cotizacion(l,b,t){
  const config=await Config.findByPk(l.temporada,t?{transaction:t,lock:t.LOCK.UPDATE}:{});
  if(!config)fail(409,'Tesorería debe guardar los periodos de esta temporada.');
  let q;try{q=P.cotizarActual(config.datos,fecha());}catch(e){fail(409,e.message);}
  const benefit=B.aplicar(q.totalCentavos,b,l.usuarioId,l.temporada);
  return {...q,...benefit,importeArancelCentavos:q.importeCentavos,configRevision:config.revision,cotizadoAt:new Date(now()).toISOString(),moneda:'ARS',comisionCentavos:0};
 }
 async function solicitar(id,year){year=temporada(year);return transaction(async t=>{
  await usuario(id,t);let l=await Licencia.findOne({where:{usuarioId:id,temporada:year},transaction:t,lock:t.LOCK.UPDATE});
  if(!l){l=await Licencia.create({usuarioId:id,temporada:year,estado:'solicitada',revision:0},{transaction:t});await audit(l,id,'solicitud',{},t);}return l;
 });}
 async function asignar(body,actor){const year=temporada(body.temporada);
  if(!Number.isSafeInteger(body.usuarioId)||body.usuarioId<=0||!V.fechaValida(body.fechaNacional)||body.fechaNacional>fecha()||!Number.isInteger(body.revision)||typeof body.motivo!=='string'||body.motivo.trim().length<5||body.motivo.length>500)fail(400,'Revisá deportista, fecha nacional, revisión y motivo.');
  return transaction(async t=>{await usuario(body.usuarioId,t);
   let l=await Licencia.findOne({where:{usuarioId:body.usuarioId,temporada:year},transaction:t,lock:t.LOCK.UPDATE});
   if((l?.revision||0)!==body.revision)fail(409,'La licencia cambió. Actualizá antes de guardar.');
   if(l&&(l.estado!=='solicitada'||await Intento.findOne({where:{licenciaId:l.id},transaction:t})))fail(409,'Hay una exención o cobro iniciado. No se cambia su arancel.');
   const c=await Config.findByPk(year,{transaction:t});if(!c)fail(409,'Guardá los periodos de esta temporada.');try{P.asignar(c.datos,body.fechaNacional);}catch(e){fail(400,e.message);}
   const antes=l?.fechaNacional||null;
   if(!l)l=await Licencia.create({usuarioId:body.usuarioId,temporada:year,fechaNacional:body.fechaNacional,estado:'solicitada',revision:1},{transaction:t});else await l.update({fechaNacional:body.fechaNacional,revision:l.revision+1},{transaction:t});
   await audit(l,actor,'fecha_nacional',{antes,despues:body.fechaNacional,motivo:body.motivo.trim()},t);return l;
  });
 }
 async function detalle(id,year){year=temporada(year);const u=await usuario(id),l=await Licencia.findOne({where:{usuarioId:id,temporada:year}}),b=await beca(id,year);
  const result={temporada:year,documentosAprobadosVigentes:documentos(u,fecha()),cobrosHabilitados:year===Number(env.MP_LICENCIAS_TEMPORADA||2027)&&env.MP_LICENCIAS_ENABLED==='true'&&(!env.MP_LICENCIAS_PILOTO_USUARIO_ID||env.MP_LICENCIAS_PILOTO_USUARIO_ID===String(id)),licencia:l?.toJSON()||null,habilitada:false,cotizacion:null,aviso:''};
  if(!l)return result;
  result.habilitada=result.documentosAprobadosVigentes&&(l.estado==='conciliada'||exentaVigente(l,b));
  if(l.estado==='exenta'&&!exentaVigente(l,b))result.aviso='La exención ya no está vigente. Consultá a Tesorería.';
  const i=await Intento.findOne({where:{licenciaId:l.id}});if(i){result.cotizacion=i.cotizacion;result.intento={estado:i.estado,vence:i.vence,checkoutDisponible:!!i.checkoutUrl&&new Date(i.vence).getTime()>now()};}
  else try{result.cotizacion=await cotizacion(l,b);}catch(e){result.aviso=e.message;}
  return result;
 }
 async function checkout(id,year){year=temporada(year);permisoCobro(env,id,year);
  const prepared=await transaction(async t=>{const u=await usuario(id,t);if(!documentos(u,fecha()))fail(409,'La cuenta y la documentación deben estar aprobadas y vigentes antes de pagar.');
   const l=await Licencia.findOne({where:{usuarioId:id,temporada:year},transaction:t,lock:t.LOCK.UPDATE});if(!l)fail(409,'Primero solicitá tu licencia.');
   if(['conciliada','requiere_revision','pago_duplicado'].includes(l.estado))fail(409,'La licencia ya está pagada o requiere revisión; no se creará otro cobro.');
   const b=await beca(id,year,t);if(exentaVigente(l,b))return{exenta:true};
   const existing=await Intento.findOne({where:{licenciaId:l.id},transaction:t});if(existing)return{existing};
   const q=await cotizacion(l,b,t);
   if(q.exento){await l.update({estado:'exenta',exencion:q,revision:l.revision+1},{transaction:t});await audit(l,id,'exencion_aplicada',q,t);return{exenta:true};}
   provider.config();
   const verified=await provider.verificar();if(!verified.connected)fail(503,'No se verificó la cuenta receptora.'); // Todavía no se reservó ni se creó un cobro.
   // Una cotización dura como máximo hasta el cierre del día argentino (descuentos).
   const vence=new Date(Math.min(now()+3600000,Date.parse(fecha()+'T23:59:59-03:00')));
   if(vence.getTime()-now()<60000)fail(409,'El día está por finalizar. Volvé a cotizar en un minuto.');
   const i=await Intento.create({id:randomUUID(),licenciaId:l.id,cotizacion:q,estado:'creando',vence},{transaction:t});
   await l.update({estado:'pendiente',revision:l.revision+1},{transaction:t});await audit(l,id,'checkout_reservado',{intentoId:i.id,cotizacion:q},t);return{nuevo:i};
  });
  if(prepared.exenta)return{exenta:true,mensaje:'Licencia habilitada por exención. No se generó un pago.'};
  if(prepared.existing){const i=prepared.existing;if(!i.checkoutUrl||!i.preferenceId)fail(409,'La creación no fue confirmada. Comprobá el estado y contactá a Tesorería; no se duplicó el cobro.');
   if(new Date(i.vence).getTime()<=now()){
    await comprobar(id,year);
    await transaction(async t=>{await usuario(id,t);const l=await Licencia.findByPk(i.licenciaId,{transaction:t,lock:t.LOCK.UPDATE});
     if(!['pendiente','sin_pago_aprobado'].includes(l.estado))fail(409,'Hay un pago o una revisión en curso. No se renueva el checkout.');
     const q=await cotizacion(l,await beca(id,year,t),t);
     if(['totalCentavos','beneficioCentavos','descuentoCentavos','importeArancelCentavos','porcentaje'].some(k=>q[k]!==i.cotizacion[k]))fail(409,'El arancel o beneficio cambió desde el checkout anterior. Tesorería debe revisar el intento antes de reemplazarlo.');
     const vence=new Date(Math.min(now()+3600000,Date.parse(fecha()+'T23:59:59-03:00')));if(vence.getTime()-now()<60000)fail(409,'Volvé a intentar al comenzar el nuevo día.');
     await provider.renovar(i.preferenceId,vence);await i.update({vence},{transaction:t});await audit(l,id,'checkout_renovado',{intentoId:i.id,vence:vence.toISOString()},t);
    });
   }return{url:i.checkoutUrl};}
  const i=prepared.nuevo;
  try{const p=await provider.crear(i,year);await i.update({preferenceId:p.id,checkoutUrl:p.url,estado:'pendiente'});return{url:p.url};}
  catch(e){await i.update({estado:'requiere_revision'});throw e;}
 }
 async function conciliar(payment,webhook=false,ownerId=null){
  if(typeof payment?.external_reference!=='string')fail(400,'Referencia inválida.');
  const i=await Intento.findByPk(payment.external_reference);if(!i)return{ignorado:true};
  const found=await Licencia.findByPk(i.licenciaId);if(!found)fail(409,'Licencia no encontrada.');if(ownerId!==null&&found.usuarioId!==ownerId)fail(403,'Pago ajeno.');
  const cfg=provider.config();let op;try{op={...R.validarPago(payment,{...i.cotizacion,externalReference:i.id},cfg)};}catch{fail(409,'El pago no coincide con receptor, ambiente, moneda, importe o referencia.');}
  if(op.aprobado&&(!payment.date_approved||!Number.isFinite(Date.parse(payment.date_approved))))fail(409,'Falta una fecha de aprobación válida en el pago.');
  op.fechaAprobacion=payment.date_approved||null;op.importeCentavos=i.cotizacion.totalCentavos;
  return transaction(async t=>{await usuario(found.usuarioId,t);const l=await Licencia.findByPk(found.id,{transaction:t,lock:t.LOCK.UPDATE});const old=await Operacion.findByPk(op.paymentId,{transaction:t,lock:t.LOCK.UPDATE});
   if(old&&(old.licenciaId!==l.id||old.intentoId!==i.id))fail(409,'El pago pertenece a otra licencia.');
   if(old&&old.datos.actualizado>op.actualizado)return{estado:l.estado};
   if(old&&old.datos.actualizado===op.actualizado&&(old.datos.estado!==op.estado||old.datos.reintegradoCentavos!==op.reintegradoCentavos))fail(409,'Mercado Pago devolvió versiones contradictorias.');
   if(old)await old.update({datos:op,webhook:old.webhook||webhook},{transaction:t});else await Operacion.create({paymentId:op.paymentId,licenciaId:l.id,intentoId:i.id,datos:op,webhook},{transaction:t});
   const all=await Operacion.findAll({where:{licenciaId:l.id},transaction:t});const estado=R.resolverOperaciones(all.map(o=>o.datos));const mapped=estado==='conciliado'?'conciliada':estado;
   if(l.estado!==mapped){await l.update({estado:mapped,revision:l.revision+1},{transaction:t});await audit(l,null,'conciliacion',{paymentId:op.paymentId,estado:mapped},t);}
   return{estado:mapped};
  });
 }
 async function comprobar(id,year){const l=await Licencia.findOne({where:{usuarioId:id,temporada:temporada(year)}});if(!l)fail(404,'No hay licencia solicitada.');const i=await Intento.findOne({where:{licenciaId:l.id}});if(!i)return detalle(id,year);
  const payments=await provider.buscar(i.id);for(const p of payments){if(p.external_reference!==i.id)fail(502,'La búsqueda devolvió otra referencia.');await conciliar(await provider.pago(String(p.id)),false,id);}return detalle(id,year);
 }
 return{solicitar,asignar,detalle,checkout,conciliar,comprobar};
}
module.exports={service,temporada,documentos,permisoCobro,exentaVigente};
