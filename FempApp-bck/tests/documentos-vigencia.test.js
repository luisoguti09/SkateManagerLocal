'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const V=require('../services/documentos-vigencia');
test('plazos calendario: 12 y 24 meses, bisiestos y límite de vencimiento',()=>{
 assert.equal(V.vencer('2024-02-29',12),'2025-02-28');assert.equal(V.vencer('2024-02-29',24),'2026-02-28');
 assert.equal(V.vencer('2026-12-15',12),'2027-12-15');assert.equal(V.vencer('2026-12-15',24),'2028-12-15');
 assert.equal(V.fechaValida('2026-02-29'),false);assert.equal(V.fechaValida('2024-02-29'),true);
 assert.equal(V.hoyArgentina(new Date('2027-01-01T01:00:00Z')),'2026-12-31');
 const u={fichaMedica:'f.pdf',fichaMedicaFecha:'2025-10-24'};
 assert.equal(V.resumen(u,'2026-10-23')[0].estado,'Por vencer');assert.equal(V.resumen(u,'2026-10-24')[0].estado,'Vence hoy');assert.equal(V.resumen(u,'2026-10-25')[0].estado,'Vencido');
 assert.equal(V.resumen({fichaMedica:'f.pdf'},'2026-10-24')[0].estado,'Fecha pendiente');
 assert.equal(V.resumen({},'2026-10-24')[0].estado,'Sin documento');
});
test('archivo nuevo exige fecha propia y rol; no se aceptan fechas futuras',()=>{
 const u={rol:'deportista',fichaMedica:'viejo.pdf',fichaMedicaFecha:'2026-01-01'};
 assert.throws(()=>V.validar(u,{}, {fichaMedica:'nuevo.pdf'},'2026-10-24'),/expedición/);
 assert.throws(()=>V.validar(u,{fichaMedicaFecha:'2026-12-01'}, {},'2026-10-24'),/futura/);
 assert.throws(()=>V.validar({rol:'tecnico'},{wadaFecha:'2026-01-01'},{certificadoWada:'w.pdf'},'2026-10-24'),/deportistas/);
 assert.throws(()=>V.validar({rol:'deportista'},{wadaFecha:'2026-01-01'}, {},'2026-10-24'),/Cargá/);
 V.validar(u,{fichaMedicaFecha:'2026-10-24'},{fichaMedica:'nuevo.pdf'},'2026-10-24');
});
