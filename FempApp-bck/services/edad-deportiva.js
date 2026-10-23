'use strict';
// La temporada es explícita: nunca se reemplaza por el año del reloj.
function temporadaValida(valor) {
  if (!/^[0-9]{4}$/.test(String(valor))) throw new Error('Temporada inválida.');
  const temporada=Number(valor);
  if(temporada<2000 || temporada>2200)throw new Error('Temporada inválida.');
  return temporada;
}
function edadDeportiva(fechaNacimiento, temporada) {
  const year=temporadaValida(temporada);
  if(typeof fechaNacimiento!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento))throw new Error('Completá una fecha de nacimiento válida.');
  const [y,m,d]=fechaNacimiento.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y || date.getUTCMonth()!==m-1 || date.getUTCDate()!==d || year<y || year-y>120)throw new Error('Fecha de nacimiento inválida para la temporada.');
  return year-y;
}
function perfilWS(perfil,temporada) {
  if(!(perfil.activa===true || perfil.activa===1) || String(perfil.temporada)!==String(temporada))return false;
  return [perfil.origenCategoria,perfil.divisional,perfil.licencia].some(v=>/(^|[^A-Z])WS([^A-Z]|$)|WORLD\s*SKATE/i.test(String(v||'')));
}
function requisitoWada(usuario,perfiles,temporada) {
  const year=temporadaValida(temporada);
  if(usuario.rol!=='deportista')return {temporada:year,obligatorio:false,motivo:'rol_exento'};
  const ws=perfiles.some(p=>Number(p.usuarioId)===Number(usuario.id) && perfilWS(p,year));
  let edad;
  try{edad=edadDeportiva(usuario.fechaNacimiento,year);}catch{
    return {temporada:year,edadDeportiva:null,obligatorio:ws?true:null,motivo:ws?'perfil_ws':'falta_fecha_nacimiento'};
  }
  return {temporada:year,edadDeportiva:edad,obligatorio:ws || edad>=16,motivo:ws?'perfil_ws':edad>=16?'edad_deportiva':'no_requerido'};
}
module.exports={temporadaValida,edadDeportiva,perfilWS,requisitoWada};
