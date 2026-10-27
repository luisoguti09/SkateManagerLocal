const test=require('node:test'),assert=require('node:assert/strict');
const {validar}=require('../services/antecedentes-fecha');
test('antecedentes: fecha propia, calendario, futuro y roles',()=>{
 const u={rol:'tecnico'},f={certificadoAntecedentes:'nuevo.pdf'};
 for(const fecha of [undefined,'','2026-02-30','2099-01-01'])assert.throws(()=>validar(u,{certificadoAntecedentesFecha:fecha},f),e=>e.status===400);
 assert.throws(()=>validar(u,{},f),e=>e.status===400);
 assert.doesNotThrow(()=>validar(u,{certificadoAntecedentesFecha:'2024-02-29'},f));
 assert.throws(()=>validar({rol:'deportista'},{certificadoAntecedentesFecha:'2024-02-29'},f),e=>e.status===400);
 assert.throws(()=>validar(u,{certificadoAntecedentesFecha:'2024-02-29'}),e=>e.status===400);
 assert.doesNotThrow(()=>validar({...u,certificadoAntecedentes:'anterior.pdf'},{}));
});
