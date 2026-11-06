'use strict';
const router=require('express').Router();
const {verifyToken,requireRole}=require('../middleware/auth.middleware');
const {Config,Audit}=require('../models/licenciaconfiguracion.model');
const P=require('../services/licencias/propuesta');
const {wrap}=require('../services/cuenta');
router.use(verifyToken,requireRole('tesoreria','administrador'));
router.use((req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
function temporada(req){const n=Number(req.query.temporada??2027);if(!Number.isInteger(n)||n<2020||n>2100){const e=new Error('Temporada inválida.');e.status=400;throw e;}return n;}
router.get('/temporadas',wrap(async(req,res)=>res.json((await Config.findAll({attributes:['id'],order:[['id','DESC']]})).map(r=>r.id))));
router.get('/',wrap(async(req,res)=>{
 const year=temporada(req),row=await Config.findByPk(year);
 const datos=row?P.validar(row.datos):year===2027?P.validar(P.inicial):{temporada:year,criterio:'solicitud_nacional',accesoProvisional:true,avisoDias:7,correoTesoreria:false,tramos:[]};
 res.json({revision:row?.revision??0,datos,avisos:datos.tramos.length?P.alertas(datos):[],estado:'borrador',cobrosHabilitados:false,correoOperativo:process.env.MAIL_ENABLED==='true'});
}));
router.put('/',requireRole('tesoreria'),wrap(async(req,res)=>{
 const year=temporada(req);let datos;try{datos=P.validar(req.body.datos);if(datos.temporada!==year)throw new Error('La temporada no coincide.');}catch(e){return res.status(400).json({error:e.message});}
 if(typeof req.body.motivo!=='string'||req.body.motivo.trim().length<5||req.body.motivo.length>500)return res.status(400).json({error:'Indicá el motivo del cambio (5 a 500 caracteres).'});
 await Config.sequelize.transaction(async t=>{
  let row=await Config.findByPk(year,{transaction:t,lock:t.LOCK.UPDATE});
  if(!row){if(req.body.revision!==0){const e=new Error('Actualizá la temporada antes de guardar.');e.status=409;throw e;}row=await Config.create({id:year,revision:0,datos},{transaction:t});}
  if(!Number.isInteger(req.body.revision)||req.body.revision!==row.revision){const e=new Error('La propuesta cambió. Actualizá antes de guardar.');e.status=409;throw e;}
  const antes=row.datos,revision=row.revision+1;
  await row.update({datos,revision},{transaction:t});
  await Audit.create({actorId:req.auth.id,revision,antes,despues:datos,motivo:req.body.motivo.trim()},{transaction:t});
 });
 res.json({mensaje:'Propuesta guardada con auditoría. Todavía no habilita cobros.'});
}));
router.get('/historial',wrap(async(req,res)=>{const year=temporada(req);res.json((await Audit.findAll({order:[['id','DESC']]})).filter(r=>r.despues?.temporada===year).slice(0,100));}));
function cell(value){let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
function csv(res,nombre,lines){res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="'+nombre+'"'});res.send('\uFEFF'+lines.map(row=>row.map(cell).join(';')).join('\r\n'));}
async function cotejo(req){
 const Usuario=require('../models/usuario.model');
 const todos=await Usuario.findAll({where:{rol:'deportista'},attributes:['id','nombre','dni','club','estado','createdAt'],order:[['id','ASC']]});
 const buscar=String(req.query.buscar||'').trim().toLocaleLowerCase(),club=String(req.query.club||''),estado=String(req.query.estado||'');
 if(estado&&!['pendiente','aprobado','requiere_correcciones','bloqueado'].includes(estado)){const e=new Error('Estado inválido.');e.status=400;throw e;}
 return {clubes:[...new Set(todos.map(u=>u.club).filter(Boolean))].sort(),registros:todos.filter(u=>(!club||u.club===club)&&(!estado||u.estado===estado)&&(!buscar||[u.nombre,u.dni].join(' ').toLocaleLowerCase().includes(buscar))).map(u=>({id:u.id,nombre:u.nombre,dni:u.dni,club:u.club,estado:u.estado,fechaSolicitudNacional:null,estadoPago:null}))};
}
router.get('/cotejo',requireRole('tesoreria'),wrap(async(req,res)=>res.json(await cotejo(req))));
router.get('/cotejo.csv',requireRole('tesoreria'),wrap(async(req,res)=>{
 const {registros}=await cotejo(req);
 csv(res,'cotejo-nacional-2027.csv',[
 ['usuarioId','nombre','dni','club','estadoCuenta','fechaSolicitudNacional','importeProvincialVerificado','observacion'],
 ...registros.map(u=>[u.id,u.nombre,u.dni,u.club,u.estado,'','','Pendiente de cotejo nacional; no acredita pago'])]);
}));
router.get('/aranceles.csv',wrap(async(req,res)=>{
 const year=temporada(req),row=await Config.findByPk(year);if(!row&&year!==2027)return res.status(404).json({error:'Guardá los periodos de esta temporada antes de exportar.'});const c=P.validar(row?.datos||P.inicial);
 csv(res,'aranceles-licencias-'+year+'.csv',[
 ['Temporada','Periodo','Revisión','Solicitud nacional desde','Solicitud nacional hasta','Importe base ARS','Vencimiento pago','Descuento porcentaje','Descuento desde','Descuento hasta','Estado'],
 ...c.tramos.map(t=>[c.temporada,t.nombre,row?.revision??0,t.desde,t.hasta,t.importe,t.vencimiento,t.descuento.activo?t.descuento.porcentaje:0,t.descuento.desde,t.descuento.hasta,'Propuesta; no acredita pagos'])]);
}));
module.exports=router;
