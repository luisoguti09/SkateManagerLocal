const Usuario=require('../models/usuario.model');
const Historial=require('../models/cuentahistorial.model');
const Correo=require('../models/cuentacorreo.model');
const {encolar}=require('./cuenta-correo');
const R=require('./cuenta-reglas');
const {dniRequerido}=require('../config/archivos');
const F=require('./cuenta-archivos');
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(e=>{
  if(!e.status) console.error('[CUENTA]',e.name);
  res.status(e.status || 500).json({error:e.status?e.message:'No se pudo completar la operación.'});
});
async function historial(u,actor,accion,motivo,t) {
  await Historial.create({usuarioId:u.id,actorId:actor,accion,estado:u.estado,motivo:motivo || null,revision:u.revision},{transaction:t});
}
function deportiva(u) { return ['deportista','tecnico'].includes(u.rol); }
async function presentada(u,t) {
  if(u.estado==='aprobado')return true;
  if(u.estado!=='pendiente')return false;
  const {Op}=require('sequelize');
  return !!await Historial.findOne({where:{usuarioId:u.id,[Op.or]:[{accion:'enviado'},{accion:'reenviado'}]},transaction:t});
}
async function editable(u,t) {
  if(await presentada(u,t) && u.estado==='pendiente')R.fail(409,'La solicitud ya está en revisión. Esperá la respuesta de la Federación.');
}
async function completa(u) {
  if(!u.nombre || !u.email || !u.dni) R.fail(400,'Completá los datos de la cuenta.');
  for(const k of u.camposCorregir || []) {
    if(k==='categoria' || (k==='nivel' && u.rol!=='tecnico'))continue;
    if(F.campos.includes(k)){if(!await F.existe(u[k],k))R.fail(400,'Completá el documento solicitado: '+k);}
    else if(!String(u[k] ?? '').trim())R.fail(400,'Completá el dato solicitado: '+k);
  }
  if(!await F.existe(u.fotoPerfil,'fotoPerfil')) R.fail(400,'Cargá tu foto de perfil.');
  if(deportiva(u) && dniRequerido() && (!await F.existe(u.dniFrente,'dniFrente') || !await F.existe(u.dniDorso,'dniDorso'))) R.fail(400,'La licencia provincial requiere frente y dorso del DNI.');
}
async function detalle(u,admin=false) {
  const data=R.safe(u); data.documentos={};
  data.solicitaLicenciaProvincial=deportiva(u);
  data.solicitudEnviada=await presentada(u);
  data.etapaSolicitud=u.estado==='pendiente'?(data.solicitudEnviada?'En revisión':'Por completar'):null;
  for(const k of ['fotoPerfil','dniFrente','dniDorso','fichaMedica']) data.documentos[k]=await F.existe(u[k],k);
  data.requiereDni=deportiva(u) && dniRequerido();
  data.historial=await Historial.findAll({where:{usuarioId:u.id},attributes:['id','accion','estado','motivo','createdAt','revision'],order:[['id','DESC']],limit:50});
  if(admin) data.correos=await Correo.findAll({where:{usuarioId:u.id},attributes:['id','tipo','estado','intentos','error','createdAt','enviadoAt'],order:[['id','DESC']],limit:30});
  return data;
}
module.exports={Usuario,Historial,Correo,encolar,R,wrap,historial,completa,detalle,deportiva,presentada,editable};
