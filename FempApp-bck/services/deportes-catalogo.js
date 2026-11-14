'use strict';
const fijo=require('./deportes');
const {fail}=require('./cuenta-reglas');
const fijos=[{nombre:fijo.ARTISTICO,activo:true,fijo:true,revision:0,disciplinas:[]},{nombre:fijo.FREESTYLE,activo:true,fijo:false,revision:0,disciplinas:fijo.disciplinas.map(nombre=>({nombre,categorias:fijo.categorias}))}];
function validarDatos(data){
 const nombre=typeof data.nombre==='string'?data.nombre.trim().normalize('NFC').toLocaleUpperCase('es-AR'):'';
 if(!nombre||nombre.length>80||/[\x00-\x1f<>]/.test(nombre)||nombre===fijo.ARTISTICO)fail(400,'Nombre de deporte inválido o reservado.');
 if(typeof data.activo!=='boolean'||!Array.isArray(data.disciplinas)||!data.disciplinas.length||data.disciplinas.length>40)fail(400,'Indicá al menos una disciplina y el estado del deporte.');
 const lista=(values,max)=>{
  if(!Array.isArray(values)||values.length>max)fail(400,'Listado inválido.');
  const result=values.map(v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>80||/[\x00-\x1f<>]/.test(v))fail(400,'Revisá los nombres del catálogo.');return v.trim().normalize('NFC');});
  if(new Set(result.map(v=>v.toLocaleLowerCase())).size!==result.length)fail(400,'No repitas nombres.');return result;
 };
 const nombres=lista(data.disciplinas.map(d=>d?.nombre),40);
 const fuente=typeof data.fuente==='string'?data.fuente.trim():'';if(fuente.length>1000)fail(400,'La fuente no debe superar 1000 caracteres.');
 return {nombre,activo:data.activo,fuente,disciplinas:data.disciplinas.map((d,i)=>({nombre:nombres[i],categorias:lista(d.categorias,100)}))};
}
function service({Catalogo,Historial}){
 async function todos(){const rows=(await Catalogo.findAll({order:[['nombre','ASC']]})).map(r=>({...r.toJSON(),fijo:false}));return [...fijos.filter(f=>!rows.some(r=>r.nombre===f.nombre)),...rows];}
 async function buscar(nombre){if(typeof nombre!=='string'||!nombre.trim()||nombre.length>80)return undefined;if(nombre===fijo.ARTISTICO)return fijos[0];return (await Catalogo.findByPk(nombre))?.toJSON()||fijos.find(x=>x.nombre===nombre);}
 async function registro(nombre){const d=await buscar(nombre);if(!d?.activo)fail(400,'Elegí un deporte habilitado.');return d;}
 async function perfil(p){
  if(!p.deporte||p.deporte===fijo.ARTISTICO)return fijo.validar(p);
  const d=await registro(p.deporte),disc=d.disciplinas.find(x=>x.nombre===p.disciplina);
  if(!disc)fail(400,'Elegí una disciplina habilitada para este deporte.');
  if(disc.categorias.length?!disc.categorias.includes(p.categoria):!!p.categoria)fail(400,'Elegí una categoría del catálogo de esta disciplina.');
  if(p.divisional||p.modalidad||p.licencia||(p.origenCategoria&&p.origenCategoria!=='CAP'))fail(400,'Este deporte no utiliza las divisionales de Artístico.');
  if(!/^(20|21)\d{2}$/.test(String(p.temporada)))fail(400,'Temporada inválida.');
  return d.nombre;
 }
 async function guardar(body,actorId){
  const data=validarDatos(body);
  if(typeof body.motivo!=='string'||body.motivo.trim().length<5||body.motivo.length>500)fail(400,'Indicá el motivo del cambio.');
  if(!Number.isInteger(body.revision)||body.revision<0)fail(400,'Revisión inválida.');
  await Catalogo.sequelize.transaction(async transaction=>{
   const options={transaction,lock:transaction.LOCK.UPDATE};let row=await Catalogo.findByPk(data.nombre,options);
   if(row && row.revision!==body.revision || !row && body.revision!==0)fail(409,'El catálogo cambió. Actualizá antes de guardar.');
   const antes=row?.toJSON()||null,despues={...data,revision:(row?.revision||0)+1};
   if(row)await row.update(despues,{transaction});else row=await Catalogo.create(despues,{transaction});
   await Historial.create({deporte:data.nombre,actorId,antes,despues,motivo:body.motivo.trim()},{transaction});
  });return buscar(data.nombre);
 }
 return {todos,buscar,registro,perfil,guardar};
}
let instance;
function current(){return instance||(instance=service(require('../models/deportecatalogo.model')));}
function production(){return {
 todos:(...a)=>current().todos(...a),buscar:(...a)=>current().buscar(...a),guardar:(...a)=>current().guardar(...a),
 registro:async nombre=>{if(typeof nombre!=='string'||!nombre.trim()||nombre.length>80)fail(400,'Elegí un deporte habilitado.');return nombre===fijo.ARTISTICO?fijos[0]:current().registro(nombre);},
 perfil:async p=>(!p.deporte||p.deporte===fijo.ARTISTICO)?fijo.validar(p):current().perfil(p)
};}

module.exports={service,production,validarDatos,fijos};
