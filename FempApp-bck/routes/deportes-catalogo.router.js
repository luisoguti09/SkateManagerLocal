'use strict';
const router=require('express').Router(),{Op}=require('sequelize');
const {verifyToken,requireRole}=require('../middleware/auth.middleware');
const {wrap}=require('../services/cuenta'),{fail}=require('../services/cuenta-reglas');
const C=require('../services/deportes-catalogo').production();
const {Catalogo,Historial}=require('../models/deportecatalogo.model');
const Usuario=require('../models/usuario.model'),M=require('../models/deportepermiso.model');
const P=require('../services/deportes-permisos').service({...M,Usuario,Catalogo});
router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.get('/',wrap(async(_req,res)=>res.json((await C.todos()).filter(d=>d.activo).map(({nombre,disciplinas,fijo})=>({nombre,disciplinas,fijo})))));
router.use(verifyToken);
router.get('/acceso',wrap(async(req,res)=>res.json(await P.acceso(req.auth))));
router.get('/administracion',wrap(async(req,res)=>{
 const a=await P.acceso(req.auth);if(!a.general&&!a.deportes.length)fail(403,'No tenés deportes asignados para administrar.');
 res.json((await C.todos()).filter(d=>a.general||a.deportes.includes(d.nombre)));
}));
router.put('/',wrap(async(req,res)=>{
 const a=await P.acceso(req.auth),nombre=typeof req.body.nombre==='string'?req.body.nombre.trim().normalize('NFC').toLocaleUpperCase('es-AR'):'';
 P.permitir(a,nombre);res.json(await C.guardar(req.body,req.auth.id));
}));
router.get('/historial',wrap(async(req,res)=>{
 const a=await P.acceso(req.auth);if(!a.general&&!a.deportes.length)fail(403,'Sin permiso.');
 res.json(await Historial.findAll({...(a.general?{}:{where:{deporte:{[Op.in]:a.deportes}}}),order:[['id','DESC']],limit:100}));
}));
router.get('/usuarios',requireRole('administrador'),wrap(async(req,res)=>{
 const buscar=String(req.query.buscar||'').trim();if(buscar.length<3||buscar.length>100)fail(400,'Ingresá al menos tres caracteres.');
 res.json(await Usuario.findAll({where:{estado:'aprobado',aprobado:true,[Op.or]:[{nombre:{[Op.like]:'%'+buscar+'%'}},{email:{[Op.like]:'%'+buscar+'%'}}]},attributes:['id','nombre','email','rol'],limit:30,order:[['nombre','ASC']]}));
}));
router.get('/permisos/:id',requireRole('administrador'),wrap(async(req,res)=>{
 const usuarioId=Number(req.params.id);if(!Number.isSafeInteger(usuarioId)||usuarioId<=0)fail(400,'Cuenta inválida.');
 res.json(await M.Permiso.findByPk(usuarioId)||{usuarioId,deportes:[],revision:0});
}));
router.put('/permisos',requireRole('administrador'),wrap(async(req,res)=>res.json(await P.guardar(req.body,req.auth.id))));
module.exports=router;
