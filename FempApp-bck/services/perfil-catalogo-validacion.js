'use strict';
const K=require('./perfil-catalogo');
function validar(p){
 if(p.deporte==='ROLLER FREESTYLE'){require('./deportes').validar(p);return p;}
 const fail=msg=>{const e=new Error(msg);e.status=400;throw e;};
 if(!K.DISCIPLINAS.includes(p.disciplina))fail('Seleccioná una disciplina del catálogo.');
 if(!['CAP','PROMOS_FEMPA'].includes(p.origenCategoria))fail('Seleccioná un origen habilitado.');
 if(!K.LICENCIAS.includes(p.licencia))fail('Seleccioná una licencia del catálogo.');
 const modalidades=p.disciplina==='Danza'?['Individual','Parejas']:K.MODALIDADES;
 if(!modalidades.includes(p.modalidad))fail('Seleccioná una modalidad del catálogo.');
 const divisionales=p.origenCategoria==='PROMOS_FEMPA'?(p.disciplina==='Libre'?['Promos FEMPA']:[]):p.disciplina==='Danza'?Object.keys(K.CATEGORIAS_DANZA_2026):K.DIVISIONALES;
 if(!divisionales.includes(p.divisional))fail('Divisional incompatible con la disciplina y el origen.');
 const categorias=K.categoriasPerfil(p.disciplina,p.origenCategoria,p.divisional);
 if(!categorias.length)fail('Esta combinación todavía no tiene categorías normalizadas. Solicitá su revisión a Administración.');
 if(!categorias.includes(p.categoria))fail('Seleccioná una categoría del catálogo correspondiente.');
 if(!/^(20|21)\d{2}$/.test(String(p.temporada)))fail('Temporada inválida.');
 return p;
}
module.exports={validar};
