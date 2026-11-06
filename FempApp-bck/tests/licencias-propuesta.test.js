'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../services/licencias/propuesta');
test('tramos confirmados por fecha nacional y límites inclusivos',()=>{
 for(const fecha of ['2026-11-05','2026-11-24']){const t=P.asignar(P.inicial,fecha);assert.equal(t.importe,115000);assert.equal(t.vencimiento,'2026-12-10');}
 for(const fecha of ['2026-11-25','2026-12-25']){const t=P.asignar(P.inicial,fecha);assert.equal(t.importe,130000);assert.equal(t.vencimiento,'2027-01-10');}
 for(const fecha of ['2026-11-04','2026-12-26','2026-02-30'])assert.throws(()=>P.asignar(P.inicial,fecha));
});
test('acceso provisional requiere aprobación y documentos vigentes; vencimiento inclusivo',()=>{
 const c={aprobada:true,documentacionAprobada:true,vigente:true,solicitud:{vencimiento:'2026-12-10'},pagado:false,hoy:'2026-12-10',provisional:true};
 assert.equal(P.acceso(c),'provisional');assert.equal(P.acceso({...c,hoy:'2026-12-11'}),'pago_requerido');
 assert.equal(P.acceso({...c,documentacionAprobada:false}),'documentacion_pendiente');assert.equal(P.acceso({...c,vigente:false}),'documentacion_pendiente');
 assert.equal(P.acceso({...c,pagado:true,hoy:'2026-12-11'}),'habilitada');
});
test('diferencia queda separada; una rebaja requiere revisión',()=>{
 assert.deepEqual(P.ajuste(11500000,13000000),{diferenciaCentavos:1500000,requiereRevision:false});
 assert.equal(P.ajuste(13000000,11500000).requiereRevision,true);
});
test('rechaza tramos solapados, fechas imposibles e importes inválidos',()=>{
 for(const cambios of [{desde:'2026-11-24'},{vencimiento:'2026-12-01'},{importe:-1},{hasta:'2026-02-30'}]){
 const c=structuredClone(P.inicial);Object.assign(c.tramos[1],cambios);assert.throws(()=>P.validar(c));}
});

test('descuento de propuesta: límites inclusivos, centavos y base persistente',()=>{
 const c=structuredClone(P.inicial);c.tramos[0].descuento={activo:true,porcentaje:10,desde:'2026-11-05',hasta:'2026-11-20'};
 for(const dia of ['2026-11-05','2026-11-20'])assert.equal(P.cotizar(c,'2026-11-05',dia).totalCentavos,10350000);
 assert.equal(P.cotizar(c,'2026-11-05','2026-11-21').totalCentavos,11500000);
 assert.equal(c.tramos[0].importe,115000);
 for(const porcentaje of [0,100,-5,2.5,'10'])assert.throws(()=>P.validar({...c,tramos:[{...c.tramos[0],descuento:{...c.tramos[0].descuento,porcentaje}}]}));
});
test('avisos no cambian importes ni fechas y persisten después del vencimiento',()=>{
 const c=structuredClone(P.inicial),antes=JSON.stringify(c);
 assert.ok(P.alertas(c,'2026-12-11').some(a=>a.tramo===1&&a.tipo==='pago'&&a.estado==='vencido'));
 assert.ok(P.alertas(c,'2026-12-10').some(a=>a.tramo===1&&a.tipo==='pago'&&a.estado==='vence_hoy'));
 assert.equal(JSON.stringify(c),antes);assert.equal(P.validar(c).tramos[0].importe,115000);
 assert.throws(()=>P.validar({...c,avisoDias:-1}));
});
test('temporadas y nombres de periodo persisten sin alterar la base anterior',()=>{
 const nueva=P.validar({...structuredClone(P.inicial),temporada:2028,tramos:[{nombre:'Promocional 2028',desde:'2027-11-01',hasta:'2027-12-01',vencimiento:'2028-01-01',importe:150000}]});
 assert.equal(nueva.temporada,2028);assert.equal(nueva.tramos[0].nombre,'Promocional 2028');assert.equal(P.inicial.temporada,2027);
 for(const temporada of [2019,2101,'2028',2027.5])assert.throws(()=>P.validar({...P.inicial,temporada}));
 assert.throws(()=>P.validar({...P.inicial,tramos:[{...P.inicial.tramos[0],nombre:' '}]}));
});
