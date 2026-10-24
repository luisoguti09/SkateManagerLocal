'use strict';
const {Op,fn,col}=require('sequelize');
const Asistencia=require('../models/asistencias.model');
const Usuario=require('../models/usuario.model');
const Evento=require('../models/evento.model');
const Club=require('../models/club.model');
function fail(status,message){throw Object.assign(new Error(message),{status});}
function entero(value,def,max=2147483647){
  if(value===undefined)return def;
  if(!/^\d+$/.test(String(value)))fail(400,'Filtro inválido.');
  const n=Number(value);if(!Number.isSafeInteger(n)||n<1||n>max)fail(400,'Filtro inválido.');return n;
}
async function alcance(cuenta){
  if(!['administrador','juez','tecnico'].includes(cuenta.rol))fail(403,'No tenés permiso.');
  if(cuenta.rol!=='tecnico')return {};
  if(!cuenta.club||!await Club.findOne({where:{nombre:cuenta.club,activo:true}}))fail(403,'La Federación debe asignarte un club activo.');
  return {club:cuenta.club,rol:'deportista',estado:'aprobado'};
}
async function resumen(cuenta){
  const where=await alcance(cuenta);
  const rows=await Asistencia.findAll({
    attributes:['eventoId',[fn('COUNT',fn('DISTINCT',col('Asistencia.usuarioId'))),'presentes']],
    include:[{model:Usuario,as:'Usuario',attributes:[],where,required:true},{model:Evento,attributes:['id','nombre','titulo','lugar','fechaInicio','fechaFin'],required:true}],
    group:['Asistencia.eventoId','Evento.id','Evento.nombre','Evento.titulo','Evento.lugar','Evento.fechaInicio','Evento.fechaFin'],
    order:[[Evento,'fechaInicio','DESC'],['eventoId','DESC']],limit:501
  });
  return {club:cuenta.rol==='tecnico'?cuenta.club:null,limitado:rows.length>500,eventos:rows.slice(0,500).map(r=>{
    const p=r.toJSON();return {...p.Evento,titulo:p.Evento.titulo||p.Evento.nombre,presentes:Number(p.presentes)};
  })};
}
async function detalle(cuenta,id,query={}){
  const eventoId=entero(id),pagina=entero(query.pagina,1,1000000),limite=50;
  const where=await alcance(cuenta);
  const texto=String(query.buscar||'').trim();if(texto.length>100)fail(400,'La búsqueda es demasiado larga.');
  // Se conservan literalmente %, _ y la barra para evitar comodines involuntarios.
  if(texto){const like='%'+texto.replace(/[\\%_]/g,'\\$&')+'%';where[Op.or]=[{nombre:{[Op.like]:like}},{dni:{[Op.like]:like}},...(cuenta.rol==='tecnico'?[]:[{club:{[Op.like]:like}}])];}
  const result=await Asistencia.findAndCountAll({where:{eventoId},attributes:['id','usuarioId','eventoId','checkedAt'],
    include:[{model:Usuario,as:'Usuario',attributes:['id','nombre','dni','club'],where,required:true}],
    order:[['checkedAt','DESC'],['id','DESC']],limit:limite,offset:(pagina-1)*limite,distinct:true});
  return {filas:result.rows,total:result.count,pagina,limite};
}
module.exports={resumen,detalle,alcance,entero};
