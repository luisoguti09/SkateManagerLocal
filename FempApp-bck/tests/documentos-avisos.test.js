'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path');
const V=require('../services/documentos-vigencia');
const markers=new Map(),queue=[];let rows=[],fail=false,exists=true;
const U={findAll:async()=>rows,findByPk:async id=>rows.find(r=>r.id===id),sequelize:{transaction:async fn=>{
 const saved=new Map(markers),length=queue.length;try{return await fn({LOCK:{UPDATE:'UPDATE'}});}catch(e){markers.clear();for(const [k,v] of saved)markers.set(k,v);queue.length=length;throw e;}
}}};
const original=Module._load;
Module._load=function(req,parent,isMain){const key=path.basename(req).replace(/\.js$/,'');const mocks={
 'usuario.model':U,'documentoaviso.model':{findByPk:async k=>markers.get(k),create:async d=>markers.set(d.clave,d)},
 'cuenta-correo':{encolar:async(u,tipo,t,extra)=>{assert.ok(t);if(fail)throw new Error('simulated transaction failure');queue.push({id:u.id,tipo,extra});}},
 'cuenta-archivos':{existe:async()=>exists}
};return mocks[key]||original.call(this,req,parent,isMain);};
const A=require('../services/documentos-avisos');
test('avisos: umbrales, desactivado, idempotencia, renovación y rollback',async()=>{
 const env=process.env.MAIL_ENABLED,log=console.error;console.error=()=>{};
 try{
 assert.equal(A.hito(31),null);assert.equal(A.hito(30),'30');assert.equal(A.hito(7),'7');assert.equal(A.hito(0),'7');assert.equal(A.hito(-1),'vencido');
 const fecha=V.vencer(V.hoyArgentina(),-12);
 rows=[{id:1,email:'test@example.org',rol:'deportista',estado:'aprobado',fichaMedica:'test.pdf',fichaMedicaFecha:fecha}];
 process.env.MAIL_ENABLED='false';await A.tick();assert.equal(queue.length,0);
 process.env.MAIL_ENABLED='true';await A.tick();await A.tick();assert.equal(queue.length,1);assert.equal(markers.size,1);
 assert.equal(queue[0].extra.documento,'fichaMedica');assert.equal(queue[0].extra.etapa,'7');
 rows[0].fichaMedicaFecha=V.hoyArgentina();await A.tick();assert.equal(queue.length,1);
 rows[0].fichaMedicaFecha=V.vencer(fecha,-12);fail=true;await A.tick();assert.equal(markers.size,1);assert.equal(queue.length,1);
 fail=false;await A.tick();assert.equal(queue.length,2);assert.equal(queue[1].extra.etapa,'vencido');
 rows[0].fichaMedicaFecha=V.vencer(fecha,-24);exists=false;await A.tick();assert.equal(queue.length,2);
 exists=true;rows[0].estado='bloqueado';await A.tick();assert.equal(queue.length,2);
 }finally{console.error=log;if(env===undefined)delete process.env.MAIL_ENABLED;else process.env.MAIL_ENABLED=env;Module._load=original;}
});
