const {dniRequerido}=require('../config/archivos');
function edadCumplida(fecha,hoy=new Date().toISOString().slice(0,10)){
 if(typeof fecha!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha))return null;
 const parsed=new Date(fecha+'T12:00:00Z');
 if(!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==fecha || fecha>hoy)return null;
 return Number(hoy.slice(0,4))-Number(fecha.slice(0,4))-(hoy.slice(5)<fecha.slice(5)?1:0);
}
function politica(u){
 const visibles=u.rol==='deportista'?['fotoPerfil','dniFrente','dniDorso','fichaMedica']:['fotoPerfil'];
 const obligatorios=u.rol==='tesoreria'?[]:['fotoPerfil'];
 if(u.rol==='deportista' && dniRequerido())obligatorios.push('dniFrente','dniDorso');
 if(u.rol==='tecnico'){visibles.push('certificadoAntecedentes');if(edadCumplida(u.fechaNacimiento)>=16)obligatorios.push('certificadoAntecedentes');}
 return {visibles,obligatorios};
}
function validarArchivos(u,files){
 const permitidos=politica(u).visibles;
 for(const [k,v] of Object.entries(files || {}))if(v?.length && !permitidos.includes(k)){
  const e=new Error('Ese documento no corresponde al rol de esta cuenta.');e.status=400;throw e;
 }
}
module.exports={politica,validarArchivos,edadCumplida};
