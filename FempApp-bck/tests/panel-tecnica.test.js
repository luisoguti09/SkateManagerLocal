const {test}=require('node:test');const assert=require('node:assert/strict');
const Module=require('node:module'),path=require('node:path'),express=require('express'),jwt=require('jsonwebtoken');
const {Op}=require('sequelize');process.env.JWT_SECRET='test-panel-tecnica-01234567890123456789';
const rows=[{id:1,rol:'tecnico',club:'A',estado:'aprobado',aprobado:true,sessionVersion:0},{id:2,rol:'deportista',club:'A',estado:'aprobado',dni:'123',nombre:'Atleta A',documentacionAprobada:false,sessionVersion:0},{id:3,rol:'deportista',club:'B',estado:'aprobado',dni:'456',sessionVersion:0},{id:4,rol:'juez',estado:'aprobado',aprobado:true,sessionVersion:0},{id:5,rol:'tecnico',club:null,estado:'aprobado',aprobado:true,sessionVersion:0}];
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(e=>res.status(e.status||500).json({error:e.message}));
const Usuario={findByPk:async id=>rows.find(u=>u.id===Number(id)),findAll:async({where})=>rows.filter(u=>Object.entries(where).every(([k,v])=>u[k]===v))};
const original=Module._load;let archivos=0;
Module._load=function(req,parent,isMain){const key=path.basename(req).replace(/\.js$/,'');const map={
 'usuario.model':Usuario,
 'club.model':{findOne:async({where})=>where.nombre==='A'?{id:1}:null},
 'usuarioevento.model':{findAll:async({where})=>{assert.deepEqual(where.UsuarioId[Op.in],[2]);return[{EventoId:10,UsuarioId:2,toJSON:()=>({EventoId:10,UsuarioId:2,estadoInscripcion:'provisoria'})}];}},
 'evento.model':{findAll:async()=>[{id:10,toJSON:()=>({id:10,nombre:'Clínica'})}]},
 'alcance-evaluaciones':{deportistas:async()=>[{id:100,documentoN:'123',apellidoYNombre:'Atleta A',categoria:'Inicial'}]},
 'cuenta':{Usuario,wrap,R:{fail:(status,message)=>{throw Object.assign(new Error(message),{status});}},historial:async()=>{}},
 'cuenta-archivos':{campos:['fotoPerfil'],existe:async()=>{archivos++;return false;}}
};if(map[key])return map[key];return original.call(this,req,parent,isMain);};
test('panel técnico limita cuentas, inscripciones y documentos al club actual',async()=>{
 const app=express();app.use('/tecnica',require('../routes/tecnica.router'));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=(id,url)=>fetch(`http://127.0.0.1:${server.address().port}/tecnica${url}`,{headers:id?{Authorization:'Bearer '+jwt.sign({id,sv:0},process.env.JWT_SECRET)}:{}});
 try{
 const r=await call(1,'/panel?club=B');assert.equal(r.status,200);const d=await r.json();assert.equal(d.club,'A');assert.equal(d.deportistas[0].usuarioId,2);assert.equal(d.eventos[0].inscripciones[0].nombre,'Atleta A');assert.equal(archivos,0);
 assert.equal((await call(1,'/deportistas/3/documentos')).status,403);assert.equal((await call(1,'/deportistas/3/archivo/fotoPerfil')).status,403);assert.equal(archivos,0);
 assert.equal((await call(1,'/deportistas/2/documentos')).status,200);
 rows[1].club='B';assert.equal((await call(1,'/deportistas/2/documentos')).status,403);
 assert.equal((await call(4,'/panel')).status,403);assert.equal((await call(5,'/panel')).status,403);assert.equal((await call(null,'/panel')).status,401);
 }finally{await new Promise(r=>server.close(r));}
});
