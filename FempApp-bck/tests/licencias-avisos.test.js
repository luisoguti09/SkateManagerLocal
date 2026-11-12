'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../services/licencias/avisos'),P=require('../services/licencias/propuesta');
test('avisos: automáticos sin preferencia manual; dos hitos por fecha y sin repetir por reinicio',async()=>{
 const datos=P.validar({...structuredClone(P.inicial),correoTesoreria:true});
 assert.ok(A.pendientes({...datos,correoTesoreria:false},'2026-12-09').length);assert.deepEqual(A.pendientes(datos,'2028-01-01'),[]);
 const sent=[],keys=new Set(),row={id:2027,datos};
 const deps={Config:{findAll:async()=>[row],findByPk:async()=>row,sequelize:{transaction:fn=>fn({LOCK:{UPDATE:1}})}},Aviso:{findByPk:async k=>keys.has(k),create:async r=>keys.add(r.clave)},Usuario:{findAll:async o=>{assert.deepEqual(o.where,{rol:'tesoreria',estado:'aprobado',aprobado:true});return[{id:3,email:'tesoreria@example.invalid'}];}},encolar:async(u,t,tx,p)=>sent.push({u,t,p})};
 assert.ok(await A.procesar(deps,'2026-11-18')>0);assert.equal(await A.procesar(deps,'2026-11-18'),0);assert.equal(await A.procesar(deps,'2026-11-19'),0);
 await A.procesar(deps,'2026-11-24');assert.ok(sent.some(r=>r.p.aviso.etapa==='vencido'));assert.equal(await A.procesar(deps,'2026-11-24'),0);
 datos.correoTesoreria=false;assert.ok(await A.procesar(deps,'2026-12-09')>0);
});
test('avisos: identidad separa destinatario, temporada y fecha; editar precio no reenvía',()=>{
 const a={temporada:2027,tipo:'pago',fecha:'2026-12-10',etapa:'previo'};
 assert.notEqual(A.clave(1,a),A.clave(2,a));assert.notEqual(A.clave(1,a),A.clave(1,{...a,temporada:2028}));assert.notEqual(A.clave(1,a),A.clave(1,{...a,fecha:'2026-12-11'}));assert.equal(A.clave(1,a),A.clave(1,{...a,importe:200000}));
});
