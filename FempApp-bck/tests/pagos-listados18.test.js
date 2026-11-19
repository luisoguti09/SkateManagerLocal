'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{Op}=require('sequelize');
const {motivoCierre,permisoCobro}=require('../services/licencias/anuales');
const {filtrarEtapa}=require('../services/cuenta-listado');
test('habilitación distingue piloto, temporada y cierre; quitar piloto abre a todas las cuentas',()=>{
 const env={MP_LICENCIAS_ENABLED:'true',MP_LICENCIAS_TEMPORADA:'2027',MP_LICENCIAS_PILOTO_USUARIO_ID:'72'};
 assert.equal(motivoCierre(env,73,2027),'piloto');assert.equal(motivoCierre(env,72,2027),null);assert.throws(()=>permisoCobro(env,73,2027));
 delete env.MP_LICENCIAS_PILOTO_USUARIO_ID;assert.equal(motivoCierre(env,73,2027),null);permisoCobro(env,73,2027);
 assert.equal(motivoCierre(env,73,2026),'temporada');env.MP_LICENCIAS_ENABLED='false';assert.equal(motivoCierre(env,73,2027),'cerrado');
 env.MP_LICENCIAS_ENABLED=' true ';env.MP_LICENCIAS_PILOTO_USUARIO_ID=' 72 ';assert.equal(motivoCierre(env,72,2027),null);permisoCobro(env,72,2027);assert.throws(()=>permisoCobro(env,73,2027));
});
test('listado filtra antes de paginar: pendientes enviados y por completar disjuntos',async()=>{
 const h={findAll:async q=>{assert.deepEqual(q.where.accion[Op.in],['enviado','reenviado']);return[{usuarioId:2},{usuarioId:4}];}};
 const enviados=await filtrarEtapa({club:'UTN'},'en_revision',h),sin=await filtrarEtapa({},'por_completar',h);
 assert.deepEqual(enviados.id[Op.in],[2,4]);assert.deepEqual(sin.id[Op.notIn],[2,4]);assert.equal(enviados.estado,'pendiente');assert.equal(sin.estado,'pendiente');assert.equal(enviados.club,'UTN');
});
test('sin envíos, revisión queda vacía y por completar no excluye IDs; todos conserva filtro',async()=>{
 const h={findAll:async()=>[]};assert.deepEqual((await filtrarEtapa({},'en_revision',h)).id[Op.in],[]);assert.deepEqual((await filtrarEtapa({},'por_completar',h)).id[Op.notIn],[]);
 const w={estado:'aprobado'};assert.equal(await filtrarEtapa(w,'',h),w);assert.equal(w.estado,'aprobado');await assert.rejects(()=>filtrarEtapa({},'inventado',h),e=>e.status===400);
});
