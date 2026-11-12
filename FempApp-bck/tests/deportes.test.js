'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../services/deportes');
test('Freestyle: cuatro categorías nacionales y dos disciplinas; rechaza mezcla con Artístico',()=>{
 for(const disciplina of D.disciplinas)for(const categoria of D.categorias){
  const p={deporte:D.FREESTYLE,disciplina,categoria,temporada:'2026',origenCategoria:'CAP'};
  assert.equal(D.validar(p),D.FREESTYLE);
  for(const cambio of [{disciplina:'Libre'},{categoria:'Senior Femenino'},{divisional:'Sub Divisional A'},{modalidad:'Individual'},{licencia:'Nacional'},{origenCategoria:'PROMOS_FEMPA'},{temporada:1999}])assert.throws(()=>D.validar({...p,...cambio}),e=>e.status===400);
 }
 assert.throws(()=>D.validar({deporte:D.ARTISTICO,disciplina:'STREET'}));assert.equal(D.validar({disciplina:'Libre'}),D.ARTISTICO);
});
test('Migración: diagnóstico sin escribir, respaldo obligatorio, repetición conserva Freestyle',async()=>{
 const {migrar}=require('../scripts/migrar-deportes');const cols=new Set();let writes=0,backfills=0;
 const c={query:async(sql,args)=>{
  if(sql.startsWith('SHOW'))return [cols.has(sql.includes('`Usuarios`')?'Usuarios':'perfiles_deportivos')?[{Type:'varchar(80)'}]:[]];
  writes++;
  if(sql.startsWith('ALTER'))cols.add(sql.includes('`Usuarios`')?'Usuarios':'perfiles_deportivos');
  if(sql.startsWith('UPDATE')){assert.match(sql,/deporte IS NULL/);assert.equal(args[0],D.ARTISTICO);backfills++;return [{affectedRows:backfills<=2?3:0}];}
  return [{}];
 },beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{}};
 await migrar(c);assert.equal(writes,0);await assert.rejects(()=>migrar(c,true,false));assert.equal(writes,0);
 await migrar(c,true,true);assert.equal(cols.size,2);await migrar(c,true,true);assert.equal(writes,6);
});
