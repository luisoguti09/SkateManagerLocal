'use strict';
const router=require('express').Router(),{Op}=require('sequelize');
const {verifyToken,requireRole}=require('../middleware/auth.middleware');
const {wrap}=require('../services/cuenta'),{fail}=require('../services/cuenta-reglas');
const {Beca,Historial}=require('../models/licenciabeca.model'),Usuario=require('../models/usuario.model');
const service=require('../services/licencias/becas').service({Beca,Historial,Usuario});
router.use(verifyToken,requireRole('tesoreria'));router.use((_req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
function year(req){const n=Number(req.query.temporada);if(!Number.isInteger(n)||n<2020||n>2100)fail(400,'Temporada inválida.');return n;}
router.get('/',wrap(async(req,res)=>{
 const temporada=year(req),buscar=String(req.query.buscar||'').trim();if(buscar.length<2||buscar.length>80)fail(400,'Ingresá al menos dos caracteres del nombre o DNI.');
 const usuarios=await Usuario.findAll({where:{rol:'deportista',[Op.or]:[{dni:{[Op.like]:'%'+buscar+'%'}},{nombre:{[Op.like]:'%'+buscar+'%'}}]},attributes:['id','nombre','dni','club','estado'],limit:100,order:[['nombre','ASC']]});
 const becas=await Beca.findAll({where:{temporada,usuarioId:{[Op.in]:usuarios.map(u=>u.id)}}});
 res.json(usuarios.map(u=>({...u.toJSON(),beca:becas.find(b=>b.usuarioId===u.id)?.toJSON()||null})));
}));
router.get('/eventos',wrap(async(req,res)=>{
 const Evento=require('../models/evento.model');
 res.json(await Evento.findAll({attributes:['id','titulo','fechaInicio'],order:[['fechaInicio','DESC']],limit:500}));
}));
router.put('/',wrap(async(req,res)=>{
 const data=require('../services/licencias/becas').validar(req.body);
 if(data.eventos.length){const Evento=require('../models/evento.model');const encontrados=await Evento.count({where:{id:{[Op.in]:data.eventos}}});if(encontrados!==data.eventos.length)fail(400,'Uno de los eventos no existe.');}
 res.json(await service.guardar(req.body,req.auth.id));
}));
router.get('/:id/historial',wrap(async(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<=0)fail(400,'Identificador inválido.');res.json(await Historial.findAll({where:{becaId:id},order:[['id','DESC']],limit:100}));}));
module.exports=router;
