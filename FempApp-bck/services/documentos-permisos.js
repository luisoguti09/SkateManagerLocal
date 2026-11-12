'use strict';
const {fail}=require('./cuenta-reglas');
const identidad=['dniFrente','dniDorso'];
function autorizarIdentidad(u,files,inicial=false){
 for(const k of identidad)if(files?.[k]?.length && !inicial && !(u.camposCorregir||[]).includes(k))fail(403,'Administración debe autorizar la corrección de '+(k==='dniFrente'?'DNI frente':'DNI dorso')+'.');
}
function observaciones(u,campos){
 const permitidos=require('./cuenta-documentos').politica(u).visibles;
 if(!Array.isArray(campos)||!campos.length||campos.some(k=>!permitidos.includes(k)))fail(400,'Seleccioná los documentos que deben corregirse.');
 return [...new Set(campos)];
}
module.exports={identidad,autorizarIdentidad,observaciones};
