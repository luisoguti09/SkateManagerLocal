'use strict';
// Valida estructura y dígito verificador. No acredita titularidad ante ANSES.
function normalizarCuil(value) {
 if(typeof value!=='string' || !/^[0-9 -]+$/.test(value))return null;
 const s=value.replace(/[ -]/g,'');
 if(!/^\d{11}$/.test(s) || /^0+$/.test(s))return null;
 const pesos=[5,4,3,2,7,6,5,4,3,2];
 const resto=11-pesos.reduce((sum,p,i)=>sum+p*Number(s[i]),0)%11;
 const digito=resto===11?0:resto===10?9:resto;
 return digito===Number(s[10])?s:null;
}
function exigirCuil(value){
 const cuil=normalizarCuil(value);
 if(!cuil){const e=new Error('Ingresá el CUIL de la deportista: 11 dígitos válidos. Consultalo en su constancia de ANSES.');e.status=400;throw e;}
 return cuil;
}
module.exports={normalizarCuil,exigirCuil};
