'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path');
let current=null,user=null,exists=true;
const Q={sequelize:{transaction:async fn=>fn({LOCK:{UPDATE:'UPDATE'}})},findOne:async()=>current?.estado==='pendiente'?current:null,update:async d=>Object.assign(current,d)};
const original=Module._load;
Module._load=function(req,parent,isMain){const key=path.basename(req).replace(/\.js$/,'');const mocks={'cuentacorreo.model':Q,'usuario.model':{findByPk:async()=>user},'cuenta-archivos':{existe:async()=>exists}};return mocks[key]||original.call(this,req,parent,isMain);};
process.env.MAIL_DATA_KEY='34'.repeat(32);process.env.MAIL_FROM='test@example.org';process.env.MAIL_ENABLED='true';process.env.FRONTEND_URL='https://fempa.example';
const Mail=require('../services/cuenta-correo'),V=require('../services/documentos-vigencia');
test('correo de vencimiento descarta documento renovado, etapa vieja y cuenta bloqueada',async()=>{
 const nativeFetch=global.fetch;let network=0;global.fetch=async()=>{network++;throw new Error('No se deben enviar correos reales');};
 const issue=V.vencer(V.hoyArgentina(),-12),due=V.vencer(issue,12);
 async function run(extra={}){current={id:1,usuarioId:1,tipo:'vencimiento_documental',estado:'pendiente',intentos:0,payload:Mail.seal({email:'test@example.org',documento:'fichaMedica',expedicion:issue,vence:due,etapa:'7',...extra}),update:async function(d){Object.assign(this,d);}};await Mail.tick();assert.equal(current.estado,'vencido');assert.equal(current.payload,null);}
 try{
 user={id:1,email:'test@example.org',estado:'aprobado',rol:'deportista',fichaMedica:'f.pdf',fichaMedicaFecha:V.hoyArgentina()};await run();
 user.fichaMedicaFecha=issue;await run({etapa:'30'});
 user.estado='bloqueado';await run();user.estado='aprobado';exists=false;await run();
 exists=true;user.email='nuevo@example.org';await run();
 assert.equal(network,0);
 }finally{global.fetch=nativeFetch;Module._load=original;}
});
