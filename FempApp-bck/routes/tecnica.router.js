'use strict';
const router=require('express').Router();
const {Op}=require('sequelize');
const {verifyToken,requireRole}=require('../middleware/auth.middleware');
const C=require('../services/cuenta');
const F=require('../services/cuenta-archivos');
const Club=require('../models/club.model');
const Inscripcion=require('../models/usuarioevento.model');
const Evento=require('../models/evento.model');
const Alcance=require('../services/alcance-evaluaciones');
router.use(verifyToken,requireRole('tecnico','delegado'));
router.use(C.wrap(async(req,res,next)=>{
 if(!req.cuenta.club || !await Club.findOne({where:{nombre:req.cuenta.club,activo:true}}))C.R.fail(403,'La Federación debe asignarte un club activo antes de consultar su información.');
 res.set('Cache-Control','private, no-store');next();
}));
async function miembro(req){
 const u=await C.Usuario.findByPk(req.params.id);
 if(!u || u.rol!=='deportista' || u.estado!=='aprobado' || u.club!==req.cuenta.club)C.R.fail(403,'Solo podés consultar cuentas aprobadas de deportistas de tu club actual.');
 return u;
}
router.get('/panel',C.wrap(async(req,res)=>{
 const [padron,cuentas]=await Promise.all([
  Alcance.deportistas(req.cuenta),
  C.Usuario.findAll({where:{club:req.cuenta.club,rol:'deportista',estado:'aprobado'},attributes:['id','nombre','dni','documentacionAprobada']})
 ]);
 const norm=v=>String(v||'').replace(/\D/g,'');
 // La lista nace de las cuentas aprobadas, nunca de todo el padrón importado.
 const porDni=new Map(),cuentasPorDni=new Map();
 for(const p of padron){const k=norm(p.documentoN);if(k)porDni.set(k,porDni.has(k)?null:p);}
 for(const u of cuentas){const k=norm(u.dni);cuentasPorDni.set(k,(cuentasPorDni.get(k)||0)+1);}
 const deportistas=cuentas.map(u=>{
  const k=norm(u.dni),p=cuentasPorDni.get(k)===1?porDni.get(k):null;
  return {padronId:p?.id??null,usuarioId:u.id,nombre:u.nombre,dni:u.dni,categoria:p?.categoria||null,documentacionAprobada:!!u.documentacionAprobada};
 });
 const ids=cuentas.map(u=>u.id);
 const inscripciones=ids.length?await Inscripcion.findAll({where:{UsuarioId:{[Op.in]:ids}},attributes:['id','UsuarioId','EventoId','estadoInscripcion','disciplina','categoria','perfilDeportivoId'],order:[['id','DESC']]}):[];
 const eventoIds=[...new Set(inscripciones.map(i=>i.EventoId))];
 const eventos=eventoIds.length?await Evento.findAll({where:{id:{[Op.in]:eventoIds}},attributes:['id','nombre','fechaInicio','lugar','estado']}):[];
 const nombres=new Map(cuentas.map(u=>[u.id,u.nombre]));
 res.json({club:req.cuenta.club,deportistas,cuentasSinPadron:cuentas.filter(u=>deportistas.some(p=>p.usuarioId===u.id && p.padronId===null)).map(u=>({usuarioId:u.id,nombre:u.nombre})),eventos:eventos.map(e=>({...e.toJSON(),inscripciones:inscripciones.filter(i=>i.EventoId===e.id).map(i=>({...i.toJSON(),nombre:nombres.get(i.UsuarioId)}))}))});
}));
router.get('/deportistas/:id/documentos',requireRole('tecnico','delegado'),C.wrap(async(req,res)=>{
 const u=await miembro(req),documentos=[];
 for(const campo of ['fotoPerfil','dniFrente','dniDorso','fichaMedica','certificadoWada'])if(await F.existe(u[campo],campo))documentos.push(campo);
 const vigencias=require('../services/documentos-vigencia').resumen({fichaMedica:documentos.includes('fichaMedica'),certificadoWada:documentos.includes('certificadoWada'),fichaMedicaFecha:u.fichaMedicaFecha,wadaFecha:u.wadaFecha});
 res.json({id:u.id,nombre:u.nombre,documentacionAprobada:!!u.documentacionAprobada,documentos,vigencias});
}));
router.get('/deportistas/:id/archivo/:campo',requireRole('tecnico','delegado'),C.wrap(async(req,res)=>{
 const u=await miembro(req),campo=req.params.campo;
 if(!['fotoPerfil','dniFrente','dniDorso','fichaMedica','certificadoWada'].includes(campo) || !await F.existe(u[campo],campo))C.R.fail(404,'Documento no disponible.');
 await C.historial(u,req.auth.id,req.cuenta.rol==='delegado'?'documento_consultado_por_delegada':'documento_consultado_por_tecnica',campo);
 const p=F.fullpath(u[campo],campo);
 res.set({'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});
 res.download(p,`${campo}.${p.endsWith('.pdf')?'pdf':'jpg'}`,e=>{if(e&&!res.headersSent)res.status(404).end();});
}));
router.get('/deportistas/:id/perfiles',C.wrap(async(req,res)=>{
 await require('../services/club-gestion').miembro(req.auth.id,req.params.id);
 const {db}=require('../services/circuito');
 const perfiles=await db.PerfilDeportivo.findAll({where:{usuarioId:req.params.id},order:[['id','ASC']]});
 res.json(perfiles.map(p=>({...p.toJSON(),versionToken:require('../services/club-gestion').versionPerfil(p)})));
}));
router.get('/eventos-abm',requireRole('tecnico'),C.wrap(async(req,res)=>{
 const {db,R}=require('../services/circuito');
 const rows=await db.Evento.findAll();
 res.json(rows.filter(e=>R.etapa(e)==='abm' && !e.inscripcionesConfirmadasAt).map(e=>({id:e.id,nombre:e.nombre})));
}));
router.patch('/deportistas/:id/perfiles/:perfilId',requireRole('tecnico'),C.wrap(async(req,res)=>{
 const {db,evento,audit,R}=require('../services/circuito');
 const G=require('../services/club-gestion');
 const permitidos=['disciplina','origenCategoria','licencia','modalidad','divisional','categoria','temporada'];
 const cambios={};
 if(!req.body.cambios || typeof req.body.cambios!=='object' || Array.isArray(req.body.cambios))R.fail(400,'Completá los cambios.');
 for(const [k,v] of Object.entries(req.body.cambios)){
  if(!permitidos.includes(k) || typeof v!=='string' || !v.trim() || v.length>100)R.fail(400,'Campo deportivo inválido.');
  cambios[k]=v.trim();
 }
 if(!Object.keys(cambios).length)R.fail(400,'No hay cambios.');
 if(cambios.temporada && !/^(20|21)\d{2}$/.test(cambios.temporada))R.fail(400,'Temporada inválida.');
 await db.sequelize.transaction(async t=>{
  const deportista=await G.miembro(req.auth.id,req.params.id,t,true);
  const p=await db.PerfilDeportivo.findByPk(R.id(req.params.perfilId),{transaction:t,lock:t.LOCK.UPDATE});
  if(!p || Number(p.usuarioId)!==Number(req.params.id))R.fail(403,'Perfil ajeno.');
  if(!req.body.version || G.versionPerfil(p)!==req.body.version)R.fail(409,'El perfil cambió. Actualizá antes de guardar.');
  require('../services/perfil-catalogo-validacion').validar({...p.toJSON(),...cambios});
  const antes=Object.fromEntries(permitidos.map(k=>[k,p[k]]));
  await p.update(cambios,{transaction:t});
  await C.historial(deportista,req.auth.id,'perfil_tecnica',JSON.stringify({perfilId:p.id,antes,despues:Object.fromEntries(permitidos.map(k=>[k,p[k]]))}),t);
  // El perfil puede cambiar siempre. Las inscripciones conservan su snapshot;
  // su actualización se hace explícitamente por el circuito de ABM.

 });
 res.json({mensaje:'Perfil actualizado y cambio registrado.'});
}));
module.exports=router;
