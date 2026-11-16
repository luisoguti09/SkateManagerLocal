'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),jwt=require('jsonwebtoken'),{createHmac}=require('node:crypto');
const {fixture}=require('./licencias-anuales.test');
process.env.JWT_SECRET='prueba-http-licencia-no-produccion';
const f=fixture();f.u.nombre='Persona prueba';f.u.dni='100';f.u.toJSON=()=>({...f.u});
const users=[f.u,{id:99,rol:'tesoreria',estado:'aprobado',aprobado:true,sessionVersion:0},{id:98,rol:'administrador',estado:'aprobado',aprobado:true,sessionVersion:0}];
const Usuario={findByPk:async id=>users.find(u=>u.id===Number(id)),findAll:async()=>[f.u]};
require.cache[require.resolve('../models/usuario.model')]={exports:Usuario};
require.cache[require.resolve('../services/cuenta')]={exports:{wrap:fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(e=>res.status(e.status||500).json({error:e.message}))}};
f.env.MP_LICENCIAS_WEBHOOK_SECRET='webhook-local-test';let gets=0;f.provider.pago=async id=>{assert.equal(id,'100');gets++;return f.payment();};f.provider.verificar=async()=>({connected:true});
const app=express();app.use(express.json());app.use('/licencias',require('../routes/licencias-anuales.router').router({models:f.m,Usuario,Config:{findByPk:async()=>f.cfg},Beca:{findOne:async()=>null},provider:f.provider,env:f.env}));
let server,base;after(()=>server?.close());
async function request(path,id,body,method=body?'POST':'GET',headers={}){if(!server){server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;}
 const token=id?jwt.sign({id,sv:0,rol:'tesoreria'},process.env.JWT_SECRET):null;const r=await fetch(base+'/licencias'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};}
test('HTTP anual: roles reales, precio no manipulable, firma obligatoria y webhook repetido',async()=>{
 assert.equal((await request('/mia?temporada=2027')).status,401);
 assert.equal((await request('/tesoreria?temporada=2027',1)).status,403);
 assert.equal((await request('/fecha-nacional',98,{},'PUT')).status,403);
 assert.equal((await request('/checkout',99,{temporada:2027})).status,403);
 assert.equal((await request('/solicitar',1,{temporada:2027})).status,200);
 const body={usuarioId:1,temporada:2027,fechaNacional:'2026-11-10',revision:0,motivo:'Fecha verificada'};
 assert.equal((await request('/fecha-nacional',1,body,'PUT')).status,403);assert.equal((await request('/fecha-nacional',99,body,'PUT')).status,410);
 assert.equal((await request('/checkout',1,{temporada:2027,usuarioId:99,importe:1,porcentaje:100})).status,200);
 assert.equal(f.tables.Intento[0].cotizacion.totalCentavos,13000000);
 assert.equal((await request('/webhook?data.id=100',null,{type:'payment'})).status,401);assert.equal(gets,0);
 const ts=String(Date.now()),rid='request-test',signature=createHmac('sha256','webhook-local-test').update(`id:100;request-id:${rid};ts:${ts};`).digest('hex');
 const headers={'x-request-id':rid,'x-signature':`ts=${ts},v1=${signature}`};
 // Un ID del body diferente nunca decide qué pago consultar.
 assert.equal((await request('/webhook?data.id=100',null,{type:'payment',data:{id:999}},'POST',headers)).status,200);
 assert.equal((await request('/webhook?data.id=100',null,{type:'payment'},'POST',headers)).status,200);
 assert.equal(f.tables.Operacion.length,1);assert.equal(f.tables.Operacion[0].webhook,true);
 assert.equal((await request('/checkout',1,{temporada:2027})).status,409);
});

test('CSV anual: exclusivo de Tesorería, fechas/importes verificados y nombres seguros',async()=>{
 f.u.nombre='=1+1';
 assert.equal((await request('/exportar.csv?temporada=2027',1)).status,403);
 assert.equal((await request('/exportar.csv?temporada=2027',98)).status,403);
 const r=await request('/exportar.csv?temporada=2027',99);assert.equal(r.status,200);assert.ok(r.data.includes("'=1+1"));assert.ok(r.data.includes('2026-11-14T18:10:00Z'));assert.ok(r.data.includes('130000'));assert.ok(r.data.includes('conciliada'));
});
