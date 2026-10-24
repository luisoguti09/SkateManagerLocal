'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const Module=require('node:module'),path=require('node:path'),express=require('express'),jwt=require('jsonwebtoken');
process.env.JWT_SECRET='asistencias-test-secret-012345678901234';
const usuarios=[{id:1,rol:'tecnico',club:'A'},{id:2,rol:'deportista',club:'A',nombre:'Atleta A',dni:'123'},{id:3,rol:'deportista',club:'B',nombre:'Atleta B',dni:'456'},{id:4,rol:'administrador'},{id:5,rol:'juez'},{id:6,rol:'tecnico',club:null}].map(u=>({...u,estado:'aprobado',aprobado:1,sessionVersion:0}));
const registros=[{id:1,eventoId:10,usuarioId:2,checkedAt:new Date()},{id:2,eventoId:10,usuarioId:3,checkedAt:new Date()},{id:3,eventoId:20,usuarioId:3,checkedAt:new Date()}];
const Usuario={findByPk:async id=>usuarios.find(u=>u.id===Number(id))};
function allowed(u,w){return Object.entries(w).every(([k,v])=>u[k]===v);}
const Asistencia={
 findAll:async opts=>{
  assert.equal(opts.include[0].required,true);assert.deepEqual(opts.include[0].attributes,[]);
  const rows=registros.filter(r=>allowed(usuarios.find(u=>u.id===r.usuarioId),opts.include[0].where));
  return [...new Set(rows.map(r=>r.eventoId))].map(id=>({toJSON:()=>({Evento:{id,titulo:'Evento '+id},presentes:String(rows.filter(r=>r.eventoId===id).length)})}));
 },
 findAndCountAll:async opts=>{
  assert.equal(opts.limit,50);assert.deepEqual(opts.include[0].attributes,['id','nombre','dni','club']);
  const rows=registros.filter(r=>r.eventoId===opts.where.eventoId&&allowed(usuarios.find(u=>u.id===r.usuarioId),opts.include[0].where));
  return {count:rows.length,rows:rows.slice(opts.offset,opts.offset+opts.limit).map(r=>({...r,Usuario:usuarios.find(u=>u.id===r.usuarioId)}))};
 }
};
const original=Module._load;
Module._load=function(req,parent,main){const key=path.basename(req).replace(/\.js$/,'');const map={'usuario.model':Usuario,'asistencias.model':Asistencia,'evento.model':{},'club.model':{findOne:async({where})=>['A','B'].includes(where.nombre)?{id:1}:null}};return map[key]||original.call(this,req,parent,main);};
test('HTTP: tarjetas y detalle respetan club actual y permisos; filtros inválidos no consultan',async()=>{
 const app=express();app.use('/asistencias',require('../routes/asistencias.router'));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=(id,p)=>fetch(`http://127.0.0.1:${server.address().port}/asistencias${p}`,{headers:id?{Authorization:'Bearer '+jwt.sign({id,sv:0},process.env.JWT_SECRET)}:{}});
 try{
  let d=await(await call(1,'/resumen?club=B')).json();assert.equal(d.club,'A');assert.deepEqual(d.eventos.map(e=>[e.id,e.presentes]),[[10,1]]);
  d=await(await call(1,'/eventos/10?club=B')).json();assert.equal(d.total,1);assert.equal(d.filas[0].usuarioId,2);
  d=await(await call(1,'/eventos/20')).json();assert.equal(d.total,0);
  assert.equal((await call(1,'/eventos/no')).status,400);assert.equal((await call(1,'/eventos/10?pagina=-1')).status,400);
  d=await(await call(4,'/resumen')).json();assert.equal(d.eventos[0].presentes,2);
  assert.equal((await call(2,'/resumen')).status,403);assert.equal((await call(null,'/resumen')).status,401);assert.equal((await call(6,'/resumen')).status,403);
  usuarios[1].club='B';d=await(await call(1,'/eventos/10')).json();assert.equal(d.total,0);usuarios[1].club='A';
  usuarios[0].estado='bloqueado';assert.equal((await call(1,'/resumen')).status,403);usuarios[0].estado='aprobado';
 }finally{await new Promise(r=>server.close(r));Module._load=original;}
});
test('registro distingue primera asistencia, duplicado corroborado y fallo real de base',async()=>{
 const {registrar}=require('../services/asistencia-registro');const unique=Object.assign(new Error('duplicado'),{name:'SequelizeUniqueConstraintError'});
 assert.equal(await registrar({create:async v=>assert.equal(v.usuarioId,2)},10,2),true);
 assert.equal(await registrar({create:async()=>{throw unique;},findOne:async()=>({id:1})},10,2),false);
 await assert.rejects(registrar({create:async()=>{throw unique;},findOne:async()=>null},10,2));
 await assert.rejects(registrar({create:async()=>{throw new Error('DB caída');}},10,2),/DB caída/);
});
test('diagnóstico de correo conserva código útil sin SQL, direcciones, tokens ni mensaje',()=>{
 const {diagnostico}=require('../services/correo-diagnostico');
 const d=diagnostico({name:'SequelizeDatabaseError',message:'privado@ejemplo.com',sql:'SECRET SQL',original:{code:'ER_BAD_FIELD_ERROR',errno:1054,sqlMessage:'TOKEN secreto'}},'reservar');
 assert.deepEqual(d,{etapa:'reservar',tipo:'SequelizeDatabaseError',codigo:'ER_BAD_FIELD_ERROR',numero:1054});
 assert.equal(diagnostico({name:'secreto',original:{code:'secreto',errno:'secreto'}},'secreto').codigo,'NO_CLASIFICADO');
});
