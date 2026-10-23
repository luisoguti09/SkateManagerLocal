const router=require('express').Router();
const {verifySession,verifyToken,requireRole}=require('../middleware/auth.middleware');
const {limite}=require('../middleware/cuenta-limites');
const C=require('../services/cuenta');
const F=require('../services/cuenta-archivos');
const {Op}=require('sequelize');
router.use(verifySession);
router.get('/clubes',C.wrap(async(req,res)=>{
  const Club=require('../models/club.model');
  res.json(await Club.findAll({where:{activo:true},attributes:['id','nombre'],order:[['nombre','ASC']]}));
}));
router.post('/mia/enviar',limite('enviar-solicitud',20,3600000,req=>req.auth.id),F.recibir,C.wrap(async(req,res)=>{
  let data;
  try { data=JSON.parse(req.body.datos); } catch { C.R.fail(400,'Datos de solicitud inválidos.'); }
  if(!data || typeof data!=='object' || Array.isArray(data))C.R.fail(400,'Datos de solicitud inválidos.');
  res.json(await require('../services/solicitud').enviar(req.auth.id,data,req.files));
}));
router.get('/mia',C.wrap(async(req,res)=>res.json(await C.detalle(req.cuenta))));
router.patch('/mia',C.wrap(async(req,res)=>{
  const data=C.R.perfil(req.body);
  await C.Usuario.sequelize.transaction(async t=>{
    const u=await C.Usuario.findByPk(req.auth.id,{transaction:t,lock:t.LOCK.UPDATE});
    if(u.estado==='bloqueado')C.R.fail(403,'Cuenta bloqueada.');
    await C.editable(u,t);
    if(u.estado==='aprobado' && 'club' in data && data.club!==u.club)C.R.fail(403,'El cambio de club debe gestionarlo la Federación.');
    if(Number(req.body.revision)!==u.revision)C.R.fail(409,'Tu solicitud cambió. Actualizá la pantalla.');
    await u.update({...data,revision:u.revision+1},{transaction:t});
    await C.historial(u,u.id,'datos_actualizados',null,t);
  });
  res.json(await C.detalle(await C.Usuario.findByPk(req.auth.id)));
}));
router.post('/mia/archivos',limite('archivos',30,3600000,req=>req.auth.id),F.recibir,C.wrap(async(req,res)=>{
  await F.guardar(req.auth.id,req.files,req.auth.id);res.json(await C.detalle(await C.Usuario.findByPk(req.auth.id)));
}));
router.post('/mia/reenviar',C.wrap(async(req,res)=>{
  const u=await C.Usuario.findByPk(req.auth.id);
  res.json(await require('../services/solicitud').enviar(req.auth.id,{...Object.fromEntries(Object.entries(C.R.safe(u)).filter(([,v])=>v!==undefined)),revision:req.body.revision},{}));
}));
router.get('/:id/archivo/:campo',C.wrap(async(req,res)=>{
  const admin=req.auth.rol==='administrador' && req.cuenta.estado==='aprobado';
  if(Number(req.params.id)!==req.auth.id && !admin)C.R.fail(403,'No tenés permiso.');
  if(!F.campos.includes(req.params.campo))C.R.fail(404,'Archivo no encontrado.');
  const u=await C.Usuario.findByPk(req.params.id),field=req.params.campo;
  if(!u || !await F.existe(u[field],field))C.R.fail(404,'Archivo no encontrado. Volvé a cargarlo.');
  res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});
  const p=F.fullpath(u[field],field);
  res.download(p,`${field}.${p.endsWith('.pdf')?'pdf':'jpg'}`,e=>{if(e&&!res.headersSent)res.status(404).end();});
}));
router.use('/admin',verifyToken,requireRole('administrador'));
router.get('/admin/usuarios',C.wrap(async(req,res)=>{
  const where={};
  if(req.query.estado){if(!C.R.ESTADOS.includes(req.query.estado))C.R.fail(400,'Estado inválido.');where.estado=req.query.estado;}
  if(req.query.q){const q=String(req.query.q).slice(0,100);where[Op.or]=['nombre','dni','email'].map(k=>({[k]:{[Op.like]:`%${q}%`}}));}
  if(req.query.club){if(typeof req.query.club!=='string' || req.query.club.length>255)C.R.fail(400,'Club inválido.');where.club=req.query.club;}
  const page=Math.max(1,Number.parseInt(req.query.page,10)||1);
  const result=await C.Usuario.findAndCountAll({where,attributes:['id','nombre','dni','email','estado','rol','club','revision','createdAt'],order:[['id','DESC']],limit:50,offset:(page-1)*50});
  const usuarios=await Promise.all(result.rows.map(async u=>({...u.toJSON(),etapaSolicitud:u.estado==='pendiente'?(await C.presentada(u)?'En revisión':'Por completar'):null})));
  res.json({usuarios,total:result.count,page});
}));
router.get('/admin/usuarios/:id',C.wrap(async(req,res)=>{
  const u=await C.Usuario.findByPk(req.params.id);if(!u)C.R.fail(404,'Cuenta no encontrada.');res.json(await C.detalle(u,true));
}));
router.patch('/admin/usuarios/:id/estado',C.wrap(async(req,res)=>{
  await C.Usuario.sequelize.transaction(async t=>{
    const u=await C.Usuario.findByPk(req.params.id,{transaction:t,lock:t.LOCK.UPDATE});if(!u)C.R.fail(404,'Cuenta no encontrada.');
    const data=C.R.decision(u,req.body,req.auth.id);
    if(['aprobado','requiere_correcciones'].includes(data.estado) && u.estado==='pendiente' && !await C.presentada(u,t))C.R.fail(409,'La persona todavía no envió la solicitud.');
    if(data.estado==='aprobado'){await C.completa(u);data.solicitaLicenciaProvincial=C.deportiva(u);}
    await u.update(data,{transaction:t});await C.historial(u,req.auth.id,'estado_actualizado',data.correcciones,t);
    await C.encolar(u,data.estado,t);
  });
  res.json(await C.detalle(await C.Usuario.findByPk(req.params.id),true));
}));
router.patch('/admin/usuarios/:id/documentacion',C.wrap(async(req,res)=>{
  if(typeof req.body.aprobada!=='boolean')C.R.fail(400,'Indicá el resultado de la revisión.');
  const motivo=String(req.body.motivo || '').trim().slice(0,2000);
  if(!req.body.aprobada && motivo.length<5)C.R.fail(400,'Explicá qué debe corregir.');
  await C.Usuario.sequelize.transaction(async t=>{
    const u=await C.Usuario.findByPk(req.params.id,{transaction:t,lock:t.LOCK.UPDATE});if(!u)C.R.fail(404,'Cuenta no encontrada.');
    if(Number(u.id)===req.auth.id)C.R.fail(400,'No podés revisar tus documentos.');
    if(Number(req.body.revision)!==u.revision)C.R.fail(409,'La solicitud cambió.');
    if(req.body.aprobada){if(u.estado==='pendiente' && !await C.presentada(u,t))C.R.fail(409,'La persona todavía no envió la solicitud.');await C.completa(u);}
    await u.update({documentacionAprobada:req.body.aprobada,revision:u.revision+1},{transaction:t});
    await C.historial(u,req.auth.id,req.body.aprobada?'documentacion_aprobada':'documentacion_observada',motivo,t);
    await C.encolar(u,'documentacion',t);
  });res.json(await C.detalle(await C.Usuario.findByPk(req.params.id),true));
}));
router.post('/admin/correos/:id/reintentar',C.wrap(async(req,res)=>{
  const [n]=await C.Correo.update({estado:'pendiente',intentos:0,error:null,disponibleAt:new Date()},{where:{id:req.params.id,estado:'fallido',tipo:{[Op.ne]:'reset'}}});
  if(!n)C.R.fail(409,'Solo se reintentan notificaciones fallidas. La recuperación se solicita de nuevo.');res.json({ok:true});
}));
module.exports=router;
