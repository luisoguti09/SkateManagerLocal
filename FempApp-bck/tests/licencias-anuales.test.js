'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../services/licencias/anuales');
function fixture(){
 const tables={Licencia:[],Intento:[],Operacion:[],Historial:[]};let tail=Promise.resolve();
 function model(name){return{async findByPk(id){return tables[name].find(x=>String(x[name==='Operacion'?'paymentId':'id'])===String(id));},async findOne(o){return(await this.findAll(o))[0];},async findAll(o={}){return tables[name].filter(x=>Object.entries(o.where||{}).every(([k,v])=>v&&typeof v==='object'?Object.getOwnPropertySymbols(v).every(op=>Array.isArray(v[op])&&v[op].includes(x[k])):x[k]===v));},async create(data){const row={id:tables[name].length+1,...data,toJSON(){const {toJSON,update,...d}=this;return structuredClone(d);},async update(d){Object.assign(this,d);return this;}};tables[name].push(row);return row;}};}
 const m=Object.fromEntries(Object.keys(tables).map(n=>[n,model(n)]));
 m.Licencia.sequelize={transaction:async fn=>{const old=tail;let release;tail=new Promise(r=>release=r);await old;const snapshot=Object.fromEntries(Object.keys(tables).map(n=>[n,tables[n].map(x=>x.toJSON())]));try{return await fn({LOCK:{UPDATE:'UPDATE'}});}catch(e){for(const n of Object.keys(tables)){tables[n]=[];for(const d of snapshot[n])await m[n].create(d);}throw e;}finally{release();}}};
 const u={id:1,rol:'deportista',estado:'aprobado',aprobado:true,documentacionAprobada:true,sessionVersion:0,fichaMedica:'medical',fichaMedicaFecha:'2026-10-01',certificadoWada:'wada',wadaFecha:'2026-10-01'};
 let benefit=null,called=0,providerFail=false,payments=[];
 const cfg={revision:1,datos:{temporada:2027,criterio:'solicitud_nacional',accesoProvisional:true,tramos:[{desde:'2026-11-01',hasta:'2026-12-31',importe:130000,vencimiento:'2027-01-10'}]}};
 const env={MP_LICENCIAS_ENABLED:'true',MP_LICENCIAS_PILOTO_USUARIO_ID:'1'};
 const provider={renovar:async()=>{},verificar:async()=>({connected:true}),config:()=>({collectorId:'1847379019',liveMode:true}),async crear(){called++;if(providerFail)throw Error('timeout');return{id:'pref',url:'https://www.mercadopago.com.ar/checkout/test'};},async buscar(){return payments;},async pago(id){return payments.find(p=>String(p.id)===id);}};
 let time=Date.parse('2026-11-14T15:00:00-03:00');
 const service=A.service({...m,Usuario:{findByPk:async id=>id===1?u:null},Config:{findByPk:async()=>cfg},Beca:{findOne:async()=>benefit},provider,env,now:()=>time});
 const assign=()=>service.asignar({usuarioId:1,temporada:2027,fechaNacional:'2026-11-10',revision:0,motivo:'Verificado en padrón nacional'},99);
 const payment=(extra={})=>({id:100,external_reference:tables.Intento[0].id,collector_id:1847379019,live_mode:true,currency_id:'ARS',transaction_amount:tables.Intento[0].cotizacion.totalCentavos/100,transaction_amount_refunded:0,status:'approved',date_last_updated:'2026-11-14T18:10:00Z',date_approved:'2026-11-14T18:10:00Z',...extra});
 return{service,m,tables,u,env,cfg,assign,payment,provider,get calls(){return called;},set benefit(b){benefit=b;},set fail(b){providerFail=b;},set payments(p){payments=p;},set time(t){time=t;}};
}
test('licencia anual: solicitud idempotente, fecha solo verificada, precio del servidor, doble clic y webhook',async()=>{
 const f=fixture();await f.service.solicitar(1,2027);await f.service.solicitar(1,2027);assert.equal(f.tables.Licencia.length,1);
 await assert.rejects(()=>f.service.checkout(1,2027),e=>e.status===409);await f.assign();
 const results=await Promise.allSettled([f.service.checkout(1,2027),f.service.checkout(1,2027)]);assert.ok(results.some(r=>r.status==='fulfilled'));assert.equal(f.calls,1);assert.equal(f.tables.Intento.length,1);assert.equal(f.tables.Intento[0].cotizacion.totalCentavos,13000000);
 await f.service.conciliar(f.payment(),true);await f.service.conciliar(f.payment(),true);assert.equal(f.tables.Operacion.length,1);assert.equal(f.tables.Operacion[0].webhook,true);assert.equal((await f.service.detalle(1,2027)).habilitada,true);
 await assert.rejects(()=>f.service.checkout(1,2027),e=>e.status===409);assert.equal(f.calls,1);
});
test('100% de licencia no crea intento ni pago; beneficio de inscripciones no descuenta la licencia',async()=>{
 const f=fixture();f.benefit={id:1,usuarioId:1,temporada:2027,porcentaje:100,porcentajeInscripciones:0,activa:true,alcance:'licencia_anual',revision:1};await f.assign();assert.equal((await f.service.checkout(1,2027)).exenta,true);assert.equal(f.calls,0);assert.equal(f.tables.Intento.length,0);assert.equal(f.tables.Operacion.length,0);assert.equal((await f.service.detalle(1,2027)).habilitada,true);
 f.benefit=null;assert.equal((await f.service.detalle(1,2027)).habilitada,false);
 const other=fixture();other.benefit={id:2,usuarioId:1,temporada:2027,porcentaje:0,porcentajeInscripciones:100,todosEventos:true,activa:true,alcance:'licencia_anual'};await other.assign();await other.service.checkout(1,2027);assert.equal(other.tables.Intento[0].cotizacion.totalCentavos,13000000);
});
test('beca parcial y promoción se calculan antes de MP; el intento conserva el importe',async()=>{
 const f=fixture();f.cfg.datos.tramos[0].descuento={activo:true,porcentaje:10,desde:'2026-11-01',hasta:'2026-12-01'};f.benefit={id:1,usuarioId:1,temporada:2027,porcentaje:50,activa:true,alcance:'licencia_anual',revision:1};await f.assign();await f.service.checkout(1,2027);assert.equal(f.tables.Intento[0].cotizacion.totalCentavos,5850000);
 f.cfg.datos.tramos[0].importe=200000;await f.service.checkout(1,2027);assert.equal(f.calls,1);assert.equal(f.tables.Intento[0].cotizacion.totalCentavos,5850000);
});
test('cuenta/documentos vencidos, piloto y llave de cobro bloquean antes de crear',async()=>{
 const f=fixture();await f.assign();for(const change of [{documentacionAprobada:false},{estado:'bloqueado'},{fichaMedicaFecha:'2024-01-01'},{wadaFecha:null}]){const orig={...f.u};Object.assign(f.u,change);await assert.rejects(()=>f.service.checkout(1,2027));Object.assign(f.u,orig);}
 f.env.MP_LICENCIAS_ENABLED='false';await assert.rejects(()=>f.service.checkout(1,2027));f.env.MP_LICENCIAS_ENABLED='true';f.env.MP_LICENCIAS_PILOTO_USUARIO_ID='2';await assert.rejects(()=>f.service.checkout(1,2027));assert.equal(f.calls,0);assert.equal(f.tables.Intento.length,0);
});
test('timeout conserva reserva: reintentar no genera un segundo checkout',async()=>{
 const f=fixture();await f.assign();f.fail=true;await assert.rejects(()=>f.service.checkout(1,2027));f.fail=false;await assert.rejects(()=>f.service.checkout(1,2027));assert.equal(f.calls,1);assert.equal(f.tables.Intento.length,1);
});
test('receptor, monto, moneda, ambiente y dueño incorrectos no acreditan; refund y duplicado bloquean',async()=>{
 const f=fixture();await f.assign();await f.service.checkout(1,2027);
 for(const change of [{collector_id:2},{currency_id:'USD'},{transaction_amount:1},{live_mode:false}])await assert.rejects(()=>f.service.conciliar(f.payment(change),true));
 await assert.rejects(()=>f.service.conciliar(f.payment(),false,2),e=>e.status===403);assert.equal(f.tables.Operacion.length,0);
 await f.service.conciliar(f.payment(),true);await f.service.conciliar(f.payment({date_last_updated:'2026-11-14T18:11:00Z',status:'refunded',transaction_amount_refunded:130000}),true);assert.equal((await f.service.detalle(1,2027)).habilitada,false);
 await f.service.conciliar(f.payment(),true);assert.equal(f.tables.Licencia[0].estado,'requiere_revision');
 const g=fixture();await g.assign();await g.service.checkout(1,2027);await g.service.conciliar(g.payment(),true);await g.service.conciliar(g.payment({id:101}),true);assert.equal(g.tables.Licencia[0].estado,'pago_duplicado');assert.equal((await g.service.detalle(1,2027)).habilitada,false);
});
test('fecha con revisión, temporada y auditoría fallida no deja mutaciones parciales',async()=>{
 const f=fixture();await f.assign();await assert.rejects(()=>f.assign(),e=>e.status===409);assert.equal((await f.service.detalle(1,2028)).licencia,null);
 f.m.Historial.create=async()=>{throw Error('audit down');};await assert.rejects(()=>f.service.checkout(1,2027));assert.equal(f.tables.Intento.length,0);assert.equal(f.tables.Licencia[0].estado,'solicitada');assert.equal(f.calls,0);
});

module.exports={fixture};

test('checkout vencido se renueva con la misma preferencia solo si no hay pago y el importe sigue vigente',async()=>{
 const f=fixture();await f.assign();await f.service.checkout(1,2027);const id=f.tables.Intento[0].id;f.time=Date.parse('2026-11-14T17:00:00-03:00');let renews=0;f.provider.renovar=async()=>renews++;
 await f.service.checkout(1,2027);assert.equal(renews,1);assert.equal(f.calls,1);assert.equal(f.tables.Intento[0].id,id);
 f.time=Date.parse('2026-11-14T19:00:00-03:00');f.cfg.datos.tramos[0].importe=150000;await assert.rejects(()=>f.service.checkout(1,2027),e=>e.status===409);assert.equal(renews,1);
});
