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
router.use(verifyToken,requireRole('tecnico'));
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
 const inscripciones=ids.length?await Inscripcion.findAll({where:{UsuarioId:{[Op.in]:ids}},attributes:['id','UsuarioId','EventoId','estadoInscripcion','disciplina','categoria'],order:[['id','DESC']]}):[];
 const eventoIds=[...new Set(inscripciones.map(i=>i.EventoId))];
 const eventos=eventoIds.length?await Evento.findAll({where:{id:{[Op.in]:eventoIds}},attributes:['id','nombre','fechaInicio','lugar','estado']}):[];
 const nombres=new Map(cuentas.map(u=>[u.id,u.nombre]));
 res.json({club:req.cuenta.club,deportistas,cuentasSinPadron:cuentas.filter(u=>deportistas.some(p=>p.usuarioId===u.id && p.padronId===null)).map(u=>({usuarioId:u.id,nombre:u.nombre})),eventos:eventos.map(e=>({...e.toJSON(),inscripciones:inscripciones.filter(i=>i.EventoId===e.id).map(i=>({...i.toJSON(),nombre:nombres.get(i.UsuarioId)}))}))});
}));
router.get('/deportistas/:id/documentos',C.wrap(async(req,res)=>{
 const u=await miembro(req),documentos=[];
 for(const campo of ['fotoPerfil','dniFrente','dniDorso','fichaMedica','certificadoWada'])if(await F.existe(u[campo],campo))documentos.push(campo);
 const vigencias=require('../services/documentos-vigencia').resumen({fichaMedica:documentos.includes('fichaMedica'),certificadoWada:documentos.includes('certificadoWada'),fichaMedicaFecha:u.fichaMedicaFecha,wadaFecha:u.wadaFecha});
 res.json({id:u.id,nombre:u.nombre,documentacionAprobada:!!u.documentacionAprobada,documentos,vigencias});
}));
router.get('/deportistas/:id/archivo/:campo',C.wrap(async(req,res)=>{
 const u=await miembro(req),campo=req.params.campo;
 if(!['fotoPerfil','dniFrente','dniDorso','fichaMedica','certificadoWada'].includes(campo) || !await F.existe(u[campo],campo))C.R.fail(404,'Documento no disponible.');
 await C.historial(u,req.auth.id,'documento_consultado_por_tecnica',campo);
 const p=F.fullpath(u[campo],campo);
 res.set({'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});
 res.download(p,`${campo}.${p.endsWith('.pdf')?'pdf':'jpg'}`,e=>{if(e&&!res.headersSent)res.status(404).end();});
}));
module.exports=router;
