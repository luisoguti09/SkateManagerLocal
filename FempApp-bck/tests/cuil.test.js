'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {normalizarCuil,exigirCuil}=require('../services/cuil');
test('CUIL conserva ceros y normaliza espacios y guiones',()=>{
 assert.equal(normalizarCuil('20-10000002-5'),'20100000025');
 assert.equal(normalizarCuil(' 20 10000002 5 '),'20100000025');
});
test('CUIL rechaza tipos incorrectos, caracteres extra, longitud y dígito inválido',()=>{
 for(const s of [null,undefined,{},20100000025,'20100000024','00000000000','20a100000025','2010000002','201000000255']) {
  assert.equal(normalizarCuil(s),null);assert.throws(()=>exigirCuil(s),e=>e.status===400);
 }
});
