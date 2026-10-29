'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),jwt=require('jsonwebtoken'),Module=require('node:module'),path=require('node:path');
process.env.JWT_SECRET='test-checkin-012345678901234567890';
const users=[{id:1,rol:'deportista'},{id:2,rol:'administrador'}].map(u=>({...u,estado:'aprobado',aprobado:1,sessionVersion:0}));
const evento={id:10,qrEventCode:'evento-token',requireGeo:false,inscripcionesConfirmadasAt:'2026-10-29',inscripcionRequierePago:true};let cargo={estado:'pagado'},estadoInscripcion='confirmada',inscrita=true,fallo=false,creadas=0,existente=false;
const Usuario={findByPk:async id=>users.find(u=>u.id===Number(id))};
const Asistencia={create:async v=>{assert.equal(v.usuarioId,1);assert.equal(v.eventoId,10);if(fallo)throw new Error('DB');if(existente)throw Object.assign(new Error('unique'),{name:'SequelizeUniqueConstraintError'});creadas++;existente=true;},findOne:async()=>existente?{id:1}:null};
const SequelizeLibrary=require('sequelize');const next=(req,res,n)=>n();const original=Module._load;
Module._load=function(req,parent,main){const key=path.basename(req).replace(/\.js$/,'');const map={'usuario.model':Usuario,'evento.model':{findByPk:async id=>Number(id)===10?evento:null},'asistencias.model':Asistencia,'usuarioevento.model':{findAll:async({where})=>{assert.equal(where.UsuarioId,1);assert.equal(where.EventoId,10);return inscrita?[{id:1,estadoInscripcion}]:[];}},'models':{sequelize:{}},'circuito':{sesion:next,roles:()=>next,R:{},db:{Sequelize:SequelizeLibrary,CargoInscripcion:{findOne:async({where})=>{assert.deepEqual(where,{eventoId:10,usuarioId:1});return cargo;}}}},'circuito.router':express.Router()};return map[key]||original.call(this,req,parent,main);};
test('HTTP: deportista escanea evento; duplicados no suman y errores reales no confirman',async()=>{
 const app=express();app.use(express.json());app.use('/eventos',require('../routes/eventos.router'));Module._load=original;
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=(id,body={token:'evento-token'})=>fetch(`http://127.0.0.1:${server.address().port}/eventos/10/checkin`,{method:'POST',headers:{'Content-Type':'application/json',...(id?{Authorization:'Bearer '+jwt.sign({id,sv:0},process.env.JWT_SECRET)}:{})},body:JSON.stringify(body)});
 try{
  assert.equal((await call(null)).status,401);assert.equal((await call(2)).status,403);
  assert.equal((await call(1,{token:'personal-qr'})).status,400);
  inscrita=false;assert.equal((await call(1)).status,400);inscrita=true;
  evento.checkinOpenAt='2000-01-01';evento.checkinCloseAt='2000-01-02';assert.equal((await call(1)).status,400);delete evento.checkinOpenAt;delete evento.checkinCloseAt;
  evento.inscripcionesConfirmadasAt=null;assert.equal((await call(1)).status,403);evento.inscripcionesConfirmadasAt='2026-10-29';
  estadoInscripcion='provisoria';assert.equal((await call(1)).status,403);estadoInscripcion='confirmada';
  for(const estado of ['pendiente','aprobado','rechazado','reintegrado']){cargo={estado};assert.equal((await call(1)).status,403);}
  cargo=null;assert.equal((await call(1)).status,403);
  evento.inscripcionRequierePago=null;assert.equal((await call(1)).status,403);
  assert.equal(creadas,0);
  evento.inscripcionRequierePago=false;
  assert.deepEqual(await(await call(1)).json(),{created:true});
  existente=false;creadas=0;evento.inscripcionRequierePago=true;cargo={estado:'pagado'};
  assert.deepEqual(await(await call(1,{token:'evento-token',usuarioId:2})).json(),{created:true});
  assert.deepEqual(await(await call(1)).json(),{created:false});assert.equal(creadas,1);
  fallo=true;const bad=await call(1);assert.equal(bad.status,503);assert.equal((await bad.json()).created,undefined);
 }finally{await new Promise(r=>server.close(r));}
});
