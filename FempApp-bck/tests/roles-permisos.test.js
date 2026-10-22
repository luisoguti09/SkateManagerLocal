const {test}=require('node:test');const assert=require('node:assert/strict');
const Module=require('node:module'),path=require('node:path');
const express=require('express'),jwt=require('jsonwebtoken');const {Op}=require('sequelize');
process.env.JWT_SECRET='roles-test-key-12345678901234567890';
const users=[{id:1,dni:'1',rol:'tecnico',club:'A',estado:'aprobado',aprobado:true,sessionVersion:0},{id:2,dni:'2',rol:'juez',estado:'aprobado',aprobado:true,sessionVersion:0},{id:3,dni:'3',rol:'deportista',estado:'aprobado',aprobado:true,sessionVersion:0}];
const padron=[{id:10,documentoN:'10101010',club:'A'},{id:20,documentoN:'20202020',club:'B'}].map(p=>({...p,toJSON:()=>p}));
const evals=[{id:100,deportistaId:10},{id:200,deportistaId:20}];
const Usuario={findByPk:async id=>users.find(u=>u.id===Number(id)),findAll:async()=>[]};
const Evaluacion={findAll:async({where={}})=>evals.filter(e=>!where.deportistaId || (typeof where.deportistaId==='object'?where.deportistaId[Op.in].includes(e.deportistaId):e.deportistaId===Number(where.deportistaId)))};
const original=Module._load;
Module._load=function(req,parent,isMain){
 if(req==='../models')return {Evaluacion,EvaluacionElemento:{findAll:async()=>[]},EvaluacionComponente:{findAll:async()=>[]}};
 const key=path.basename(req).replace(/\.js$/,'');
 const map={'usuario.model':Usuario,'padron.model':{findAll:async()=>padron},'club.model':{findOne:async()=>({id:1})}};
 if(map[key])return map[key];return original.call(this,req,parent,isMain);
};
test('HTTP: técnica solo lee su club; juez consulta; deportista y anónimo no acceden',async()=>{
 const app=express();app.use(express.json());app.use('/evaluaciones',require('../routes/evaluaciones.router'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(id,url,method='GET')=>fetch(base+'/evaluaciones'+url,{method,headers:id?{Authorization:'Bearer '+jwt.sign({id,sv:0},process.env.JWT_SECRET)}:{}});
 try{
  const list=await call(1,'/');assert.deepEqual((await list.json()).map(x=>x.id),[100]);
  assert.equal((await call(1,'/deportista/20')).status,403);
  assert.equal((await call(1,'/evolucion/elemento?deportistaId=20&elementoId=1')).status,403);
  assert.equal((await call(1,'/evolucion/componente?deportistaId=20&componenteId=1')).status,403);
  assert.equal((await call(1,'/deportista/10')).status,200);
  assert.equal((await call(1,'/','POST')).status,403);
  assert.equal((await call(3,'/')).status,403);
  assert.equal((await call(null,'/')).status,401);
  assert.equal((await (await call(2,'/')).json()).length,2);
 }finally{await new Promise(r=>server.close(r));}
});
