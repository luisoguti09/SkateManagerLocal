const {dniRequerido}=require('../config/archivos');
function politica(u){
 const visibles=u.rol==='deportista'?['fotoPerfil','dniFrente','dniDorso','fichaMedica']:['fotoPerfil'];
 const obligatorios=u.rol==='tesoreria'?[]:['fotoPerfil'];
 if(u.rol==='deportista' && dniRequerido())obligatorios.push('dniFrente','dniDorso');
 return {visibles,obligatorios};
}
function validarArchivos(u,files){
 const permitidos=politica(u).visibles;
 for(const [k,v] of Object.entries(files || {}))if(v?.length && !permitidos.includes(k)){
  const e=new Error('Ese documento no corresponde al rol de esta cuenta.');e.status=400;throw e;
 }
}
module.exports={politica,validarArchivos};
