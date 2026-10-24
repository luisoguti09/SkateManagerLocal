'use strict';
const campos={fichaMedica:{fecha:'fichaMedicaFecha',meses:12,label:'Ficha médica'},certificadoWada:{fecha:'wadaFecha',meses:24,label:'Certificado WADA'}};
function hoyArgentina(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
function fechaValida(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value&&Number(value.slice(0,4))>=1900;
}
function vencer(fecha,meses){
 if(!fechaValida(fecha))throw new Error('Fecha inválida.');
 const [y,m,d]=fecha.split('-').map(Number),ultimo=new Date(Date.UTC(y,m-1+meses+1,0)).getUTCDate();
 return new Date(Date.UTC(y,m-1+meses,Math.min(d,ultimo))).toISOString().slice(0,10);
}
function resumen(u,hoy=hoyArgentina()){
 return Object.entries(campos).map(([campo,c])=>{
  const expedicion=u[c.fecha]||null,vence=u[campo]&&fechaValida(expedicion)?vencer(expedicion,c.meses):null;
  const dias=vence?Math.round((Date.parse(vence+'T12:00:00Z')-Date.parse(hoy+'T12:00:00Z'))/86400000):null;
  return {campo,label:c.label,expedicion,vence,dias,estado:!u[campo]?'Sin documento':!vence?'Fecha pendiente':dias<0?'Vencido':dias===0?'Vence hoy':dias<=30?'Por vencer':'Vigente'};
 });
}
function validar(u,data,prepared={},hoy=hoyArgentina()){
 const fail=m=>{const e=new Error(m);e.status=400;throw e;};
 for(const [campo,c] of Object.entries(campos)){
  const enviada=Object.hasOwn(data,c.fecha);
  if(u.rol!=='deportista'&&(enviada||prepared[campo]))fail('Esta documentación corresponde a deportistas.');
  if(!enviada&&!prepared[campo])continue;
  const fecha=enviada?data[c.fecha]:u[c.fecha];
  if(!fechaValida(fecha)||fecha>hoy)fail('Ingresá una fecha de expedición válida, no futura, para '+c.label+'.');
  if(!prepared[campo]&&!u[campo])fail('Cargá el documento correspondiente a '+c.label+'.');
  // Un archivo nuevo necesita declarar su propia fecha: nunca hereda la del anterior.
  if(prepared[campo]&&!enviada)fail('Ingresá la fecha de expedición de '+c.label+'.');
 }
}
module.exports={campos,hoyArgentina,fechaValida,vencer,resumen,validar};
