'use strict';
const V=require('./documentos-vigencia');
function validar(u,data,prepared={}){
 const campo='certificadoAntecedentesFecha',nueva=!!prepared.certificadoAntecedentes,enviada=Object.hasOwn(data,campo);
 const fail=m=>{const e=new Error(m);e.status=400;throw e;};
 if(!nueva&&!enviada)return;
 if(u.rol!=='tecnico')fail('El certificado de antecedentes corresponde a técnicas.');
 if(!enviada||!V.fechaValida(data[campo])||data[campo]>V.hoyArgentina())fail('Ingresá una fecha de expedición válida, no futura, del certificado de antecedentes.');
 if(!nueva&&!u.certificadoAntecedentes)fail('Cargá el certificado correspondiente a esa fecha.');
}
module.exports={validar};
