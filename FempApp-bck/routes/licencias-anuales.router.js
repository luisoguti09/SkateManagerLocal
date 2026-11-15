'use strict';
const express=require('express'),{Op}=require('sequelize');
const {verifyToken,requireRole}=require('../middleware/auth.middleware');
const {wrap}=require('../services/cuenta'),{fail}=require('../services/cuenta-reglas');
const R=require('../services/licencias/cobro-reglas'),A=require('../services/licencias/anuales');
function router({models=require('../models/licenciaanual.model'),Usuario=require('../models/usuario.model'),Config=require('../models/licenciaconfiguracion.model').Config,Beca=require('../models/licenciabeca.model').Beca,provider=require('../services/licencias/proveedor').api(),env=process.env}={}){
 const r=express.Router(),s=A.service({...models,Usuario,Config,Beca,provider,env});
 r.use((_q,res,next)=>{res.set('Cache-Control','private, no-store');next();});
 r.post('/webhook',wrap(async(req,res)=>{
  const id=req.query['data.id'];if(!R.verificarFirma({dataId:id,requestId:req.get('x-request-id'),signature:req.get('x-signature'),secret:env.MP_LICENCIAS_WEBHOOK_SECRET}))return res.status(401).json({error:'Firma inválida.'});
  const payment=await provider.pago(String(id));if(String(payment.id)!==String(id))fail(502,'Respuesta no correspondiente al pago notificado.');
  await s.conciliar(payment,true);res.json({recibido:true});
 }));
 r.use(verifyToken);
 const year=req=>A.temporada(req.query.temporada??req.body?.temporada??2027);
 r.get('/mia',requireRole('deportista'),wrap(async(req,res)=>res.json(await s.detalle(req.auth.id,year(req)))));
 r.post('/solicitar',requireRole('deportista'),wrap(async(req,res)=>{await s.solicitar(req.auth.id,year(req));res.json(await s.detalle(req.auth.id,year(req)));}));
 r.post('/checkout',requireRole('deportista'),wrap(async(req,res)=>res.json(await s.checkout(req.auth.id,year(req)))));
 r.post('/comprobar',requireRole('deportista'),wrap(async(req,res)=>res.json(await s.comprobar(req.auth.id,year(req)))));
 r.use(requireRole('tesoreria','administrador'));
 r.get('/preparacion',wrap(async(_req,res)=>{
  let connection;try{connection=await provider.verificar();}catch(e){connection={connected:false,message:e.status?e.message:'No se pudo verificar Mercado Pago.'};}
  res.json({connected:connection.connected===true,mensaje:connection.message||'',habilitado:env.MP_LICENCIAS_ENABLED==='true',pilotoUsuarioId:env.MP_LICENCIAS_PILOTO_USUARIO_ID||null,temporada:Number(env.MP_LICENCIAS_TEMPORADA||2027)});
 }));
 async function listar(req,limitar=true){const temporada=year(req),buscar=String(req.query.buscar||'').trim();if(buscar.length>100)fail(400,'Búsqueda demasiado larga.');
  const usuarios=await Usuario.findAll({where:{rol:'deportista',...(buscar?{[Op.or]:[{nombre:{[Op.like]:'%'+buscar+'%'}},{dni:{[Op.like]:'%'+buscar+'%'}}]}:{})},attributes:['id','nombre','dni','club','estado','aprobado','documentacionAprobada','fichaMedica','fichaMedicaFecha','certificadoWada','wadaFecha'],order:[['nombre','ASC']],...(limitar?{limit:200}:{})});
  const ls=await models.Licencia.findAll({where:{temporada,usuarioId:{[Op.in]:usuarios.map(u=>u.id)}}});const result=[];
  const intentos=await models.Intento.findAll({where:{licenciaId:{[Op.in]:ls.map(l=>l.id)}}}),operaciones=await models.Operacion.findAll({where:{licenciaId:{[Op.in]:ls.map(l=>l.id)}}});
  for(const u of usuarios){const l=ls.find(x=>x.usuarioId===u.id),i=l?intentos.find(i=>i.licenciaId===l.id):null,ops=l?operaciones.filter(o=>o.licenciaId===l.id):[];
   result.push({id:u.id,nombre:u.nombre,dni:u.dni,club:u.club,documentos:A.documentos({...u.toJSON(),rol:'deportista'},require('../services/documentos-vigencia').hoyArgentina()),licencia:l?.toJSON()||null,cotizacion:i?.cotizacion||l?.exencion||null,intentoEstado:i?.estado||null,operaciones:ops.map(o=>({paymentId:o.paymentId,webhook:o.webhook,...o.datos}))});
  }return result;
 }
 r.get('/tesoreria',wrap(async(req,res)=>res.json(await listar(req))));
 r.put('/fecha-nacional',requireRole('tesoreria'),wrap(async(req,res)=>res.json(await s.asignar(req.body,req.auth.id))));
 r.post('/comprobar/:usuarioId',requireRole('tesoreria'),wrap(async(req,res)=>{const id=Number(req.params.usuarioId);if(!Number.isSafeInteger(id)||id<=0)fail(400,'Deportista inválida.');res.json(await s.comprobar(id,year(req)));}));
 r.get('/exportar.csv',requireRole('tesoreria'),wrap(async(req,res)=>{
  const rows=await listar(req,false),cell=v=>'"'+(/^[\s]*[=+@-]/.test(String(v??''))?"'":'')+String(v??'').replace(/"/g,'""')+'"';
  const lines=[['usuarioId','nombre','dni','club','temporada','fechaNacional','estadoLicencia','importeCotizadoARS','becaPorcentaje','paymentId','estadoPago','importePagoARS','fechaAprobacion','reintegradoARS','webhookRecibido']];
  for(const u of rows)for(const o of u.operaciones.length?u.operaciones:[{}])lines.push([u.id,u.nombre,u.dni,u.club,year(req),u.licencia?.fechaNacional,u.licencia?.estado,u.cotizacion?u.cotizacion.totalCentavos/100:'',u.cotizacion?.porcentaje,o.paymentId,o.estado,o.importeCentavos!==undefined?o.importeCentavos/100:'',o.fechaAprobacion,o.reintegradoCentavos!==undefined?o.reintegradoCentavos/100:'',o.webhook??'']);
  res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="licencias-'+year(req)+'.csv"'});res.send('\uFEFF'+lines.map(row=>row.map(cell).join(';')).join('\r\n'));
 }));
 return r;
}
module.exports={router};
