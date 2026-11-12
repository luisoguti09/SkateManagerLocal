'use strict';
const inicial = Object.freeze({temporada:2027,criterio:'solicitud_nacional',accesoProvisional:true,tramos:[
 {desde:'2026-11-05',hasta:'2026-11-24',importe:115000,vencimiento:'2026-12-10'},
 {desde:'2026-11-25',hasta:'2026-12-25',importe:130000,vencimiento:'2027-01-10'}
]});
function fecha(s){return typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
function validar(c){
 if(!c||(!Number.isInteger(c.temporada)||c.temporada<2020||c.temporada>2100)||c.criterio!=='solicitud_nacional'||typeof c.accesoProvisional!=='boolean'||!Array.isArray(c.tramos)||!c.tramos.length||c.tramos.length>20)throw new Error('Propuesta inválida.');
 const tramos=c.tramos.map((t,i)=>{
  if(!t||![t.desde,t.hasta,t.vencimiento].every(fecha)||t.desde>t.hasta||t.vencimiento<t.hasta||!Number.isSafeInteger(t.importe)||t.importe<=0||t.importe>100000000)throw new Error('Revisá fechas e importe de cada periodo.');
  const descuento=t.descuento||{activo:false,porcentaje:0,desde:'',hasta:''};
  if(typeof descuento.activo!=='boolean')throw new Error('Descuento inválido.');
  if(descuento.activo && (!Number.isInteger(descuento.porcentaje)||descuento.porcentaje<=0||descuento.porcentaje>=100||![descuento.desde,descuento.hasta].every(fecha)||descuento.desde>descuento.hasta||descuento.hasta>t.vencimiento))throw new Error('Revisá porcentaje y fechas del descuento. Debe finalizar a más tardar al vencimiento de pago.');
  const nombre=t.nombre===undefined?`Periodo ${i+1}`:String(t.nombre).trim();
  if(!nombre||nombre.length>80)throw new Error('El nombre del periodo debe tener entre 1 y 80 caracteres.');
  return {nombre,desde:t.desde,hasta:t.hasta,importe:t.importe,vencimiento:t.vencimiento,descuento:descuento.activo?{activo:true,porcentaje:descuento.porcentaje,desde:descuento.desde,hasta:descuento.hasta}:{activo:false,porcentaje:0,desde:'',hasta:''}};
 }).sort((a,b)=>a.desde.localeCompare(b.desde));
 for(let i=1;i<tramos.length;i++)if(tramos[i].desde<=tramos[i-1].hasta)throw new Error('Los periodos no pueden superponerse.');
 if(c.correoTesoreria!==undefined&&typeof c.correoTesoreria!=='boolean')throw new Error('Preferencia de correo inválida.');
 const avisoDias=c.avisoDias??7;if(!Number.isInteger(avisoDias)||avisoDias<0||avisoDias>90)throw new Error('El aviso debe ser entre 0 y 90 días antes.');
 return {temporada:c.temporada,criterio:'solicitud_nacional',accesoProvisional:c.accesoProvisional,avisoDias:7,correoTesoreria:true,tramos};
}
function asignar(c,fechaNacional){
 const config=validar(c);if(!fecha(fechaNacional))throw new Error('Fecha nacional inválida.');
 const t=config.tramos.find(t=>fechaNacional>=t.desde&&fechaNacional<=t.hasta);
 if(!t)throw new Error('La solicitud está fuera de los tramos configurados. Requiere revisión de Tesorería.');
 return {...t,fechaNacional,importeCentavos:t.importe*100};
}
function acceso({aprobada,documentacionAprobada,vigente,solicitud,pagado,hoy,provisional}){
 if(aprobada!==true||documentacionAprobada!==true||vigente!==true)return 'documentacion_pendiente';
 if(!solicitud||!fecha(solicitud.vencimiento)||!fecha(hoy))return 'solicitud_pendiente';
 if(pagado===true)return 'habilitada';
 if(provisional===true&&hoy<=solicitud.vencimiento)return 'provisional';
 return 'pago_requerido';
}
function ajuste(importeOriginalCentavos,importeRevisadoCentavos){
 if(![importeOriginalCentavos,importeRevisadoCentavos].every(n=>Number.isSafeInteger(n)&&n>=0))throw new Error('Importe inválido.');
 return {diferenciaCentavos:importeRevisadoCentavos-importeOriginalCentavos,requiereRevision:importeRevisadoCentavos<importeOriginalCentavos};
}
function hoyArgentina(){return new Date(Date.now()-3*3600000).toISOString().slice(0,10);}
function alertas(c,hoy=hoyArgentina()){
 const config=validar(c);if(!fecha(hoy))throw new Error('Fecha inválida.');
 const avisos=[];
 config.tramos.forEach((t,i)=>{
  for(const [tipo,limite] of [['solicitud nacional',t.hasta],['pago',t.vencimiento],...(t.descuento.activo?[['descuento',t.descuento.hasta]]:[])]){
   const dias=Math.round((Date.parse(limite+'T12:00:00Z')-Date.parse(hoy+'T12:00:00Z'))/86400000);
   if(dias<=config.avisoDias)avisos.push({tramo:i+1,nombre:t.nombre,tipo,fecha:limite,estado:dias<0?'vencido':dias===0?'vence_hoy':'por_vencer',dias});
  }
 });return avisos;
}
// Cotización de propuesta; todavía no conectada al checkout. Nunca cambia el importe base guardado.
function cotizar(c,fechaNacional,fechaPago){
 if(!fecha(fechaPago))throw new Error('Fecha de pago inválida.');
 const t=asignar(c,fechaNacional),d=t.descuento;
 const porcentaje=d.activo&&fechaPago>=d.desde&&fechaPago<=d.hasta?d.porcentaje:0;
 const descuentoCentavos=Math.round(t.importeCentavos*porcentaje/100);
 return {...t,porcentajeDescuento:porcentaje,descuentoCentavos,totalCentavos:t.importeCentavos-descuentoCentavos};
}
module.exports={inicial,validar,asignar,acceso,ajuste,alertas,cotizar,hoyArgentina};
