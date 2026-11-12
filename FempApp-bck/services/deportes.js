'use strict';
const ARTISTICO='PATINAJE ARTÍSTICO',FREESTYLE='ROLLER FREESTYLE';
const deportes=[ARTISTICO,FREESTYLE];
const disciplinas=['STREET','PARK (BOWL)'];
const categorias=['PRO FEMENINO','PRO MASCULINO','JUNIOR FEMENINO','JUNIOR MASCULINO'];
function validar(p){
 const fail=m=>{const e=new Error(m);e.status=400;throw e;};
 const deporte=p.deporte||ARTISTICO;
 if(!deportes.includes(deporte))fail('Elegí un deporte habilitado.');
 if(deporte===FREESTYLE){
  if(!disciplinas.includes(p.disciplina)||!categorias.includes(p.categoria))fail('Elegí disciplina y categoría de Roller Freestyle.');
  if(p.divisional || p.modalidad || p.licencia || (p.origenCategoria && p.origenCategoria!=='CAP'))fail('Roller Freestyle no utiliza las divisionales, modalidades ni licencias declarativas de Artístico.');
  if(!/^(20|21)\d{2}$/.test(String(p.temporada)))fail('Temporada inválida.');
 }else if(!require('./perfil-catalogo').DISCIPLINAS.includes(p.disciplina))fail('La disciplina no corresponde a Patinaje Artístico.');
 return deporte;
}
module.exports={ARTISTICO,FREESTYLE,deportes,disciplinas,categorias,validar};
