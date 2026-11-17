'use strict';
const {fail}=require('../cuenta-reglas');
function validar(body){
 if(!Number.isSafeInteger(body.usuarioId)||body.usuarioId<=0||!Number.isInteger(body.temporada)||body.temporada<2020||body.temporada>2100)fail(400,'Deportista o temporada inválida.');
 const inscripciones=body.porcentajeInscripciones??0;
 if(![body.porcentaje,inscripciones].every(n=>Number.isInteger(n)&&n>=0&&n<=100)||typeof body.activa!=='boolean'||body.alcance!=='licencia_anual')fail(400,'Los porcentajes deben estar entre 0 y 100. Cero significa sin beneficio.');
 if(body.activa&&body.porcentaje===0&&inscripciones===0)fail(400,'Seleccioná al menos un beneficio o desactivá la asignación.');
 const eventos=body.eventos??[];
 if(!Array.isArray(eventos)||eventos.length>100||eventos.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(eventos).size!==eventos.length)fail(400,'Revisá los eventos seleccionados.');
 const todosEventos=body.todosEventos??false;
 if(typeof todosEventos!=='boolean'||todosEventos&&eventos.length||inscripciones>0&&!todosEventos&&!eventos.length)fail(400,'Indicá todas las inscripciones de la temporada o seleccioná eventos.');
 if(!Number.isInteger(body.revision)||body.revision<0)fail(400,'Revisión inválida.');
 if(typeof body.motivo!=='string'||body.motivo.trim().length<5||body.motivo.length>500)fail(400,'Indicá el motivo (5 a 500 caracteres).');
 return {usuarioId:body.usuarioId,temporada:body.temporada,porcentaje:body.porcentaje,activa:body.activa,alcance:'licencia_anual',porcentajeInscripciones:inscripciones,todosEventos,eventos};
}
// Aplicar sobre el importe ya cotizado; la beca no crea registros de pago.
function aplicar(totalCentavos,beca,usuarioId,temporada,contexto={tipo:'licencia_anual'}){
 if(!Number.isSafeInteger(totalCentavos)||totalCentavos<0)fail(400,'Importe inválido.');
 if(!contexto||!['licencia_anual','inscripcion'].includes(contexto.tipo))fail(400,'Concepto de cobro inválido.');
 if(contexto.tipo==='inscripcion'&&(!Number.isSafeInteger(contexto.eventoId)||contexto.eventoId<=0))fail(400,'Evento inválido.');
 const sinBeneficio={baseCentavos:totalCentavos,beneficioCentavos:0,totalCentavos,porcentaje:0,exento:false,becaId:null,revisionBeca:null};
 if(!beca||!beca.activa)return sinBeneficio;
 if(beca.usuarioId!==usuarioId||beca.temporada!==temporada||beca.alcance!=='licencia_anual')fail(409,'El beneficio no corresponde a esta persona o temporada.');
 let porcentaje=beca.porcentaje;
 if(contexto.tipo==='inscripcion'){
  porcentaje=beca.porcentajeInscripciones??0;
  if(!beca.todosEventos&&!(beca.eventos||[]).includes(contexto.eventoId))return sinBeneficio;
 }
 if(!Number.isInteger(porcentaje)||porcentaje<0||porcentaje>100)fail(409,'Porcentaje inválido.');
 if(!porcentaje)return sinBeneficio;
 const beneficioCentavos=Number((BigInt(totalCentavos)*BigInt(porcentaje)+50n)/100n);
 return{baseCentavos:totalCentavos,beneficioCentavos,totalCentavos:totalCentavos-beneficioCentavos,porcentaje,exento:porcentaje===100,becaId:beca.id,revisionBeca:beca.revision};
}
function service({Beca,Historial,Usuario}){
 async function guardar(body,actorId){
  const data=validar(body);
  return Beca.sequelize.transaction(async transaction=>{
   // Lock the user even on first assignment, so concurrent inserts serialize.
   const user=await Usuario.findByPk(data.usuarioId,{transaction,lock:transaction.LOCK.UPDATE});
   if(!user||!['deportista','delegado','tecnico'].includes(user.rol))fail(404,'Cuenta no encontrada.');
   const row=await Beca.findOne({where:{usuarioId:data.usuarioId,temporada:data.temporada},transaction,lock:transaction.LOCK.UPDATE});
   if((row?.revision||0)!==body.revision)fail(409,'El beneficio cambió. Actualizá antes de guardar.');
   const antes=row?.toJSON()||null,despues={...data,revision:(row?.revision||0)+1};
   const saved=row?await row.update(despues,{transaction}):await Beca.create(despues,{transaction});
   await Historial.create({becaId:saved.id,actorId,antes,despues,motivo:body.motivo.trim()},{transaction});
   return saved;
  });
 }
 return {guardar};
}
module.exports={validar,aplicar,service};
